-- ميعاد — specialty-correct services + doctor_services mapping.
-- Fixes: every doctor was linked to all 4 generic services (a bug from 0001's blanket
-- seed), so an orthopedist could be booked for "تنظيف أسنان" etc. This adds
-- specialty-specific services and rebuilds doctor_services so each doctor only offers
-- services that match their actual specialty.

insert into services (name, duration_minutes, price, icon) values
  ('حشو وعلاج عصب', 60, 750, 'sparkles'),
  ('تحليل معملي', 15, 250, 'flask-conical'),
  ('جبس وعلاج طبيعي', 40, 500, 'bone'),
  ('كشف وعلاج جلدية', 30, 500, 'sparkle'),
  ('تطعيمات أطفال', 20, 300, 'syringe'),
  ('متابعة حمل وسونار', 30, 550, 'heart-pulse')
on conflict do nothing;

-- Rebuild doctor_services from scratch — the 0001 seed enabled every service for every
-- doctor, which is what caused the mismatch.
delete from doctor_services;

insert into doctor_services (doctor_id, service_id, enabled)
select d.id, s.id, true
from doctors d
join services s on (
  (d.specialty = 'أسنان' and s.name in ('تنظيف أسنان', 'حشو وعلاج عصب', 'استشارة', 'متابعة'))
  or (d.specialty = 'جلدية' and s.name in ('كشف وعلاج جلدية', 'استشارة', 'متابعة'))
  or (d.specialty = 'أطفال' and s.name in ('تطعيمات أطفال', 'استشارة', 'متابعة'))
  or (d.specialty = 'باطنة' and s.name in ('أشعة', 'تحليل معملي', 'استشارة', 'متابعة'))
  or (d.specialty = 'عظام' and s.name in ('جبس وعلاج طبيعي', 'أشعة', 'استشارة', 'متابعة'))
  or (d.specialty = 'نساء وتوليد' and s.name in ('متابعة حمل وسونار', 'استشارة', 'متابعة'))
)
on conflict (doctor_id, service_id) do nothing;
