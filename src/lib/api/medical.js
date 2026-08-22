import { supabase } from '../supabaseClient.js';

// السجل الطبي للمريض.
//
// Identity note: a "patient" is not the same row as a "profile". profiles.id is a
// foreign key onto auth.users, so a walk-in who never signed in cannot have one —
// and the booking flow already supports exactly that (appointments.customer_name /
// customer_phone with no customer_id). `patients` is therefore the clinical
// identity, with patients.profile_id linking to the account when there is one.
// A DB trigger creates/links the patient on every appointment, so booking a visit
// never means typing the same person in twice.
//
// Everything here is gated by RLS on the medical_records_view / _manage modules of
// the existing role_permissions matrix.

export const MEDICAL_BUCKET = 'medical-files';

const PATIENT_SELECT = 'id, profile_id, name, phone, birth_date, gender, notes, created_at, updated_at, profile:profiles(id, name, phone, email, status, created_at)';

function mapPatient(row) {
  if (!row) return null;
  return {
    ...row,
    email: row.profile?.email ?? null,
    accountStatus: row.profile?.status ?? null,
    joinedAt: row.profile?.created_at ?? row.created_at,
    hasAccount: !!row.profile_id,
  };
}

/** Phone variants a search term could match: the local 01… form and the stored 20… form. */
function phoneVariants(term) {
  const digits = term.replace(/[^\d]/g, '');
  if (!digits) return [];
  const out = new Set([digits]);
  if (digits.startsWith('0')) out.add('20' + digits.slice(1));
  if (digits.startsWith('20')) out.add('0' + digits.slice(2));
  if (digits.startsWith('1')) { out.add('0' + digits); out.add('20' + digits); }
  return [...out];
}

/** Paged patient directory with search by name or phone. */
export async function listPatients({ search = '', page = 0, pageSize = 20 } = {}) {
  if (!supabase) return { rows: [], total: 0 };
  let q = supabase.from('patients').select(PATIENT_SELECT, { count: 'exact' });

  const term = search.trim();
  if (term) {
    const safe = term.replace(/[%,()]/g, ' ');
    const filters = [`name.ilike.%${safe}%`, ...phoneVariants(term).map(v => `phone.ilike.%${v}%`)];
    q = q.or(filters.join(','));
  }

  const from = page * pageSize;
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []).map(mapPatient), total: count ?? 0 };
}

export async function getPatient(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.from('patients').select(PATIENT_SELECT).eq('id', id).single();
  if (error) throw error;
  return mapPatient(data);
}

export async function createPatient({ name, phone, birthDate, gender, notes }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('patients')
    .insert({ name, phone: phone || null, birth_date: birthDate || null, gender: gender || null, notes: notes || null })
    .select(PATIENT_SELECT)
    .single();
  if (error) throw error;
  return mapPatient(data);
}

export async function updatePatient(id, { name, phone, birthDate, gender, notes }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (phone !== undefined) patch.phone = phone || null;
  if (birthDate !== undefined) patch.birth_date = birthDate || null;
  if (gender !== undefined) patch.gender = gender || null;
  if (notes !== undefined) patch.notes = notes || null;
  const { data, error } = await supabase.from('patients').update(patch).eq('id', id).select(PATIENT_SELECT).single();
  if (error) throw error;
  return mapPatient(data);
}

// ---------- visits (الزيارات / الكشوف) ----------

const VISIT_SELECT = 'id, patient_id, appointment_id, doctor_id, branch_id, visit_date, visit_time, reason, diagnosis, notes, created_at, doctor:doctors(name, specialty), branch:branches(name)';

function mapVisit(row) {
  return {
    ...row,
    doctorName: row.doctor?.name ?? null,
    specialty: row.doctor?.specialty ?? null,
    branchName: row.branch?.name ?? null,
    time: row.visit_time?.slice(0, 5) ?? null,
  };
}

export async function listVisits(patientId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_SELECT)
    .eq('patient_id', patientId)
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapVisit);
}

