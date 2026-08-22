import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const { Icon, Button } = window.MeaadDesignSystem_54b82a;
const font = 'var(--font-display)';

// ── الأسعار ──────────────────────────────────────────────────────────────────
// كل الأرقام هنا وبس — غيّرها من المكان ده ومحتاجش تلمس أي حاجة تانية.
// `monthly` هو سعر الشهر الواحد لكل مدة اشتراك؛ الإجمالي بيتحسب تلقائيًا،
// وكذلك نسبة التوفير مقارنة بالدفع الشهري.
const PERIODS = [
  { id: 'm1', label: 'شهري', months: 1 },
  { id: 'm3', label: '٣ شهور', months: 3 },
  { id: 'm6', label: '٦ شهور', months: 6 },
  { id: 'm12', label: 'سنوي', months: 12 },
];

const PLANS = [
  {
    id: 'basic',
    name: 'أساسي',
    tagline: 'لعيادة واحدة بتبدأ',
    icon: 'stethoscope',
    monthly: { m1: 499, m3: 475, m6: 449, m12: 399 },
    features: [
      'فرع واحد',
      'حتى ٣ أطباء',
      'حجز أونلاين للعملاء',
      'لوحة تحكم للمواعيد',
      'جدول عمل مرن لكل طبيب',
      'دعم فني بالبريد',
    ],
    missing: ['تقارير مالية', 'صلاحيات مخصّصة للفريق'],
  },
  {
    id: 'pro',
    name: 'احترافي',
    tagline: 'لعيادة بتكبر وفريق بيزيد',
    icon: 'trending-up',
    popular: true,
    monthly: { m1: 999, m3: 949, m6: 899, m12: 799 },
    features: [
      'حتى ٣ فروع',
      'أطباء بلا حد',
      'جدول عمل وخدمات مخصّصة لكل طبيب',
      'تقارير مالية وفواتير',
      'صلاحيات مخصّصة للفريق',
      'دعم فني بالواتساب',
    ],
    missing: ['ربط API', 'مدير حساب مخصّص'],
  },
  {
    id: 'enterprise',
    name: 'متقدم',
    tagline: 'لسلسلة عيادات أو مركز كبير',
    icon: 'building-2',
    monthly: { m1: 1999, m3: 1899, m6: 1799, m12: 1599 },
    features: [
      'فروع بلا حد',
      'كل مميزات الاحترافي',
      'ربط API مع أنظمتك',
      'تقارير مخصّصة',
      'مدير حساب مخصّص',
      'تدريب للفريق',
      'دعم أولوية على مدار الساعة',
    ],
    missing: [],
  },
];

// جدول المقارنة التفصيلي — نفس المميزات اللي في الكروت فوق، بس منظّمة صف لكل
// خدمة عشان يبان الفرق بين الباقات بنظرة واحدة بدل ما تتقارن كارت بكارت.
// القيمة true/false = علامة صح/خطأ، وأي نص تاني بيتعرض زي ما هو (رقم أو مدة).
const COMPARE_ROWS = [
  { group: 'الحجم' },
  { label: 'عدد الفروع', values: ['فرع واحد', 'حتى ٣ فروع', 'فروع بلا حد'] },
  { label: 'عدد الأطباء', values: ['حتى ٣ أطباء', 'بلا حد', 'بلا حد'] },
  { group: 'الحجز والمواعيد' },
  { label: 'حجز أونلاين للعملاء', values: [true, true, true] },
  { label: 'لوحة تحكم للمواعيد', values: [true, true, true] },
  { label: 'منع تعارض الحجوزات تلقائيًا', values: [true, true, true] },
  { label: 'جدول عمل مرن لكل طبيب', values: [true, true, true] },
  { group: 'الإدارة والتقارير' },
  { label: 'تقارير مالية وفواتير', values: [false, true, true] },
  { label: 'صلاحيات مخصّصة للفريق', values: [false, true, true] },
  { label: 'تقارير مخصّصة حسب الطلب', values: [false, false, true] },
  { group: 'التكامل والدعم' },
  { label: 'ربط API مع أنظمتك', values: [false, false, true] },
  { label: 'مدير حساب مخصّص', values: [false, false, true] },
  { label: 'تدريب للفريق', values: [false, false, true] },
  { label: 'الدعم الفني', values: ['بالبريد', 'بالواتساب', 'أولوية ٢٤/٧'] },
];
// ─────────────────────────────────────────────────────────────────────────────

