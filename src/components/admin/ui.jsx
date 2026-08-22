// Shared مركز التحكم primitives.
//
// These were defined inline in Admin.jsx; they live here now so the newer sections
// (المخزون، الملف الطبي) are built from the *same* pieces rather than look-alike
// copies. Admin.jsx imports them from here — nothing about how they render changed.
import { useState, useEffect } from 'react';

export const ds = window.MeaadDesignSystem_54b82a;
const { Icon, Alert } = ds;

export const font = 'var(--font-display)';
export const body = 'var(--font-body)';

export function Ring2({ icon, tone = 'var(--brand)', size = 44 }) {
  return <div style={{ width: size, height: size, borderRadius: 14, flex: '0 0 auto', background: `color-mix(in srgb, ${tone} 14%, white)`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={size * 0.5} /></div>;
}

export function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 46, height: 27, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 3, background: on ? 'var(--brand)' : 'var(--gray-300)', display: 'flex', justifyContent: on ? 'flex-start' : 'flex-end', transition: 'all .18s' }}>
      <span style={{ width: 21, height: 21, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </button>
  );
}

export function Card2({ children, style, pad = 22 }) {
  return <div style={{ background: 'var(--white)', borderRadius: 20, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', padding: pad, ...style }}>{children}</div>;
}

export function SectionTitle({ children, sub }) {
  return <div style={{ marginBottom: 14 }}>
    <div style={{ fontFamily: font, fontWeight: 800, fontSize: 18, color: 'var(--text-strong)' }}>{children}</div>
    {sub && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{sub}</div>}
  </div>;
}

// ---------- buttons ----------
// Same shapes the dashboard already uses, named so new screens stop re-typing them.
const BTN_BASE = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' };

const VARIANTS = {
  primary: { border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 800, boxShadow: 'var(--shadow-brand)' },
  soft: { border: '1.5px solid var(--brand-border)', background: 'var(--brand-subtle)', color: 'var(--teal-700)', fontWeight: 700 },
  ghost: { border: '1.5px solid var(--border-default)', background: '#fff', color: 'var(--text-body)', fontWeight: 700 },
  danger: { border: 'none', background: 'var(--red-500)', color: '#fff', fontWeight: 800 },
  dangerGhost: { border: '1.5px solid var(--red-500)', background: '#fff', color: 'var(--red-600)', fontWeight: 700 },
};

const SIZES = {
  sm: { padding: '8px 14px', fontSize: 12.5 },
  md: { padding: '11px 18px', fontSize: 13.5 },
  lg: { padding: '13px 22px', fontSize: 15 },
};

export function Btn({ variant = 'primary', size = 'md', icon, disabled, block, children, style, ...rest }) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  return (
    <button
      disabled={disabled}
      style={{ ...BTN_BASE, ...v, ...SIZES[size], width: block ? '100%' : undefined, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, boxShadow: disabled ? 'none' : v.boxShadow, ...style }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} color="currentColor" />}
      {children}
    </button>
  );
}

export function IconBtn({ icon, tone = 'var(--text-body)', title, disabled, onClick, size = 36 }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} aria-label={title}
      style={{ width: size, height: size, borderRadius: 11, border: '1px solid var(--border-default)', background: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', opacity: disabled ? 0.5 : 1 }}>
      <Icon name={icon} size={size * 0.45} color={tone} />
    </button>
  );
}

// ---------- states ----------
export function Loading({ label = 'جارِ التحميل…' }) {
  return <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>{label}</div>;
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <div style={{ marginBottom: 14 }}><Alert tone="danger">{children}</Alert></div>;
}

