import { supabase } from '../supabaseClient.js';

// إدارة المخزون.
//
// Reads go straight to the tables (RLS gates them on the inventory_view module);
// every *quantity* change goes through the record_inventory_movement RPC, which is
// the only path that can move stock — it locks the row, refuses to go below zero,
// and writes the ledger entry with the acting user. See 0004_… migration.

const PRODUCT_SELECT = 'id, name, category, unit, quantity, min_quantity, status, expiry_date, purchase_price, supplier, notes, branch_id, active, created_at, updated_at, branch:branches(name)';

/** كم يوماً قبل تاريخ الانتهاء يبدأ التنبيه. */
export const EXPIRY_SOON_DAYS = 30;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Date `n` days from today, as YYYY-MM-DD — the boundary the expiry filters use. */
function isoInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * 'expired' منتهية | 'soon' تقترب | 'ok' سليمة | null بلا تاريخ انتهاء.
 * Computed here rather than in SQL: it depends on today's date, so it can't be a
 * generated column, and every screen that shows a product needs the same answer.
 */
export function expiryState(expiryDate) {
  if (!expiryDate) return null;
  const today = todayISO();
  if (expiryDate <= today) return 'expired';
  return expiryDate <= isoInDays(EXPIRY_SOON_DAYS) ? 'soon' : 'ok';
}

export const EXPIRY_LABEL = { expired: 'منتهية الصلاحية', soon: 'تقترب من الانتهاء', ok: 'صالحة' };
export const EXPIRY_TONE = {
  expired: { color: 'var(--red-600)', bg: 'var(--red-50)' },
  soon: { color: 'var(--amber-700)', bg: 'var(--accent-subtle)' },
  ok: { color: 'var(--green-600)', bg: 'var(--green-50)' },
};

/** Whole days from today until expiry — negative once it has passed. */
export function daysUntil(expiryDate) {
  if (!expiryDate) return null;
  const ms = new Date(`${expiryDate}T00:00:00`) - new Date(`${todayISO()}T00:00:00`);
  return Math.round(ms / 86400000);
}

function mapProduct(row) {
  return {
    ...row,
    quantity: Number(row.quantity ?? 0),
    min_quantity: Number(row.min_quantity ?? 0),
    purchase_price: row.purchase_price == null ? null : Number(row.purchase_price),
    branchName: row.branch?.name ?? null,
    expiryState: expiryState(row.expiry_date),
  };
}

export const UNITS = ['قطعة', 'علبة', 'زجاجة', 'شريط', 'كيس', 'أنبوبة', 'زوج'];

export const STATUS_LABEL = { ok: 'متوفر', low: 'منخفض', out: 'نافد' };
export const STATUS_TONE = {
  ok: { color: 'var(--green-600)', bg: 'var(--green-50)' },
  low: { color: 'var(--amber-700)', bg: 'var(--accent-subtle)' },
  out: { color: 'var(--red-600)', bg: 'var(--red-50)' },
};

export const MOVEMENT_LABEL = { add: 'إضافة', use: 'استخدام', adjust: 'تعديل' };

/**
 * Paged product list.
 *   status   — the stored generated column ('ok' | 'low' | 'out'), plus 'alert'
 *              for anything at or below its minimum.
 *   expiry   — 'expired' منتهية | 'soon' تنتهي خلال 30 يوماً | 'any' لها تاريخ انتهاء.
 *              Filtered on the date rather than a stored flag, because "قريباً"
 *              moves with today's date.
 */
export async function listProducts({ search = '', status = 'all', expiry = 'all', category = '', branchId = null, includeArchived = false, page = 0, pageSize = 20 } = {}) {
  if (!supabase) return { rows: [], total: 0 };
  let q = supabase.from('inventory_products').select(PRODUCT_SELECT, { count: 'exact' });

  if (!includeArchived) q = q.eq('active', true);
  if (branchId) q = q.eq('branch_id', branchId);
  if (category) q = q.eq('category', category);
  if (status === 'alert') q = q.in('status', ['low', 'out']);
  else if (status !== 'all') q = q.eq('status', status);

  if (expiry === 'expired') q = q.not('expiry_date', 'is', null).lte('expiry_date', todayISO());
  else if (expiry === 'soon') q = q.gt('expiry_date', todayISO()).lte('expiry_date', isoInDays(EXPIRY_SOON_DAYS));
  else if (expiry === 'any') q = q.not('expiry_date', 'is', null);

  const term = search.trim();
  if (term) {
    const safe = term.replace(/[%,()]/g, ' ');
    q = q.or(`name.ilike.%${safe}%,category.ilike.%${safe}%,supplier.ilike.%${safe}%`);
  }

  const from = page * pageSize;
  const { data, error, count } = await q
    .order('name', { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []).map(mapProduct), total: count ?? 0 };
}