const fmt = n => n.toLocaleString('ar-EG');

const STYLE = `
  .pr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:stretch}
  .pr-toggle{display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:var(--surface-sunken);border:1px solid var(--border-subtle)}
  .pr-toggle button{border:none;cursor:pointer;background:transparent;font-family:${font};font-weight:700;font-size:13.5px;color:var(--text-muted);padding:9px 18px;border-radius:999px;white-space:nowrap;transition:background .15s,color .15s}
  .pr-toggle button[data-on="true"]{background:#fff;color:var(--teal-700);box-shadow:var(--shadow-sm)}
  .pr-card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--border-subtle);border-radius:22px;padding:26px}
  .pr-card[data-popular="true"]{border:2px solid var(--brand);box-shadow:0 20px 44px -22px rgba(15,163,163,.55)}
  @media (max-width:960px){ .pr-grid{grid-template-columns:1fr;max-width:460px;margin-inline:auto} }
  @media (max-width:560px){
    .pr-toggle{width:100%;justify-content:space-between}
    .pr-toggle button{flex:1;padding:9px 6px;font-size:12.5px}
  }

  .pr-compare-scroll{overflow-x:auto}
  .pr-compare{width:100%;min-width:640px;border-collapse:collapse}
  .pr-compare th,.pr-compare td{padding:13px 16px;text-align:center;font-size:13.5px}
  .pr-compare thead th{position:sticky;top:0;background:#fff}
  .pr-compare .pr-compare-feature{text-align:start;color:var(--text-body);font-weight:600;white-space:nowrap}
  .pr-compare .pr-compare-plan{font-family:${font};font-weight:800;color:var(--text-strong);font-size:14.5px}
  .pr-compare .pr-compare-plan[data-popular="true"]{color:var(--teal-700)}
  .pr-compare tbody tr{border-top:1px solid var(--border-subtle)}
  .pr-compare tbody tr[data-popular-col]{position:relative}
  .pr-compare td.pr-compare-popular-col,.pr-compare th.pr-compare-popular-col{background:var(--brand-subtle)}
  .pr-compare-group td{background:var(--surface-page);text-align:start;font-family:${font};font-weight:800;font-size:12.5px;color:var(--text-muted);padding:10px 16px}
`;

function Card({ plan, period, onPick }) {
  const perMonth = plan.monthly[period.id];
  const total = perMonth * period.months;
  const baseline = plan.monthly.m1 * period.months;
  const savings = baseline - total;
  const savingsPct = Math.round((savings / baseline) * 100);

  return (
    <div className="pr-card" data-popular={!!plan.popular}>
      {plan.popular && (
        <div style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 11.5, padding: '5px 13px', borderRadius: 999, marginBottom: 14 }}>
          <Icon name="star" size={12} color="#fff" fill="#fff" />الأكثر طلبًا
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, flex: '0 0 auto', background: 'var(--brand-subtle)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={plan.icon} size={20} />
        </div>
        <div>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 18, color: 'var(--text-strong)' }}>{plan.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 1 }}>{plan.tagline}</div>
        </div>
      </div>

      <div style={{ marginTop: 20, paddingBottom: 18, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ fontFamily: font, fontWeight: 900, fontSize: 38, color: 'var(--text-strong)', lineHeight: 1 }}>{fmt(perMonth)}</span>
          <span style={{ fontFamily: font, fontWeight: 700, fontSize: 15, color: 'var(--text-muted)' }}>ج / شهر</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
          {period.months === 1
            ? 'يُدفع شهريًا'
            : <>الإجمالي <b style={{ color: 'var(--text-strong)', fontFamily: font }}>{fmt(total)} ج</b> كل {period.label.replace('سنوي', 'سنة')}</>}
        </div>
        {savings > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'var(--green-50, #E9F9F0)', color: 'var(--green-600)', fontFamily: font, fontWeight: 700, fontSize: 12, padding: '5px 11px', borderRadius: 999 }}>
            <Icon name="tag" size={12} color="var(--green-600)" />
            توفّر {fmt(savings)} ج ({savingsPct}%)
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 0', flex: 1 }}>
        {plan.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, color: 'var(--text-body)', lineHeight: 1.7 }}>
            <span style={{ flex: '0 0 auto', marginTop: 3 }}><Icon name="check" size={15} color="var(--green-500)" stroke={3} /></span>{f}
          </div>
        ))}
        {plan.missing.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.7, opacity: .75 }}>
            <span style={{ flex: '0 0 auto', marginTop: 3 }}><Icon name="x" size={15} color="var(--gray-400)" /></span>
            <span style={{ textDecoration: 'line-through' }}>{f}</span>
          </div>
        ))}
      </div>

      <Button block size="lg" variant={plan.popular ? 'primary' : 'secondary'} onClick={onPick}>
        ابدأ بباقة {plan.name}
      </Button>
    </div>
  );
}

