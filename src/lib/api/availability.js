import { supabase } from '../supabaseClient.js';

export const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Full schedule for one doctor: 7 days, each with active flag + its time periods. */
export async function getDoctorSchedule(doctorId) {
  if (!supabase) return [];
  const [{ data: days, error: daysError }, { data: periods, error: periodsError }] = await Promise.all([
    supabase.from('doctor_schedule_days').select('*').eq('doctor_id', doctorId),
    supabase.from('doctor_schedule_periods').select('*').eq('doctor_id', doctorId).order('start_time'),
  ]);
  if (daysError) throw daysError;
  if (periodsError) throw periodsError;
  return WEEKDAYS.map((label, weekday) => ({
    weekday,
    label,
    active: days.find(d => d.weekday === weekday)?.active ?? true,
    periods: periods.filter(p => p.weekday === weekday).map(p => ({ id: p.id, start: p.start_time.slice(0, 5), end: p.end_time.slice(0, 5) })),
  }));
}

export async function setDayActive(doctorId, weekday, active) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('doctor_schedule_days').upsert({ doctor_id: doctorId, weekday, active }, { onConflict: 'doctor_id,weekday' });
  if (error) throw error;
}

export async function addSchedulePeriod(doctorId, weekday, start, end) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.from('doctor_schedule_periods').insert({ doctor_id: doctorId, weekday, start_time: start, end_time: end }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSchedulePeriod(periodId) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('doctor_schedule_periods').delete().eq('id', periodId);
  if (error) throw error;
}

/** Same shape as getDoctorSchedule, but for when a whole branch is open — independent of any one doctor's hours. */
export async function getBranchSchedule(branchId) {
  if (!supabase) return [];
  const [{ data: days, error: daysError }, { data: periods, error: periodsError }] = await Promise.all([
    supabase.from('branch_schedule_days').select('*').eq('branch_id', branchId),
    supabase.from('branch_schedule_periods').select('*').eq('branch_id', branchId).order('start_time'),
  ]);
  if (daysError) throw daysError;
  if (periodsError) throw periodsError;
  return WEEKDAYS.map((label, weekday) => ({
    weekday,
    label,
    active: days.find(d => d.weekday === weekday)?.active ?? true,
    periods: periods.filter(p => p.weekday === weekday).map(p => ({ id: p.id, start: p.start_time.slice(0, 5), end: p.end_time.slice(0, 5) })),
  }));
}

export async function setBranchDayActive(branchId, weekday, active) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('branch_schedule_days').upsert({ branch_id: branchId, weekday, active }, { onConflict: 'branch_id,weekday' });
  if (error) throw error;
}

export async function addBranchSchedulePeriod(branchId, weekday, start, end) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.from('branch_schedule_periods').insert({ branch_id: branchId, weekday, start_time: start, end_time: end }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBranchSchedulePeriod(periodId) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('branch_schedule_periods').delete().eq('id', periodId);
  if (error) throw error;
}

/** Services the clinic offers, each flagged whether this doctor currently provides it. */
export async function listDoctorServices(doctorId) {
  if (!supabase) return [];
  const [{ data: services, error: servicesError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from('services').select('*').order('name'),
    supabase.from('doctor_services').select('service_id, enabled').eq('doctor_id', doctorId),
  ]);
  if (servicesError) throw servicesError;
  if (linksError) throw linksError;
  return services.map(s => ({ ...s, enabled: links.find(l => l.service_id === s.id)?.enabled ?? false }));
}

export async function setDoctorService(doctorId, serviceId, enabled) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('doctor_services').upsert({ doctor_id: doctorId, service_id: serviceId, enabled }, { onConflict: 'doctor_id,service_id' });
  if (error) throw error;
}

export async function updateDoctorSettings(doctorId, { bufferMinutes, maxAdvanceDays, rescheduleCutoffHours }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('doctors').update({
    buffer_minutes: bufferMinutes, max_advance_days: maxAdvanceDays, reschedule_cutoff_hours: rescheduleCutoffHours,
  }).eq('id', doctorId);
  if (error) throw error;
}

/**
 * The doctor's own `doctors` row, if their staff profile is linked to one
 * (via doctors.profile_id) — lets a doctor manage their own schedule directly.
 */
export async function getMyDoctorRecord() {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await supabase.from('doctors').select('*').eq('profile_id', auth.user.id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Bookable time slots for a doctor on a given date: derived from that weekday's
 * active periods, sliced into `slotMinutes` steps with `bufferMinutes` gaps —
 * not a fixed list, so it reflects whatever the doctor's schedule actually says.
 */
export function computeSlotsForDay(schedule, date, slotMinutes = 30) {
  if (!date) return [];
  const weekday = new Date(`${date}T00:00:00`).getDay();
  const day = schedule.find(d => d.weekday === weekday);
  if (!day || !day.active) return [];
  const slots = [];
  for (const period of day.periods) {
    let [h, m] = period.start.split(':').map(Number);
    const [endH, endM] = period.end.split(':').map(Number);
    while (h < endH || (h === endH && m < endM)) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      m += slotMinutes;
      if (m >= 60) { h += Math.floor(m / 60); m %= 60; }
    }
  }
  return slots;
}
