// 12-hour time display with Arabic period words instead of AM/PM — used everywhere
// a time string ("HH:MM" or "HH:MM:SS") is shown to the user.
//   before 12:00      -> صباحًا  (e.g. 6:00 صباحًا, 9:30 صباحًا)
//   exactly 12:00      -> ظهرًا   (12:00 ظهرًا)
//   after 12:00        -> مساءً  (3:00 مساءً, 9:30 مساءً)
export function formatArabicTime(time) {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;

  const period = h === 12 ? 'ظهرًا' : h < 12 ? 'صباحًا' : 'مساءً';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
