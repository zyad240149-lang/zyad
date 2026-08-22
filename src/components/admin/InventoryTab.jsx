// ميعاد — إدارة المخزون.
//
// Dashboard tiles → low-stock alerts → product table → per-product movement history.
// Every quantity change goes through recordMovement(), never a direct write, so the
// ledger and the on-hand count can't drift apart.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { listBranches } from '../../lib/api/reference.js';
import {
  listProducts, inventorySummary, listLowStock, listExpiring, listCategories, listTransactions,
  addProduct, updateProduct, archiveProduct, restoreProduct, deleteProduct, recordMovement,
  UNITS, STATUS_LABEL, STATUS_TONE, MOVEMENT_LABEL,
  EXPIRY_LABEL, EXPIRY_TONE, EXPIRY_SOON_DAYS, daysUntil,
} from '../../lib/api/inventory.js';
import {
  ds, font, Card2, Ring2, SectionTitle, Btn, IconBtn, Loading, ErrorNote, EmptyState,
  ModalShell, ConfirmBox, Pager, SearchBox, FilterChips, TextArea, DateInput,
  fmtQty, fmtDate, fmtDateTime,
} from './ui.jsx';

const { Icon, Field, Select, Input, Alert } = ds;

const PAGE_SIZE = 15;

const STATUS_FILTERS = [
  ['all', 'الكل'],
  ['alert', 'يحتاج انتباه'],
  ['low', 'منخفض'],
  ['out', 'نافد'],
  ['ok', 'متوفر'],
];

// Expiry is a second, independent axis: a product can be well-stocked *and* expired.
const EXPIRY_FILTERS = [
  ['all', 'كل الصلاحيات'],
  ['soon', 'تقترب من الانتهاء'],
  ['expired', 'منتهية الصلاحية'],
];

function StatusPillLocal({ status }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.ok;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: tone.color, background: tone.bg, padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone.color }} />
      {STATUS_LABEL[status] ?? '—'}
    </span>
  );
}

/** The expiry cell: the date, plus a coloured pill once it needs attention. */
function ExpiryCell({ product }) {
  if (!product.expiry_date) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const state = product.expiryState;
  const days = daysUntil(product.expiry_date);
  const tone = EXPIRY_TONE[state] ?? EXPIRY_TONE.ok;
  return (
    <div style={{ whiteSpace: 'nowrap' }}>
      <div style={{ color: 'var(--text-body)' }}>{fmtDate(product.expiry_date)}</div>
      {state !== 'ok' && (
        <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, color: tone.color, background: tone.bg, padding: '3px 9px', borderRadius: 999 }}>
          {state === 'expired'
            ? (days === 0 ? 'تنتهي اليوم' : `منتهية منذ ${Math.abs(days)} يوم`)
            : `باقٍ ${days} يوم`}
        </span>
      )}
    </div>
  );
}

