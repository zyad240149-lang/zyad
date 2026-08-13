import { useEffect, useState } from 'react';

function targetMs(date, time) {
  if (!date) return null;
  const t = new Date(`${date}T${(time || '00:00').slice(0, 5)}:00`).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Live countdown to a date+time ('YYYY-MM-DD' + 'HH:MM'), ticking every second. */
export function useCountdown(date, time) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = targetMs(date, time);
  if (target == null) return null;

  const diff = target - now;
  const passed = diff <= 0;
  const abs = Math.abs(diff);

  return {
    days: Math.floor(abs / 86400000),
    hours: Math.floor((abs % 86400000) / 3600000),
    minutes: Math.floor((abs % 3600000) / 60000),
    seconds: Math.floor((abs % 60000) / 1000),
    passed,
  };
}