export async function getVisit(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.from('visits').select(VISIT_SELECT).eq('id', id).single();
  if (error) throw error;
  return mapVisit(data);
}

/** Opens the encounter behind a booking, creating it (with the booking's doctor,
 *  branch, date and service) the first time. Returns the visit id. */
export async function openVisitForAppointment(appointmentId) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.rpc('ensure_visit_for_appointment', { p_appointment_id: appointmentId });
  if (error) throw new Error(error.message || 'تعذّر فتح الكشف.');
  return data;
}

export async function createVisit({ patientId, doctorId, branchId, visitDate, visitTime, reason, diagnosis, notes }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('visits')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId || null,
      branch_id: branchId || null,
      visit_date: visitDate,
      visit_time: visitTime || null,
      reason: reason || null,
      diagnosis: diagnosis || null,
      notes: notes || null,
      created_by: auth?.user?.id ?? null,
    })
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return mapVisit(data);
}

export async function updateVisit(id, { doctorId, branchId, visitDate, visitTime, reason, diagnosis, notes }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const patch = {};
  if (doctorId !== undefined) patch.doctor_id = doctorId || null;
  if (branchId !== undefined) patch.branch_id = branchId || null;
  if (visitDate !== undefined) patch.visit_date = visitDate;
  if (visitTime !== undefined) patch.visit_time = visitTime || null;
  if (reason !== undefined) patch.reason = reason || null;
  if (diagnosis !== undefined) patch.diagnosis = diagnosis || null;
  if (notes !== undefined) patch.notes = notes || null;
  const { data, error } = await supabase.from('visits').update(patch).eq('id', id).select(VISIT_SELECT).single();
  if (error) throw error;
  return mapVisit(data);
}

export async function deleteVisit(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) throw error;
}

// ---------- prescriptions (الروشتات) ----------

const RX_SELECT = 'id, patient_id, visit_id, doctor_id, notes, created_at, doctor:doctors(name), items:prescription_items(id, drug_name, dose, frequency, duration, instructions, sort_order)';