// ---------- add / edit product ----------
function ProductModal({ product, branches, categories, onClose, onSaved }) {
  const editing = !!product;
  const initialUnit = product?.unit ?? 'قطعة';
  const knownUnit = UNITS.includes(initialUnit);
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  // A unit outside the preset list is carried in customUnit, with the select
  // parked on '__other' — otherwise editing the free-text box wouldn't take.
  const [unit, setUnit] = useState(knownUnit ? initialUnit : '__other');
  const [customUnit, setCustomUnit] = useState(knownUnit ? '' : initialUnit);
  const [quantity, setQuantity] = useState(editing ? String(product.quantity) : '');
  const [minQuantity, setMinQuantity] = useState(editing ? String(product.min_quantity) : '');
  const [branchId, setBranchId] = useState(product?.branch_id ?? '');
  const [expiryDate, setExpiryDate] = useState(product?.expiry_date ?? '');
  const [purchasePrice, setPurchasePrice] = useState(product?.purchase_price == null ? '' : String(product.purchase_price));
  const [supplier, setSupplier] = useState(product?.supplier ?? '');
  const [notes, setNotes] = useState(product?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resolvedUnit = unit === '__other' ? customUnit.trim() : unit;
  const valid = name.trim() && resolvedUnit && Number(minQuantity || 0) >= 0 && (editing || Number(quantity || 0) >= 0);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const saved = await updateProduct(product.id, {
          name: name.trim(), category: category.trim(), unit: resolvedUnit,
          minQuantity: minQuantity === '' ? 0 : Number(minQuantity),
          notes: notes.trim(), branchId: branchId || null,
          expiryDate: expiryDate || null, purchasePrice, supplier: supplier.trim(),
        });
        onSaved(saved, 'تم حفظ تعديلات المنتج.');
      } else {
        const saved = await addProduct({
          name: name.trim(), category: category.trim(), unit: resolvedUnit,
          quantity: quantity === '' ? 0 : Number(quantity),
          minQuantity: minQuantity === '' ? 0 : Number(minQuantity),
          notes: notes.trim(), branchId: branchId || null,
          expiryDate: expiryDate || null, purchasePrice, supplier: supplier.trim(),
        });
        onSaved(saved, 'تمت إضافة المنتج.');
      }
    } catch (e) {
      setError(e.message || 'تعذّر حفظ المنتج.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={editing ? 'تعديل المنتج' : 'إضافة منتج'}
      sub={editing ? product.name : 'أضف صنفاً جديداً إلى مخزون العيادة'}
      onClose={onClose}
      width={560}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="اسم المنتج">
          <Input iconStart="package" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: قفازات طبية" />
        </Field>

        <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="التصنيف">
            <Input iconStart="tag" list="inventory-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="مثال: مستلزمات طبية" />
            <datalist id="inventory-categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="الوحدة">
            <Select value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              <option value="__other">غير ذلك…</option>
            </Select>
          </Field>
        </div>

        {unit === '__other' && (
          <Field label="اكتب الوحدة">
            <Input value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="مثال: لفة" />
          </Field>
        )}

        <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field
            label={editing ? 'الكمية الحالية' : 'الكمية الحالية'}
            hint={editing ? 'تُعدَّل من «إضافة / خصم كمية» حتى تُسجَّل الحركة' : 'الرصيد الافتتاحي — يُسجَّل كحركة إضافة'}
          >
            <Input type="number" min="0" step="1" iconStart="hash"
              value={editing ? fmtQty(product.quantity) : quantity}
              disabled={editing}
              onChange={e => setQuantity(e.target.value)} placeholder="0" />
          </Field>
          <Field label="الحد الأدنى للمخزون" hint="ينبّهك النظام عند الوصول إليه">
            <Input type="number" min="0" step="1" iconStart="triangle-alert" value={minQuantity} onChange={e => setMinQuantity(e.target.value)} placeholder="0" />
          </Field>
        </div>

        <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="تاريخ الانتهاء (اختياري)" hint={`ينبّهك النظام قبلها بـ ${EXPIRY_SOON_DAYS} يوماً`}>
            <DateInput value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </Field>
          <Field label="سعر الشراء (اختياري)" hint="سعر الوحدة الواحدة بالجنيه">
            <Input type="number" min="0" step="0.01" iconStart="wallet" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0.00" />
          </Field>
        </div>

        <Field label="المورد (اختياري)">
          <Input iconStart="truck" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="مثال: شركة النيل للمستلزمات" />
        </Field>

        <Field label="الفرع (اختياري)" hint="اتركه فارغاً إذا كان المنتج مشتركاً بين كل الفروع">
          <Select value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="كل الفروع">
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>

        <Field label="ملاحظات (اختياري)">
          <TextArea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثال: يُحفظ في الثلاجة" />
        </Field>
      </div>

      {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Btn variant="ghost" size="lg" onClick={onClose}>إلغاء</Btn>
        <Btn size="lg" disabled={!valid || saving} onClick={handleSave} style={{ flex: 1 }}>
          {saving ? 'جارِ الحفظ…' : editing ? 'حفظ التعديلات' : 'إضافة المنتج'}
        </Btn>
      </div>
    </ModalShell>
  );
}

// ---------- add / deduct quantity ----------
const BIG_CHANGE_RATIO = 0.5;   // >50% of stock in one move asks for confirmation

function MovementModal({ product, mode, onClose, onSaved }) {
  const [type, setType] = useState(mode ?? 'add');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const amount = Number(qty);
  const valid = qty !== '' && Number.isFinite(amount) && amount >= 0 && (type === 'adjust' || amount > 0);
  const after = !valid ? product.quantity
    : type === 'add' ? product.quantity + amount
    : type === 'use' ? product.quantity - amount
    : amount;
  const shortfall = after < 0;

  // Deducting more than half the shelf, or a stock-take that rewrites the count,
  // is worth a second look before it's written to the ledger.
  const isBigChange = valid && !shortfall && (
    type === 'adjust'
      ? Math.abs(after - product.quantity) > 0
      : (type === 'use' && product.quantity > 0 && amount / product.quantity > BIG_CHANGE_RATIO)
  );

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await recordMovement({ productId: product.id, type, quantity: amount, notes: notes.trim() });
      onSaved(type === 'add' ? 'تمت إضافة الكمية.' : type === 'use' ? 'تم خصم الكمية.' : 'تم تعديل الكمية.');
    } catch (e) {
      setError(e.message || 'تعذّر تسجيل الحركة.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (isBigChange && !confirming) { setConfirming(true); return; }
    submit();
  };

  const TYPES = [
    ['add', 'إضافة كمية', 'plus'],
    ['use', 'خصم كمية', 'minus'],
    ['adjust', 'تعديل الرصيد', 'pencil'],
  ];

  return (
    <ModalShell title="تعديل المخزون" sub={`${product.name} · المتاح حالياً ${fmtQty(product.quantity)} ${product.unit}`} onClose={onClose} width={480}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TYPES.map(([id, label, icon]) => (
          <button key={id} onClick={() => { setType(id); setConfirming(false); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12.5, background: type === id ? 'var(--brand)' : '#fff', border: type === id ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: type === id ? '#fff' : 'var(--text-body)' }}>
            <Icon name={icon} size={14} color={type === id ? '#fff' : 'var(--text-muted)'} />{label}
          </button>
        ))}
      </div>

      <Field
        label={type === 'adjust' ? `الرصيد الصحيح (${product.unit})` : `الكمية (${product.unit})`}
        hint={type === 'adjust' ? 'اكتب العدد الفعلي بعد الجرد' : undefined}
      >
        <Input type="number" min="0" step="1" iconStart="hash" value={qty} onChange={e => { setQty(e.target.value); setConfirming(false); }} placeholder="0" autoFocus />
      </Field>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, background: shortfall ? 'var(--red-50)' : 'var(--surface-page)', border: `1px solid ${shortfall ? 'var(--red-500)' : 'var(--border-subtle)'}` }}>
        <Icon name={shortfall ? 'circle-alert' : 'arrow-left-right'} size={18} color={shortfall ? 'var(--red-500)' : 'var(--text-muted)'} />
        {shortfall ? (
          <div style={{ color: 'var(--red-600)', fontSize: 13.5, fontWeight: 700, lineHeight: 1.7 }}>
            لا يمكن خصم {fmtQty(amount)} — المتاح {fmtQty(product.quantity)} {product.unit} فقط.
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--text-body)' }}>
            <b style={{ fontFamily: font }}>{fmtQty(product.quantity)}</b> {product.unit}
            <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>←</span>
            <b style={{ fontFamily: font, color: after <= 0 ? 'var(--red-600)' : after <= product.min_quantity ? 'var(--amber-700)' : 'var(--green-600)' }}>{fmtQty(after)}</b> {product.unit}
          </div>
        )}
      </div>

      {!shortfall && valid && after <= product.min_quantity && (
        <div style={{ marginTop: 12 }}>
          <Alert tone="warning">
            {after <= 0
              ? `🔴 بعد هذه العملية ينفد مخزون ${product.name} بالكامل.`
              : `⚠️ بعد هذه العملية يصبح مخزون ${product.name} ${fmtQty(after)} ${product.unit} — الحد الأدنى ${fmtQty(product.min_quantity)}.`}
          </Alert>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Field label="ملاحظات (اختياري)">
          <TextArea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder={type === 'add' ? 'مثال: توريد من المورّد' : 'مثال: استُخدمت في كشف'} />
        </Field>
      </div>

      {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

      <div style={{ marginTop: 20 }}>
        {confirming ? (
          <ConfirmBox
            tone="warning"
            message={type === 'adjust'
              ? `سيتم تغيير رصيد ${product.name} من ${fmtQty(product.quantity)} إلى ${fmtQty(after)} ${product.unit}. متأكد؟`
              : `هذه كمية كبيرة — سيتم خصم ${fmtQty(amount)} من ${fmtQty(product.quantity)} ${product.unit}. متأكد؟`}
            confirmLabel="نعم، سجّل الحركة"
            busy={saving}
            onConfirm={submit}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="ghost" size="lg" onClick={onClose}>إلغاء</Btn>
            <Btn size="lg" disabled={!valid || shortfall || saving} onClick={handleSave} style={{ flex: 1 }}>
              {saving ? 'جارِ التسجيل…' : 'تسجيل الحركة'}
            </Btn>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ---------- movement history ----------
function MovementRow({ tx, showProduct }) {
  const positive = tx.quantity_change > 0;
  const tone = positive ? 'var(--green-600)' : 'var(--red-600)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: font, fontWeight: 900, fontSize: 15, color: tone, minWidth: 62, direction: 'ltr', textAlign: 'start' }}>
        {positive ? '+' : '−'}{fmtQty(Math.abs(tx.quantity_change))}
      </span>
      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>
          {showProduct ? tx.productName : MOVEMENT_LABEL[tx.type]}
          {showProduct && <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}> · {MOVEMENT_LABEL[tx.type]}</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {fmtQty(tx.quantity_before)} ← {fmtQty(tx.quantity_after)} {tx.unit}
          {tx.notes ? ` · ${tx.notes}` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'start', minWidth: 130 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="user-round" size={12} color="var(--text-muted)" />{tx.user_name || 'مستخدم'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDateTime(tx.created_at)}</div>
      </div>
    </div>
  );
}

function HistoryModal({ product, onClose }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    listTransactions({ productId: product.id, page, pageSize: 10 })
      .then(setData)
      .catch(e => setError(e.message || 'تعذّر تحميل سجل الحركة.'))
      .finally(() => setLoading(false));
  }, [product.id, page]);

  return (
    <ModalShell title="سجل حركة المخزون" sub={`${product.name} · الرصيد الحالي ${fmtQty(product.quantity)} ${product.unit}`} onClose={onClose} width={600}>
      <ErrorNote>{error}</ErrorNote>
      {loading && <Loading />}
      {!loading && !error && data.rows.length === 0 && (
        <EmptyState icon="history" title="لا توجد حركات بعد" sub="ستظهر هنا كل عمليات الإضافة والخصم على هذا المنتج." />
      )}
      {!loading && data.rows.map(tx => <MovementRow key={tx.id} tx={tx} />)}
      {data.total > 10 && (
        <Pager page={page} pageSize={10} total={data.total} onPage={setPage} />
      )}
    </ModalShell>
  );
}

// ---------- main tab ----------
export default function InventoryTab({ branchId = null }) {
  const { can } = useAuth();
  const canManage = can('inventory_manage');

  const [summary, setSummary] = useState({ total: 0, ok: 0, low: 0, out: 0, totalQuantity: 0, totalValue: 0, expiringSoon: 0, expired: 0 });
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [recent, setRecent] = useState([]);
  const [products, setProducts] = useState({ rows: [], total: 0 });
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(0);

  const [editing, setEditing] = useState(null);   // product | 'new'
  const [moving, setMoving] = useState(null);     // { product, mode }
  const [history, setHistory] = useState(null);   // product
  const [removing, setRemoving] = useState(null); // product
  const [removeBusy, setRemoveBusy] = useState(false);
  const [hardDelete, setHardDelete] = useState(false);

  const reloadOverview = useCallback(() => Promise.all([
    inventorySummary({ branchId }),
    listLowStock({ branchId }),
    listExpiring({ branchId }),
    listTransactions({ page: 0, pageSize: 6 }),
    listCategories(),
  ]).then(([s, low, exp, tx, cats]) => {
    setSummary(s);
    setLowStock(low);
    setExpiring(exp);
    setRecent(tx.rows);
    setCategories(cats);
  }), [branchId]);

  const reloadProducts = useCallback(() => listProducts({ search, status, expiry: expiryFilter, category, branchId, includeArchived, page, pageSize: PAGE_SIZE })
    .then(setProducts), [search, status, expiryFilter, category, branchId, includeArchived, page]);

  // Full refresh after any write, so the tiles and the ⚠️ alerts track the table.
  const refreshAll = useCallback(() => {
    setError('');
    return Promise.all([reloadOverview(), reloadProducts()])
      .catch(e => setError(e.message || 'تعذّر تحميل بيانات المخزون.'));
  }, [reloadOverview, reloadProducts]);

  useEffect(() => {
    listBranches().then(setBranches).catch(() => {});
  }, []);

  useEffect(() => { setPage(0); }, [search, status, expiryFilter, category, includeArchived, branchId]);

  useEffect(() => {
    setLoading(true);
    refreshAll().finally(() => setLoading(false));
  }, [refreshAll]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(''), 3500);
    return () => clearTimeout(id);
  }, [flash]);

  const afterWrite = message => {
    setEditing(null); setMoving(null); setRemoving(null); setHardDelete(false);
    setFlash(message);
    refreshAll();
  };

  const handleRemove = async () => {
    setRemoveBusy(true);
    setError('');
    try {
      if (hardDelete) await deleteProduct(removing.id);
      else await archiveProduct(removing.id);
      afterWrite(hardDelete ? 'تم حذف المنتج نهائياً.' : 'تمت أرشفة المنتج.');
    } catch (e) {
      setError(e.message || 'تعذّر حذف المنتج.');
    } finally {
      setRemoveBusy(false);
    }
  };

  // Whether the empty state is "nothing here yet" or "nothing matches" — it changes
  // both the wording and whether we offer the add button.
  const filtered = !!search || status !== 'all' || expiryFilter !== 'all' || !!category;

  const tiles = [
    {
      label: 'إجمالي الأصناف', value: summary.total, icon: 'package', tone: 'var(--brand)',
      // إجمالي الكميات is a different question from إجمالي الأصناف: 12 أصناف can be
      // 400 وحدة on the shelf. Both belong on the tile.
      sub: `${fmtQty(summary.totalQuantity)} وحدة في المخزون`,
    },
    {
      label: 'متوفرة', value: summary.ok, icon: 'check-circle', tone: 'var(--green-500)',
      sub: summary.totalValue > 0 ? `قيمة المخزون ${fmtQty(summary.totalValue)} ج.م` : null,
    },
    {
      label: 'اقتربت من النفاد', value: summary.low, icon: 'triangle-alert', tone: 'var(--amber-600)',
      sub: summary.out > 0 ? `و${summary.out} نافدة تماماً` : null,
    },
    {
      label: 'مشاكل صلاحية', value: summary.expired + summary.expiringSoon, icon: 'calendar-x', tone: 'var(--red-500)',
      sub: `${summary.expired} منتهية · ${summary.expiringSoon} تقترب`,
    },
  ];

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ErrorNote>{error}</ErrorNote>
      {flash && <Alert tone="success">{flash}</Alert>}

      {/* KPI tiles */}
      <div className="admin-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {tiles.map(t => (
          <Card2 key={t.label} pad={18}>
            <Ring2 icon={t.icon} tone={t.tone} size={42} />
            <div style={{ fontFamily: font, fontWeight: 900, fontSize: 30, color: 'var(--text-strong)', marginTop: 12 }}>{t.value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 1 }}>{t.label}</div>
            {t.sub && <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginTop: 4 }}>{t.sub}</div>}
          </Card2>
        ))}
      </div>

      {/* Low-stock alerts + latest movements */}
      <div className="admin-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card2>
          <SectionTitle sub="المنتجات التي وصلت إلى الحد الأدنى أو نفدت">تنبيهات المخزون</SectionTitle>
          {lowStock.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', color: 'var(--green-600)', fontSize: 13.5 }}>
              <Icon name="check-circle" size={18} color="var(--green-500)" />كل المنتجات فوق الحد الأدنى.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStock.slice(0, 6).map(p => {
                const out = p.status === 'out';
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 14, background: out ? 'var(--red-50)' : 'var(--accent-subtle)', border: `1px solid ${out ? 'var(--red-500)' : 'var(--amber-500)'}` }}>
                    <span style={{ fontSize: 16 }}>{out ? '🔴' : '⚠️'}</span>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.7, color: out ? 'var(--red-600)' : 'var(--amber-700)' }}>
                      {/* Phrased with المخزون as the subject so the sentence stays
                          grammatical whatever the product's name and gender are. */}
                      <b style={{ fontFamily: font }}>{p.name}</b>{' — '}
                      {out
                        ? 'نفد المخزون بالكامل.'
                        : `أوشك المخزون على النفاد: المتبقي ${fmtQty(p.quantity)} من الحد الأدنى ${fmtQty(p.min_quantity)}.`}
                    </div>
                    {canManage && (
                      <Btn size="sm" variant="soft" icon="plus" onClick={() => setMoving({ product: p, mode: 'add' })}>توريد</Btn>
                    )}
                  </div>
                );
              })}
              {lowStock.length > 6 && (
                <button onClick={() => { setStatus('alert'); setSearch(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--brand)', textAlign: 'start', padding: '4px 0' }}>
                  عرض كل الـ {lowStock.length} تنبيهاً ←
                </button>
              )}
            </div>
          )}
        </Card2>

        <Card2>
          <SectionTitle sub={`الأصناف المنتهية أو التي تنتهي خلال ${EXPIRY_SOON_DAYS} يوماً`}>تنبيهات الصلاحية</SectionTitle>
          {expiring.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', color: 'var(--green-600)', fontSize: 13.5 }}>
              <Icon name="check-circle" size={18} color="var(--green-500)" />لا يوجد صنف قارب على انتهاء صلاحيته.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {expiring.slice(0, 6).map(p => {
                const gone = p.expiryState === 'expired';
                const days = daysUntil(p.expiry_date);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 14, background: gone ? 'var(--red-50)' : 'var(--accent-subtle)', border: `1px solid ${gone ? 'var(--red-500)' : 'var(--amber-500)'}` }}>
                    <span style={{ fontSize: 16 }}>{gone ? '⛔' : '⏳'}</span>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.7, color: gone ? 'var(--red-600)' : 'var(--amber-700)' }}>
                      <b style={{ fontFamily: font }}>{p.name}</b>{' — '}
                      {gone
                        ? `انتهت صلاحيته في ${fmtDate(p.expiry_date)}${p.quantity > 0 ? ` ولا يزال ${fmtQty(p.quantity)} ${p.unit} على الرف.` : '.'}`
                        : `تنتهي صلاحيته بعد ${days} يوم (${fmtDate(p.expiry_date)}).`}
                    </div>
                    {canManage && gone && p.quantity > 0 && (
                      <Btn size="sm" variant="ghost" icon="minus" onClick={() => setMoving({ product: p, mode: 'use' })}>إعدام</Btn>
                    )}
                  </div>
                );
              })}
              {expiring.length > 6 && (
                <button onClick={() => { setExpiryFilter('soon'); setStatus('all'); setSearch(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--brand)', textAlign: 'start', padding: '4px 0' }}>
                  عرض كل الـ {expiring.length} تنبيهاً ←
                </button>
              )}
            </div>
          )}
        </Card2>
      </div>

      <div className="admin-split" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, alignItems: 'start' }}>
        <Card2>
          <SectionTitle sub="أحدث الإضافات والخصومات">آخر حركات المخزون</SectionTitle>
          {recent.length === 0
            ? <EmptyState icon="history" title="لا توجد حركات بعد" sub="ستظهر هنا كل عملية إضافة أو خصم فور تسجيلها." />
            : recent.map(tx => <MovementRow key={tx.id} tx={tx} showProduct />)}
        </Card2>
      </div>

      {/* Products table */}
      <Card2 pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>المنتجات</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{products.total} منتج{includeArchived ? ' (شاملاً المؤرشف)' : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <FilterChips options={EXPIRY_FILTERS} value={expiryFilter} onChange={setExpiryFilter} />
          </div>
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {categories.length > 0 && (
              <Select value={category} onChange={e => setCategory(e.target.value)} placeholder="كل التصنيفات" style={{ width: 180 }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            )}
            <SearchBox value={search} onChange={setSearch} placeholder="بحث بالاسم أو التصنيف أو المورد…" width={260} />
            {canManage && <Btn icon="plus" onClick={() => setEditing('new')}>إضافة منتج</Btn>}
          </div>
        </div>

        {loading && <Loading />}
        {!loading && products.rows.length === 0 && (
          <EmptyState
            icon="package"
            title={filtered ? 'لا توجد نتائج مطابقة' : 'لا توجد منتجات بعد'}
            sub={filtered ? 'جرّب تغيير البحث أو الفلتر.' : 'ابدأ بإضافة أول منتج إلى مخزون العيادة.'}
            action={canManage && !filtered ? <Btn icon="plus" onClick={() => setEditing('new')}>إضافة منتج</Btn> : null}
          />
        )}

        {!loading && products.rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 1180 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {['المنتج', 'التصنيف', 'الكمية الحالية', 'الوحدة', 'الحد الأدنى', 'الحالة', 'تاريخ الانتهاء', 'سعر الشراء', 'المورد', 'تاريخ الإضافة', ''].map(h => (
                    <th key={h} style={{ textAlign: 'start', fontWeight: 600, padding: '10px 22px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.rows.map(p => (
                  <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Ring2 icon="package" size={34} tone={STATUS_TONE[p.status]?.color ?? 'var(--brand)'} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{p.name}</div>
                          {(p.branchName || !p.active) && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                              {p.branchName ?? 'كل الفروع'}{!p.active ? ' · مؤرشف' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{p.category || '—'}</td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', fontFamily: font, fontWeight: 800, fontSize: 15, color: p.status === 'out' ? 'var(--red-600)' : p.status === 'low' ? 'var(--amber-700)' : 'var(--text-strong)' }}>{fmtQty(p.quantity)}</td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{p.unit}</td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{fmtQty(p.min_quantity)}</td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}><StatusPillLocal status={p.status} /></td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12.5 }}><ExpiryCell product={p} /></td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>
                      {p.purchase_price == null ? '—' : `${fmtQty(p.purchase_price)} ج.م`}
                    </td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{p.supplier || '—'}</td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 12.5, whiteSpace: 'nowrap' }} title={`آخر تحديث: ${fmtDateTime(p.updated_at)}`}>{fmtDate(p.created_at)}</td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', gap: 7 }}>
                        {canManage && p.active && <>
                          <IconBtn icon="plus" title="إضافة كمية" tone="var(--green-600)" size={34} onClick={() => setMoving({ product: p, mode: 'add' })} />
                          <IconBtn icon="minus" title="خصم كمية" tone="var(--red-600)" size={34} onClick={() => setMoving({ product: p, mode: 'use' })} />
                        </>}
                        <IconBtn icon="history" title="سجل الحركة" size={34} onClick={() => setHistory(p)} />
                        {canManage && <>
                          <IconBtn icon="pencil" title="تعديل المنتج" size={34} onClick={() => setEditing(p)} />
                          {p.active
                            ? <IconBtn icon="trash-2" title="حذف / أرشفة" tone="var(--red-500)" size={34} onClick={() => { setRemoving(p); setHardDelete(false); }} />
                            : <IconBtn icon="rotate-ccw" title="استعادة" size={34} onClick={() => restoreProduct(p.id).then(() => afterWrite('تمت استعادة المنتج.')).catch(e => setError(e.message))} />}
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pager page={page} pageSize={PAGE_SIZE} total={products.total} onPage={setPage} />

        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border-subtle)' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)} />
            إظهار المنتجات المؤرشفة
          </label>
        </div>
      </Card2>

      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          branches={branches}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(_, msg) => afterWrite(msg)}
        />
      )}
      {moving && (
        <MovementModal
          product={moving.product}
          mode={moving.mode}
          onClose={() => setMoving(null)}
          onSaved={msg => afterWrite(msg)}
        />
      )}
      {history && <HistoryModal product={history} onClose={() => setHistory(null)} />}
      {removing && (
        <ModalShell title="حذف المنتج" sub={removing.name} onClose={() => setRemoving(null)} width={460}>
          <div style={{ fontSize: 13.5, color: 'var(--text-body)', lineHeight: 1.8, marginBottom: 14 }}>
            الأرشفة تخفي المنتج من القوائم وتحتفظ بكل سجل حركته — وهي الخيار الآمن.
            الحذف النهائي يمسح المنتج <b>وكل تاريخ حركته</b> ولا يمكن التراجع عنه.
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--red-600)', cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={hardDelete} onChange={e => setHardDelete(e.target.checked)} />
            نعم، احذف المنتج وسجل حركته نهائياً
          </label>
          <ConfirmBox
            message={hardDelete
              ? `سيتم حذف ${removing.name} وكل حركاته نهائياً. متأكد؟`
              : `سيتم أرشفة ${removing.name} — يمكنك استعادته لاحقاً.`}
            confirmLabel={hardDelete ? 'حذف نهائي' : 'أرشفة المنتج'}
            tone={hardDelete ? 'danger' : 'warning'}
            busy={removeBusy}
            onConfirm={handleRemove}
            onCancel={() => setRemoving(null)}
          />
        </ModalShell>
      )}
    </div>
  );
}
