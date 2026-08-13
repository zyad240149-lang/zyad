import { useCountdown } from '../lib/useCountdown.js';

const pad = n => String(n).padStart(2, '0');

/** Live "days/hours/minutes/seconds remaining" readout, shared by admin + customer views. */
export default function Countdown({ date, time, cancelled, size = 'sm', style }) {
  const c = useCountdown(date, time);
  if (!c || cancelled) return null;

  if (c.passed) {
    return (
      <span style={{ fontSize: size === 'lg' ? 13 : 11.5, fontWeight: 700, color: 'var(--text-muted)', ...style }}>
        الموعد حان
      </span>
    );
  }

  const unitStyle = { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size === 'lg' ? 15 : 12.5 };
  const labelStyle = { fontSize: size === 'lg' ? 10.5 : 9.5, fontWeight: 700, opacity: 0.75, marginInlineStart: 2 };

  return (
    <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'baseline', gap: size === 'lg' ? 8 : 6, color: 'var(--brand)', ...style }}>
      <span><span style={unitStyle}>{c.days}</span><span style={labelStyle}>يوم</span></span>
      <span><span style={unitStyle}>{pad(c.hours)}</span><span style={labelStyle}>س</span></span>
      <span><span style={unitStyle}>{pad(c.minutes)}</span><span style={labelStyle}>د</span></span>
      <span><span style={unitStyle}>{pad(c.seconds)}</span><span style={labelStyle}>ث</span></span>
    </span>
  );
}