function mapRx(row) {
  return {
    ...row,
    doctorName: row.doctor?.name ?? null,
    items: (row.items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function listPrescriptions(patientId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('prescriptions').select(RX_SELECT)
    .eq('patient_id', patientId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRx);
}

/** Creates a prescription plus its drug lines in one go. */
export async function createPrescription({ patientId, visitId, doctorId, notes, items }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const clean = (items ?? []).filter(i => i.drugName?.trim());
  if (!clean.length) throw new Error('أضف دواءً واحداً على الأقل للروشتة.');

  const { data: auth } = await supabase.auth.getUser();
  const { data: rx, error } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: patientId, visit_id: visitId || null, doctor_id: doctorId || null,
      notes: notes || null, created_by: auth?.user?.id ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from('prescription_items').insert(
    clean.map((i, idx) => ({
      prescription_id: rx.id,
      drug_name: i.drugName.trim(),
      dose: i.dose?.trim() || null,
      frequency: i.frequency?.trim() || null,
      duration: i.duration?.trim() || null,
      instructions: i.instructions?.trim() || null,
      sort_order: idx,
    }))
  );
  if (itemsError) {
    // Don't leave a prescription with no drugs behind.
    await supabase.from('prescriptions').delete().eq('id', rx.id);
    throw itemsError;
  }

  const { data, error: readError } = await supabase.from('prescriptions').select(RX_SELECT).eq('id', rx.id).single();
  if (readError) throw readError;
  return mapRx(data);
}

export async function deletePrescription(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) throw error;
}

// ---------- labs (التحاليل) ----------

const LAB_SELECT = 'id, patient_id, visit_id, doctor_id, test_name, status, result, notes, file_path, requested_at, result_date, created_at, doctor:doctors(name)';

const mapLab = row => ({ ...row, doctorName: row.doctor?.name ?? null });

export async function listLabRequests(patientId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('lab_requests').select(LAB_SELECT)
    .eq('patient_id', patientId)
    .order('requested_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLab);
}

export async function createLabRequest({ patientId, visitId, doctorId, testName, status, result, notes, filePath, requestedAt, resultDate }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('lab_requests').insert({
    patient_id: patientId, visit_id: visitId || null, doctor_id: doctorId || null,
    test_name: testName, status: status || 'requested',
    result: result || null, notes: notes || null, file_path: filePath || null,
    requested_at: requestedAt || new Date().toISOString().slice(0, 10),
    result_date: resultDate || null,
    created_by: auth?.user?.id ?? null,
  }).select(LAB_SELECT).single();
  if (error) throw error;
  return mapLab(data);
}

export async function updateLabRequest(id, patch) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const body = {};
  if (patch.testName !== undefined) body.test_name = patch.testName;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.result !== undefined) body.result = patch.result || null;
  if (patch.notes !== undefined) body.notes = patch.notes || null;
  if (patch.filePath !== undefined) body.file_path = patch.filePath || null;
  if (patch.resultDate !== undefined) body.result_date = patch.resultDate || null;
  const { data, error } = await supabase.from('lab_requests').update(body).eq('id', id).select(LAB_SELECT).single();
  if (error) throw error;
  return mapLab(data);
}

export async function deleteLabRequest(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('lab_requests').delete().eq('id', id);
  if (error) throw error;
}

// ---------- radiology (الأشعة) ----------

const RAD_SELECT = 'id, patient_id, visit_id, doctor_id, exam_type, status, report, notes, file_path, performed_at, created_at, doctor:doctors(name)';

const mapRad = row => ({ ...row, doctorName: row.doctor?.name ?? null });

export async function listRadiology(patientId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('radiology_records').select(RAD_SELECT)
    .eq('patient_id', patientId)
    .order('performed_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRad);
}

export async function createRadiology({ patientId, visitId, doctorId, examType, status, report, notes, filePath, performedAt }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('radiology_records').insert({
    patient_id: patientId, visit_id: visitId || null, doctor_id: doctorId || null,
    exam_type: examType, status: status || 'requested',
    report: report || null, notes: notes || null, file_path: filePath || null,
    performed_at: performedAt || new Date().toISOString().slice(0, 10),
    created_by: auth?.user?.id ?? null,
  }).select(RAD_SELECT).single();
  if (error) throw error;
  return mapRad(data);
}

export async function updateRadiology(id, patch) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const body = {};
  if (patch.examType !== undefined) body.exam_type = patch.examType;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.report !== undefined) body.report = patch.report || null;
  if (patch.notes !== undefined) body.notes = patch.notes || null;
  if (patch.filePath !== undefined) body.file_path = patch.filePath || null;
  if (patch.performedAt !== undefined) body.performed_at = patch.performedAt;
  const { data, error } = await supabase.from('radiology_records').update(body).eq('id', id).select(RAD_SELECT).single();
  if (error) throw error;
  return mapRad(data);
}

export async function deleteRadiology(id) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('radiology_records').delete().eq('id', id);
  if (error) throw error;
}

// ---------- the whole file, in one round of parallel reads ----------

/**
 * Everything the patient file screen shows. Fetched in parallel so opening a file
 * is one wait, not five, and scoped to a single patient_id server-side — the id
 * comes from a row the user already listed, and RLS re-checks the permission on
 * every one of these tables regardless.
 */
export async function getPatientRecord(patientId) {
  const [patient, visits, prescriptions, labs, radiology] = await Promise.all([
    getPatient(patientId),
    listVisits(patientId),
    listPrescriptions(patientId),
    listLabRequests(patientId),
    listRadiology(patientId),
  ]);
  return { patient, visits, prescriptions, labs, radiology };
}

