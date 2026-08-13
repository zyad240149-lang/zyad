import { supabase } from '../supabaseClient.js';

export async function listBranches() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('branches').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listServices() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('services').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function addService({ name, durationMinutes, price, icon }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('services')
    .insert({ name, duration_minutes: durationMinutes, price, icon })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateService(id, { name, durationMinutes, price }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('services')
    .update({ name, duration_minutes: durationMinutes, price })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listDoctors() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('doctors')
    .select('*, branch:branches(name), periods:doctor_periods(id, days, start_time, end_time)')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listCustomers() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone')
    .eq('role', 'customer')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/** Full customer directory with join date, for the admin العملاء tab. */
export async function listCustomersDetailed() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone, email, status, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Admin edit of any customer field — RLS already allows staff to update any profile. */
export async function updateCustomer(id, { name, phone, email, status }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('profiles')
    .update({ name, phone, email, status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addBranch({ name, address, hours }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('branches')
    .insert({ name, address, hours })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addDoctorPeriod({ doctorId, branchId, days, startTime, endTime }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('doctor_periods')
    .insert({ doctor_id: doctorId, branch_id: branchId, days, start_time: startTime, end_time: endTime })
    .select()
    .single();
  if (error) throw error;
  return data;
}