function CompareCell({ value }) {
  if (value === true) return <Icon name="check" size={16} color="var(--green-500)" stroke={3} />;
  if (value === false) return <Icon name="x" size={15} color="var(--gray-300)" />;
  return <span>{value}</span>;
}

function CompareTable() {
  return (
    <div style={{ marginTop: 46 }}>
      <h3 style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)', textAlign: 'center', margin: '0 0 18px' }}>
        قارن الباقات خدمة بخدمة
      </h3>
      <div className="pr-compare-scroll" style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 18 }}>
        <table className="pr-compare">
          <thead>
            <tr>
              <th className="pr-compare-feature"></th>
              {PLANS.map(plan => (
                <th key={plan.id} className={plan.popular ? 'pr-compare-popular-col' : undefined}>
                  <div className="pr-compare-plan" data-popular={!!plan.popular}>{plan.name}</div>
                  {plan.popular && <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>الأكثر طلبًا</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row, i) =>
              row.group ? (
                <tr key={`g${i}`} className="pr-compare-group"><td colSpan={PLANS.length + 1}>{row.group}</td></tr>
              ) : (
                <tr key={row.label}>
                  <td className="pr-compare-feature">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className={PLANS[j].popular ? 'pr-compare-popular-col' : undefined}>
                      <CompareCell value={v} />
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Pricing() {
  // Yearly first: it's the best value, and leading with it frames the monthly
  // figure as the discounted one rather than the expensive one.
  const [periodId, setPeriodId] = useState('m12');
  const navigate = useNavigate();
  const period = PERIODS.find(p => p.id === periodId);

  return (
    <section id="pricing" style={{ background: 'var(--surface-page)', padding: '80px 0' }}>
      <style>{STYLE}</style>
      <div className="wrap">
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <h2 style={{ fontFamily: font, fontWeight: 900, fontSize: 32, color: 'var(--text-strong)', margin: 0 }}>باقات تناسب حجم عيادتك</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 10, maxWidth: 480, marginInline: 'auto', lineHeight: 1.85 }}>
            كل الباقات بتشمل التحديثات والدعم. كل ما تشترك لمدة أطول، السعر الشهري يقل.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <div className="pr-toggle" role="tablist" aria-label="مدة الاشتراك">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={p.id === periodId}
                  data-on={p.id === periodId}
                  onClick={() => setPeriodId(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pr-grid">
          {PLANS.map(plan => (
            <Card key={plan.id} plan={plan} period={period} onPick={() => navigate('/signup')} />
          ))}
        </div>

        <CompareTable />

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 26 }}>
          الأسعار بالجنيه المصري ولا تشمل ضريبة القيمة المضافة · تقدر تغيّر باقتك أو تلغي في أي وقت
        </p>
      </div>
    </section>
  );
}