/**
 * Dashboard tiles, in one round trip: counts per status, the total number of units
 * on the shelf, what they cost, and how many items are expiring.
 */
export async function inventorySummary({ branchId = null } = {}) {
  const empty = { total: 0, ok: 0, low: 0, out: 0, totalQuantity: 0, totalValue: 0, expiringSoon: 0, expired: 0 };
  if (!supabase) return empty;
  let q = supabase.from('inventory_products').select('status, quantity, purchase_price, expiry_date').eq('active', true);
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const states = rows.map(r => expiryState(r.expiry_date));
  return {
    total: rows.length,
    ok: rows.filter(r => r.status === 'ok').length,
    low: rows.filter(r => r.status === 'low').length,
    out: rows.filter(r => r.status === 'out').length,
    totalQuantity: rows.reduce((sum, r) => sum + Number(r.quantity ?? 0), 0),
    // Only priced items contribute — an unpriced one shouldn't read as free.
    totalValue: rows.reduce((sum, r) => sum + Number(r.quantity ?? 0) * Number(r.purchase_price ?? 0), 0),
    expiringSoon: states.filter(s => s === 'soon').length,
    expired: states.filter(s => s === 'expired').length,
  };
}

/** Items already expired or expiring within EXPIRY_SOON_DAYS — the ⏳ alert list. */
export async function listExpiring({ branchId = null, limit = 50 } = {}) {
  if (!supabase) return [];
  let q = supabase.from('inventory_products').select(PRODUCT_SELECT)
    .eq('active', true)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', isoInDays(EXPIRY_SOON_DAYS));
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q.order('expiry_date', { ascending: true }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

/** Products at or below their minimum — drives the ⚠️ alert list. */
export async function listLowStock({ branchId = null, limit = 50 } = {}) {
  if (!supabase) return [];
  let q = supabase.from('inventory_products').select(PRODUCT_SELECT)
    .eq('active', true)
    .in('status', ['low', 'out']);
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q.order('quantity', { ascending: true }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

/** Distinct categories already in use, for the datalist on the add/edit form. */
export async function listCategories() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('inventory_products').select('category').not('category', 'is', null).limit(500);
  if (error) throw error;
  return [...new Set((data ?? []).map(r => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
}

export async function getProduct(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.from('inventory_products').select(PRODUCT_SELECT).eq('id', id).single();
  if (error) throw error;
  return mapProduct(data);
}

/**
 * Creates the product, then — if it starts with stock — books that opening balance
 * as an 'add' movement so the ledger explains every unit on the shelf.
 */
export async function addProduct({ name, category, unit, quantity = 0, minQuantity = 0, notes, branchId, expiryDate, purchasePrice, supplier }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('inventory_products')
    .insert({
      name, category: category || null, unit: unit || 'قطعة',
      quantity: 0, min_quantity: Number(minQuantity) || 0,
      notes: notes || null, branch_id: branchId || null,
      expiry_date: expiryDate || null,
      // '' from an untouched number input must land as NULL, not 0 — an unpriced
      // item is "we don't know", which is different from "it was free".
      purchase_price: purchasePrice === '' || purchasePrice == null ? null : Number(purchasePrice),
      supplier: supplier || null,
    })
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw error;

  const opening = Number(quantity) || 0;
  if (opening > 0) {
    await recordMovement({ productId: data.id, type: 'add', quantity: opening, notes: 'رصيد افتتاحي عند إضافة المنتج' });
    return getProduct(data.id);
  }
  return mapProduct(data);
}

/** Edits the product's details. Quantity is deliberately not editable here — a DB
 *  trigger rejects it — so stock can only move through a logged movement. */
export async function updateProduct(id, { name, category, unit, minQuantity, notes, branchId, active, expiryDate, purchasePrice, supplier }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (category !== undefined) patch.category = category || null;
  if (unit !== undefined) patch.unit = unit;
  if (minQuantity !== undefined) patch.min_quantity = Number(minQuantity) || 0;
  if (notes !== undefined) patch.notes = notes || null;
  if (branchId !== undefined) patch.branch_id = branchId || null;
  if (active !== undefined) patch.active = active;
  if (expiryDate !== undefined) patch.expiry_date = expiryDate || null;
  if (purchasePrice !== undefined) patch.purchase_price = purchasePrice === '' || purchasePrice == null ? null : Number(purchasePrice);
  if (supplier !== undefined) patch.supplier = supplier || null;

  const { data, error } = await supabase.from('inventory_products').update(patch).eq('id', id).select(PRODUCT_SELECT).single();
  if (error) throw error;
  return mapProduct(data);
}

/** Hides the product without touching its history — the safe default for "حذف". */
export function archiveProduct(id) {
  return updateProduct(id, { active: false });
}

export function restoreProduct(id) {
  return updateProduct(id, { active: true });
}

/** Permanent delete. Cascades to the product's movement history, so the UI asks twice. */
export async function deleteProduct(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('inventory_products').delete().eq('id', id);
  if (error) throw error;
}

/**
 * The single entry point for stock changes.
 *   type 'add'    — quantity is how much arrived
 *   type 'use'    — quantity is how much was consumed
 *   type 'adjust' — quantity is the new absolute count (stock-take correction)
 * Throws with the server's Arabic message when the result would go below zero.
 */
export async function recordMovement({ productId, type, quantity, notes, visitId, appointmentId }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.rpc('record_inventory_movement', {
    p_product_id: productId,
    p_type: type,
    p_quantity: Number(quantity),
    p_notes: notes || null,
    p_visit_id: visitId || null,
    p_appointment_id: appointmentId || null,
  });
  if (error) throw new Error(error.message || 'تعذّر تسجيل حركة المخزون.');
  return data;
}

/**
 * Deducts several supplies in one transaction (used when closing an encounter).
 * If any line is short, nothing at all is deducted.
 * items: [{ productId, quantity }]
 */
export async function recordUsage({ items, visitId, appointmentId, notes }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const payload = items
    .filter(i => i.productId && Number(i.quantity) > 0)
    .map(i => ({ product_id: i.productId, quantity: Number(i.quantity) }));
  if (!payload.length) return 0;

  const { data, error } = await supabase.rpc('record_inventory_usage', {
    p_items: payload,
    p_visit_id: visitId || null,
    p_appointment_id: appointmentId || null,
    p_notes: notes || null,
  });
  if (error) throw new Error(error.message || 'تعذّر خصم المستلزمات من المخزون.');
  return data ?? 0;
}

const TX_SELECT = 'id, product_id, type, quantity_before, quantity_change, quantity_after, user_id, user_name, notes, visit_id, appointment_id, created_at, product:inventory_products(name, unit)';

function mapTx(row) {
  return {
    ...row,
    quantity_before: Number(row.quantity_before ?? 0),
    quantity_change: Number(row.quantity_change ?? 0),
    quantity_after: Number(row.quantity_after ?? 0),
    productName: row.product?.name ?? '—',
    unit: row.product?.unit ?? '',
  };
}

/** Movement history — for one product (productId) or clinic-wide (آخر الحركات). */
export async function listTransactions({ productId = null, type = 'all', page = 0, pageSize = 20 } = {}) {
  if (!supabase) return { rows: [], total: 0 };
  let q = supabase.from('inventory_transactions').select(TX_SELECT, { count: 'exact' });
  if (productId) q = q.eq('product_id', productId);
  if (type !== 'all') q = q.eq('type', type);
  const from = page * pageSize;
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []).map(mapTx), total: count ?? 0 };
}

/** Lightweight picker list for the "مستلزمات مستخدمة" section of an encounter. */
export async function listProductsForPicker({ branchId = null } = {}) {
  if (!supabase) return [];
  let q = supabase.from('inventory_products').select('id, name, unit, quantity, min_quantity, status, branch_id').eq('active', true);
  const { data, error } = await q.order('name');
  if (error) throw error;
  const rows = (data ?? []).map(r => ({ ...r, quantity: Number(r.quantity ?? 0) }));
  // Branch-scoped products first when a branch is in play, clinic-wide ones always shown.
  if (!branchId) return rows;
  return rows.filter(r => !r.branch_id || r.branch_id === branchId);
}
