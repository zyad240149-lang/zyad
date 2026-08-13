import { supabase } from '../supabaseClient.js';

// Shape returned to the UI mirrors the old static story data (service/doctor/branch as
// plain strings) so existing components need minimal changes.
// Flat shape matching the original story data (AS.agenda) so existing agenda/timeline
// components need no changes: {time, customer, service, doctor, phone, status, isNew}.
function mapRow(row) {
  return {
    id: row.id,
    date: row.appointment_date,
    time: row.appointment_time?.slice(0, 5) ?? row.appointment_time,
    status: row.status,
    isNew: row.status === 'pending',
    notes: row.notes,
    price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
    customerId: row.customer?.id ?? null,
    // Guest bookings (no linked profile) fall back to the free-typed name/phone.
    customer: row.customer?.name ?? row.customer_name ?? 'عميل',
    phone: row.customer?.phone ?? row.customer_phone ?? '',
    isGuest: !row.customer,
    branchId: row.branch_id ?? null,
    branch: row.branch?.name ?? null,
    serviceId: row.service_id ?? null,
    // Custom services (typed by admin, not in the services table) fall back to service_name.
    service: row.service?.name ?? row.service_name ?? null,
    isCustomService: !row.service_id,
    doctorId: row.doctor_id ?? null,
    doctor: row.doctor?.name ?? null,
  };
}

const SELECT = `
  id, appointment_date, appointment_time, status, notes, price,
  customer_name, customer_phone, service_name,
  branch_id, service_id, doctor_id,
  customer:profiles!appointments_customer_id_fkey ( id, name, phone ),
  branch:branches ( name ),
  service:services ( name ),
  doctor:doctors ( name )
`;

/** All appointments — for staff (agenda tab). RLS restricts this to staff accounts. */
export async function listAllAppointments() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Appointments belonging to the signed-in customer. */
export async function listMyAppointments() {
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .eq('customer_id', auth.user.id)
    .order('appointment_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/**
 * Creates an appointment for an existing customer (customerId) and/or a guest
 * booked by name+phone (customerName/customerPhone) — admin flow doesn't require
 * the customer to have signed in via OTP first. customerName/customerPhone are kept
 * even alongside customerId as the contact info entered at booking time (may differ
 * from the account's saved profile — e.g. booking for a family member).
 */
export async function createAppointment({ customerId, customerName, customerPhone, branchId, serviceId, serviceName, doctorId, date, time, notes, status = 'pending', price }) {
  if (!supabase) throw new Error('Supabase غير مهيأ — تحقق من VITE_SUPABASE_ANON_KEY في .env');
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      customer_id: customerId || null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      branch_id: branchId,
      service_id: serviceId || null,
      service_name: serviceId ? null : serviceName,
      doctor_id: doctorId,
      appointment_date: date,
      appointment_time: time,
      notes,
      status,
      price: price === '' || price === undefined ? null : price,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateAppointmentStatus(id, status) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapRow(data);
}

/** Full edit: branch/service/doctor/date/time/notes/status/price in one save. */
export async function updateAppointment(id, { branchId, serviceId, serviceName, doctorId, date, time, notes, status, price }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('appointments')
    .update({
      branch_id: branchId,
      service_id: serviceId || null,
      service_name: serviceId ? null : serviceName,
      doctor_id: doctorId,
      appointment_date: date,
      appointment_time: time,
      notes, status,
      price: price === '' || price === undefined ? null : price,
    })
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function rescheduleAppointment(id, { branchId, serviceId, doctorId, date, time }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('appointments')
    .update({ branch_id: branchId, service_id: serviceId, doctor_id: doctorId, appointment_date: date, appointment_time: time })
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteAppointment(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
}

/**
 * All time slots already booked for this doctor/date (excluding cancelled) — for crossing out
 * taken slots in a picker. Goes through a security-definer RPC rather than a direct table read
 * because RLS on `appointments` hides other customers' rows from a non-staff session — a plain
 * .select() here would silently return nothing for anyone but the current user or staff.
 */
export async function listTakenTimes({ doctorId, date, excludeAppointmentId }) {
  if (!supabase || !doctorId || !date) return [];
  const { data, error } = await supabase.rpc('get_doctor_taken_times', {
    p_doctor_id: doctorId, p_date: date, p_exclude_id: excludeAppointmentId || null,
  });
  if (error) throw error;
  return (data ?? []).map(r => r.appointment_time?.slice(0, 5));
}

/** Availability check: is this doctor already booked at this date/time (excluding cancelled)? Same RPC rationale as listTakenTimes. */
export async function isSlotTaken({ doctorId, date, time, excludeAppointmentId }) {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_doctor_slot_taken', {
    p_doctor_id: doctorId, p_date: date, p_time: time, p_exclude_id: excludeAppointmentId || null,
  });
  if (error) throw error;
  return !!data;
}
