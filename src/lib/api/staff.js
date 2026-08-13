import { supabase } from '../supabaseClient.js';

export async function listStaff() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role, status, branch:branches(name)')
    .neq('role', 'customer')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(s => ({ ...s, branch: s.branch?.name ?? '' }));
}

export async function setStaffStatus(id, status) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.from('profiles').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function listRolesWithPermissions() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('roles')
    .select('id, name, color, permissions:role_permissions(module, level)');
  if (error) throw error;
  return (data ?? []).map(r => ({
    ...r,
    permissions: Object.fromEntries(r.permissions.map(p => [p.module, p.level])),
  }));
}

export async function setRolePermission(roleId, module, level) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase
    .from('role_permissions')
    .upsert({ role_id: roleId, module, level }, { onConflict: 'role_id,module' });
  if (error) throw error;
}

/** Adds a new permission row across every role — full for owner, none for everyone else. */
export async function addPermissionModule(module) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data: roles, error: rolesError } = await supabase.from('roles').select('id');
  if (rolesError) throw rolesError;
  const rows = roles.map(r => ({ role_id: r.id, module, level: r.id === 'owner' ? 'full' : 'none' }));
  const { error } = await supabase.from('role_permissions').upsert(rows, { onConflict: 'role_id,module' });
  if (error) throw error;
}

/** Removes a permission across every role. */
export async function deletePermissionModule(module) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('role_permissions').delete().eq('module', module);
  if (error) throw error;
}

const ROLE_COLORS = ['var(--blue-600)', 'var(--green-600)', 'var(--amber-600)', 'var(--red-600)', 'var(--gray-600)', 'var(--teal-600)'];

/** Adds a new custom role (e.g. "سكرتيرة") — starts with every existing permission set to 'none'. */
export async function addRole(name) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const id = 'role_' + Date.now().toString(36);
  const { count } = await supabase.from('roles').select('id', { count: 'exact', head: true });
  const color = ROLE_COLORS[(count ?? 0) % ROLE_COLORS.length];
  const { error: roleError } = await supabase.from('roles').insert({ id, name, color });
  if (roleError) throw roleError;
  const { data: existing, error: modulesError } = await supabase.from('role_permissions').select('module');
  if (modulesError) throw modulesError;
  const modules = [...new Set((existing ?? []).map(r => r.module))];
  if (modules.length) {
    const rows = modules.map(module => ({ role_id: id, module, level: 'none' }));
    const { error } = await supabase.from('role_permissions').upsert(rows, { onConflict: 'role_id,module' });
    if (error) throw error;
  }
  return { id, name, color, permissions: Object.fromEntries(modules.map(m => [m, 'none'])) };
}

/** Deletes a role — its role_permissions rows cascade with it. Any staff still assigned this role keep the raw role id/name on their profile (harmless — RoleBadge falls back to showing it verbatim). */
export async function deleteRole(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) throw error;
}