export function EmptyState({ icon = 'inbox', title, sub, action }) {
  return (
    <div style={{ padding: '34px 20px', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
        <Icon name={icon} size={24} />
      </div>
      <div style={{ fontFamily: font, fontWeight: 800, fontSize: 15, color: 'var(--text-strong)', marginTop: 12 }}>{title}</div>
      {sub && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>{sub}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

// ---------- modal shell ----------
// Same backdrop/panel the appointment modals use, including the .admin-modal
// classes the mobile stylesheet in Admin.jsx targets.
export function ModalShell({ title, sub, onClose, width = 560, children, footer }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    // Fixed, not absolute: these modals open from tab content that can be taller
    // than the viewport, where an absolutely-positioned backdrop would centre the
    // panel somewhere far down the scroll.
    <div className="admin-modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div className="admin-modal" style={{ width, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: 12, position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)' }}>{title}</div>
            {sub && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="إغلاق" style={{ width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <Icon name="x" size={19} color="var(--text-body)" />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
        {footer && <div style={{ padding: '0 24px 24px' }}>{footer}</div>}
      </div>
    </div>
  );
}

/** Inline confirm strip — the pattern AppointmentModal already uses for deletes. */
export function ConfirmBox({ message, confirmLabel = 'تأكيد', cancelLabel = 'تراجع', busy, onConfirm, onCancel, tone = 'danger' }) {
  const danger = tone === 'danger';
  return (
    <div style={{ padding: 14, borderRadius: 14, background: danger ? 'var(--red-50)' : 'var(--accent-subtle)', border: `1px solid ${danger ? 'var(--red-500)' : 'var(--amber-500)'}` }}>
      <div style={{ color: danger ? 'var(--red-600)' : 'var(--amber-700)', fontSize: 13.5, fontWeight: 700, marginBottom: 10, lineHeight: 1.7 }}>{message}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={onCancel} style={{ flex: 1 }}>{cancelLabel}</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm} style={{ flex: 1 }}>{busy ? 'جارِ التنفيذ…' : confirmLabel}</Btn>
      </div>
    </div>
  );
}

// ---------- pagination ----------
export function Pager({ page, pageSize, total, onPage }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{from}–{to} من {total}</span>
      <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconBtn icon="chevron-right" title="السابق" size={32} disabled={page === 0} onClick={() => onPage(page - 1)} />
        <span style={{ fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--text-body)' }}>{page + 1} / {pageCount}</span>
        <IconBtn icon="chevron-left" title="التالي" size={32} disabled={page + 1 >= pageCount} onClick={() => onPage(page + 1)} />
      </div>
    </div>
  );
}

// ---------- search box ----------
// Debounced so typing doesn't fire a query per keystroke against the server.
export function SearchBox({ value, onChange, placeholder = 'بحث…', width = 240 }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    if (local === value) return;
    const id = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(id);
  }, [local]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '9px 16px', width, maxWidth: '100%' }}>
      <Icon name="search" size={16} color="var(--text-muted)" />
      <input value={local} onChange={e => setLocal(e.target.value)} placeholder={placeholder}
        style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-body)', width: '100%' }} />
    </div>
  );
}

/** Pill row used for the filter chips across the dashboard. */
export function FilterChips({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(([id, label]) => (
        <span key={id} onClick={() => onChange(id)} style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', background: value === id ? 'var(--brand-subtle)' : 'transparent', color: value === id ? 'var(--teal-700)' : 'var(--text-muted)', border: value === id ? '1px solid var(--brand-border)' : '1px solid transparent' }}>{label}</span>
      ))}
    </div>
  );
}

// ---------- text inputs matching the DS look ----------
// The DS <Input> has no textarea/date equivalent, and Admin.jsx repeats these raw
// styles at every call site; centralised here for the new screens.
const CONTROL = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
  color: 'var(--text-strong)', background: '#fff', border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)', padding: '0 14px', height: 46, outline: 'none',
};

export function DateInput(props) {
  return <input type="date" {...props} style={{ ...CONTROL, ...props.style }} />;
}

export function TextArea({ rows = 3, ...props }) {
  return <textarea rows={rows} {...props} style={{ ...CONTROL, height: 'auto', padding: '10px 14px', resize: 'vertical', ...props.style }} />;
}

/** Formats a numeric(12,2) so whole numbers read as "150" and not "150.00". */
export function fmtQty(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '0';
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

/** "22 أغسطس 2026" */
export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "22 أغسطس 2026 · 4:35 م" */
export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${fmtDate(value)} · ${d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}`;
}