/** Supplies consumed during one encounter, for the visit detail view. */
export async function listVisitSupplies(visitId) {
  if (!supabase || !visitId) return [];
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('id, quantity_change, created_at, user_name, product:inventory_products(name, unit)')
    .eq('visit_id', visitId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.id,
    quantity: Math.abs(Number(r.quantity_change ?? 0)),
    name: r.product?.name ?? '—',
    unit: r.product?.unit ?? '',
    by: r.user_name,
    at: r.created_at,
  }));
}

// ---------- attachments ----------

/** Uploads to the private medical-files bucket and returns the stored object path. */
export async function uploadMedicalFile(patientId, file) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  if (file.size > 10 * 1024 * 1024) throw new Error('حجم الملف أكبر من 10 ميجابايت.');
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(MEDICAL_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    if (/bucket/i.test(error.message || '')) throw new Error('رفع الملفات غير مفعّل — أنشئ bucket باسم medical-files في Supabase Storage.');
    throw error;
  }
  return path;
}

/** Short-lived signed URL — the bucket is private, so nothing is publicly reachable. */
export async function getMedicalFileUrl(path) {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from(MEDICAL_BUCKET).createSignedUrl(path, 120);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function removeMedicalFile(path) {
  if (!supabase || !path) return;
  await supabase.storage.from(MEDICAL_BUCKET).remove([path]);
}

// ---------- timeline ----------

const TIMELINE_META = {
  visit: { icon: 'stethoscope', tone: 'var(--brand)', label: 'كشف' },
  prescription: { icon: 'pill', tone: 'var(--green-600)', label: 'روشتة' },
  lab: { icon: 'flask-conical', tone: 'var(--blue-600)', label: 'تحليل' },
  radiology: { icon: 'scan-line', tone: 'var(--amber-600)', label: 'أشعة' },
  appointment: { icon: 'calendar-days', tone: 'var(--teal-600)', label: 'موعد' },
};

export function timelineMeta(kind) {
  return TIMELINE_META[kind] ?? TIMELINE_META.visit;
}

/**
 * Merges the record into one date-keyed, newest-first timeline.
 * Built here rather than in SQL because a patient's history is small and the
 * screen already has every list loaded.
 */
export function buildTimeline({ visits = [], prescriptions = [], labs = [], radiology = [], appointments = [] }) {
  const events = [
    ...visits.map(v => ({
      kind: 'visit', date: v.visit_date, id: v.id, ref: v,
      title: v.reason ? `كشف — ${v.reason}` : 'كشف',
      sub: [v.doctorName, v.branchName].filter(Boolean).join(' · '),
      detail: v.diagnosis ? `التشخيص: ${v.diagnosis}` : null,
    })),
    ...prescriptions.map(p => ({
      kind: 'prescription', date: (p.created_at || '').slice(0, 10), id: p.id, ref: p,
      title: `روشتة — ${p.items.length} دواء`,
      sub: [p.doctorName].filter(Boolean).join(' · '),
      detail: p.items.map(i => i.drug_name).join('، ') || null,
    })),
    ...labs.map(l => ({
      kind: 'lab', date: l.requested_at, id: l.id, ref: l,
      title: `تحليل — ${l.test_name}`,
      sub: [l.doctorName].filter(Boolean).join(' · '),
      detail: l.result || null,
    })),
    ...radiology.map(r => ({
      kind: 'radiology', date: r.performed_at, id: r.id, ref: r,
      title: `أشعة — ${r.exam_type}`,
      sub: [r.doctorName].filter(Boolean).join(' · '),
      detail: r.report || null,
    })),
    // Bookings that never became an encounter still belong on the history.
    ...appointments
      .filter(a => !visits.some(v => v.appointment_id === a.id))
      .map(a => ({
        kind: 'appointment', date: a.date, id: a.id, ref: a,
        title: `موعد — ${a.service || 'خدمة'}`,
        sub: [a.doctor, a.branch].filter(Boolean).join(' · '),
        detail: a.status === 'cancelled' ? 'ملغي' : a.status === 'pending' ? 'قيد الانتظار' : null,
      })),
  ].filter(e => e.date);

  const byDate = new Map();
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}
