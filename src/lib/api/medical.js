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
// Everything here is gated by RLS on the role_permissions matrix:
//   medical_records_view      — the directory (name, phone, file number)
//   medical_records_clinical  — visits, diagnoses, drugs, labs, files, history
//   medical_records_manage    — writing any of it

export const MEDICAL_BUCKET = 'medical-files';

const PATIENT_SELECT = 'id, profile_id, file_number, name, phone, email, address, birth_date, gender, notes, created_at, updated_at, profile:profiles(id, name, phone, email, status, created_at)';

function mapPatient(row) {
  if (!row) return null;
  return {
    ...row,
    // A linked account owns its email; a walk-in's is typed onto the patient row.
    email: row.profile?.email ?? row.email ?? null,
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

/** Paged patient directory with search by name, phone or medical file number. */
export async function listPatients({ search = '', page = 0, pageSize = 20 } = {}) {
  if (!supabase) return { rows: [], total: 0 };
  let q = supabase.from('patients').select(PATIENT_SELECT, { count: 'exact' });

  const term = search.trim();
  if (term) {
    const safe = term.replace(/[%,()]/g, ' ');
    const filters = [
      `name.ilike.%${safe}%`,
      `file_number.ilike.%${safe}%`,
      ...phoneVariants(term).map(v => `phone.ilike.%${v}%`),
    ];
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

// file_number is assigned by a DB trigger (0005) — never sent from here, so two
// staff creating a patient at the same time can't land on the same number.
export async function createPatient({ name, phone, email, address, birthDate, gender, notes }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase
    .from('patients')
    .insert({
      name, phone: phone || null, email: email || null, address: address || null,
      birth_date: birthDate || null, gender: gender || null, notes: notes || null,
    })
    .select(PATIENT_SELECT)
    .single();
  if (error) throw error;
  return mapPatient(data);
}

export async function updatePatient(id, { name, phone, email, address, birthDate, gender, notes }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (phone !== undefined) patch.phone = phone || null;
  if (email !== undefined) patch.email = email || null;
  if (address !== undefined) patch.address = address || null;
  if (birthDate !== undefined) patch.birth_date = birthDate || null;
  if (gender !== undefined) patch.gender = gender || null;
  if (notes !== undefined) patch.notes = notes || null;
  const { data, error } = await supabase.from('patients').update(patch).eq('id', id).select(PATIENT_SELECT).single();
  if (error) throw error;
  return mapPatient(data);
}

/**
 * Deletes a patient and everything hanging off them — visits, prescriptions,
 * labs, radiology, attachments (all `on delete cascade`). Their appointments
 * survive with patient_id cleared, so the booking and payment history is not
 * touched. Stored files are removed first: nothing else references them, and a
 * cascade in the DB can't reach into the storage bucket.
 */
export async function deletePatient(patientId) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const attachments = await listAttachments(patientId).catch(() => []);
  const paths = attachments.map(a => a.storage_path).filter(Boolean);
  if (paths.length) await supabase.storage.from(MEDICAL_BUCKET).remove(paths);
  const { error } = await supabase.from('patients').delete().eq('id', patientId);
  if (error) throw error;
}

// ---------- التاريخ الطبي (patient_medical_history) ----------
//
// One row per patient, in its own table rather than more columns on `patients`:
// RLS is row-level, so anything stored on the patient row is readable by whoever
// can list the directory. Allergies and chronic conditions are clinical, and sit
// behind medical_records_clinical — see the 0005 migration.

const HISTORY_FIELDS = [
  'blood_type', 'allergies', 'chronic_conditions', 'current_medications',
  'past_medications', 'past_surgeries', 'past_procedures', 'notes',
];

const HISTORY_SELECT = `patient_id, ${HISTORY_FIELDS.join(', ')}, updated_at, editor:profiles!patient_medical_history_updated_by_fkey(name)`;

/** Returns null when there's no history row yet (or the role can't read one). */
export async function getMedicalHistory(patientId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('patient_medical_history')
    .select(HISTORY_SELECT)
    .eq('patient_id', patientId)
    .maybeSingle();
  // A role without medical_records_clinical simply sees nothing here; that's the
  // permission working, not a failure worth surfacing on the screen.
  if (error) return null;
  return data ? { ...data, editorName: data.editor?.name ?? null } : null;
}

/** Upsert — the first save creates the row, later ones patch it. */
export async function saveMedicalHistory(patientId, fields) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const row = { patient_id: patientId };
  for (const key of HISTORY_FIELDS) {
    if (fields[key] !== undefined) row[key] = fields[key]?.trim?.() || null;
  }
  const { data, error } = await supabase
    .from('patient_medical_history')
    .upsert(row, { onConflict: 'patient_id' })
    .select(HISTORY_SELECT)
    .single();
  if (error) throw error;
  return { ...data, editorName: data.editor?.name ?? null };
}

// ---------- visits (الزيارات / الكشوف) ----------

const VISIT_SELECT = 'id, patient_id, appointment_id, doctor_id, branch_id, visit_date, visit_time, reason, symptoms, diagnosis, notes, follow_up, created_at, doctor:doctors(name, specialty), branch:branches(name)';

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

/**
 * Visit count + last visit date for a page of patients, in one query — what the
 * سجل المرضى table shows next to each row. A role without medical_records_clinical
 * gets nothing back (RLS), and the table shows «—» rather than an error.
 */
export async function listVisitStats(patientIds = []) {
  if (!supabase || !patientIds.length) return {};
  const { data, error } = await supabase
    .from('visits')
    .select('patient_id, visit_date')
    .in('patient_id', patientIds);
  if (error) return {};
  const out = {};
  for (const row of data ?? []) {
    const s = out[row.patient_id] ?? { count: 0, last: null };
    s.count += 1;
    if (!s.last || row.visit_date > s.last) s.last = row.visit_date;
    out[row.patient_id] = s;
  }
  return out;
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

export async function createVisit({ patientId, doctorId, branchId, visitDate, visitTime, reason, symptoms, diagnosis, notes, followUp }) {
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
      symptoms: symptoms || null,
      diagnosis: diagnosis || null,
      notes: notes || null,
      follow_up: followUp || null,
      created_by: auth?.user?.id ?? null,
    })
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return mapVisit(data);
}

export async function updateVisit(id, { doctorId, branchId, visitDate, visitTime, reason, symptoms, diagnosis, notes, followUp }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const patch = {};
  if (doctorId !== undefined) patch.doctor_id = doctorId || null;
  if (branchId !== undefined) patch.branch_id = branchId || null;
  if (visitDate !== undefined) patch.visit_date = visitDate;
  if (visitTime !== undefined) patch.visit_time = visitTime || null;
  if (reason !== undefined) patch.reason = reason || null;
  if (symptoms !== undefined) patch.symptoms = symptoms || null;
  if (diagnosis !== undefined) patch.diagnosis = diagnosis || null;
  if (notes !== undefined) patch.notes = notes || null;
  if (followUp !== undefined) patch.follow_up = followUp || null;
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
  const [patient, history, visits, prescriptions, labs, radiology, attachments] = await Promise.all([
    getPatient(patientId),
    getMedicalHistory(patientId),
    listVisits(patientId),
    listPrescriptions(patientId),
    listLabRequests(patientId),
    listRadiology(patientId),
    listAttachments(patientId),
  ]);
  return { patient, history, visits, prescriptions, labs, radiology, attachments };
}

/**
 * The same file for a role that can list patients but not read clinical data —
 * RLS already returns nothing from the clinical tables, so this just skips the
 * round trips instead of firing six queries that are guaranteed to come back empty.
 */
export async function getPatientBasics(patientId) {
  const patient = await getPatient(patientId);
  return { patient, history: null, visits: [], prescriptions: [], labs: [], radiology: [], attachments: [] };
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

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Uploads to the private medical-files bucket and returns the stored object path. */
export async function uploadMedicalFile(patientId, file) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  if (file.size > MAX_FILE_BYTES) throw new Error('حجم الملف أكبر من 10 ميجابايت.');
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
export async function getMedicalFileUrl(path, { download = false, expiresIn = 120 } = {}) {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from(MEDICAL_BUCKET)
    .createSignedUrl(path, expiresIn, download ? { download } : undefined);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

/**
 * Signed URLs for many objects in one request — used for the thumbnails in the
 * مرفقات gallery, where one call per image would be a request per card.
 * Returns a { path: url } map; a path that fails simply doesn't appear in it.
 */
export async function getMedicalFileUrls(paths, { expiresIn = 600 } = {}) {
  const list = [...new Set((paths ?? []).filter(Boolean))];
  if (!supabase || !list.length) return {};
  const { data, error } = await supabase.storage.from(MEDICAL_BUCKET).createSignedUrls(list, expiresIn);
  if (error) return {};
  return Object.fromEntries((data ?? []).filter(d => d.signedUrl).map(d => [d.path, d.signedUrl]));
}

export async function removeMedicalFile(path) {
  if (!supabase || !path) return;
  await supabase.storage.from(MEDICAL_BUCKET).remove([path]);
}

// ---------- المرفقات الطبية (patient_attachments) ----------
//
// The general file store for a patient: many files, each classified, described,
// and optionally tied to the visit it came out of. lab_requests / radiology_records
// keep their own single file_path from 0004 (the file shown on that record's card);
// VisitModal registers those uploads here too, so the مرفقات tab is one list.

export const ATTACHMENT_CATEGORIES = [
  ['lab', 'تحليل', 'flask-conical', 'var(--blue-500)'],
  ['radiology', 'أشعة', 'scan-line', 'var(--amber-600)'],
  ['report', 'تقرير طبي', 'file-text', 'var(--teal-600)'],
  ['prescription', 'وصفة', 'pill', 'var(--green-600)'],
  ['image', 'صورة', 'image', 'var(--brand)'],
  ['other', 'أخرى', 'paperclip', 'var(--gray-500)'],
];

export function attachmentCategoryMeta(id) {
  const found = ATTACHMENT_CATEGORIES.find(([cid]) => cid === id);
  const [, label, icon, tone] = found ?? ATTACHMENT_CATEGORIES[ATTACHMENT_CATEGORIES.length - 1];
  return { id: found ? id : 'other', label, icon, tone };
}

/** Best guess at the category from the file itself, so the picker starts sensibly. */
export function guessCategory(file) {
  if ((file.type || '').startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'report';
  return 'other';
}

export const isImageAttachment = a => (a?.file_type || '').startsWith('image/');
export const isPdfAttachment = a => (a?.file_type || '') === 'application/pdf';

const ATTACHMENT_SELECT = 'id, patient_id, visit_id, category, file_name, file_type, file_size, storage_path, description, uploaded_by, uploaded_by_name, created_at, updated_at, visit:visits(visit_date, reason)';

const mapAttachment = row => ({
  ...row,
  visitDate: row.visit?.visit_date ?? null,
  visitReason: row.visit?.reason ?? null,
});

/** Newest first — the order the file screen lists them in. */
export async function listAttachments(patientId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('patient_attachments')
    .select(ATTACHMENT_SELECT)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAttachment);
}

/** Registers an already-uploaded object. uploaded_by is stamped by a DB trigger. */
export async function createAttachment({ patientId, visitId, category, fileName, fileType, fileSize, storagePath, description }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.from('patient_attachments').insert({
    patient_id: patientId,
    visit_id: visitId || null,
    category: category || 'other',
    file_name: fileName,
    file_type: fileType || null,
    file_size: fileSize ?? null,
    storage_path: storagePath,
    description: description || null,
  }).select(ATTACHMENT_SELECT).single();
  if (error) throw error;
  return mapAttachment(data);
}

/** Upload + register in one call — what the "رفع ملف" button does. */
export async function uploadAttachment(patientId, file, { category, description, visitId } = {}) {
  const storagePath = await uploadMedicalFile(patientId, file);
  try {
    return await createAttachment({
      patientId, visitId,
      category: category || guessCategory(file),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath,
      description,
    });
  } catch (e) {
    // Don't leave an orphan object in the bucket if the row couldn't be written.
    await removeMedicalFile(storagePath);
    throw e;
  }
}

/** Edits the metadata only (التصنيف / الوصف / الزيارة المرتبطة). */
export async function updateAttachment(id, { category, description, visitId, fileName }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const patch = {};
  if (category !== undefined) patch.category = category;
  if (description !== undefined) patch.description = description || null;
  if (visitId !== undefined) patch.visit_id = visitId || null;
  if (fileName !== undefined) patch.file_name = fileName;
  const { data, error } = await supabase.from('patient_attachments').update(patch).eq('id', id).select(ATTACHMENT_SELECT).single();
  if (error) throw error;
  return mapAttachment(data);
}

/** Swaps the file behind an attachment, keeping its category/description/visit. */
export async function replaceAttachmentFile(attachment, file) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const storagePath = await uploadMedicalFile(attachment.patient_id, file);
  const { data, error } = await supabase.from('patient_attachments').update({
    storage_path: storagePath,
    file_name: file.name,
    file_type: file.type || null,
    file_size: file.size ?? null,
  }).eq('id', attachment.id).select(ATTACHMENT_SELECT).single();
  if (error) {
    await removeMedicalFile(storagePath);
    throw error;
  }
  // Only once the row points at the new object is the old one safe to drop.
  await removeMedicalFile(attachment.storage_path);
  return mapAttachment(data);
}

export async function deleteAttachment(attachment) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.from('patient_attachments').delete().eq('id', attachment.id);
  if (error) throw error;
  // A lab/radiology record may show the same object on its own card — clear those
  // pointers first, or they'd render a "فتح الملف" link onto a deleted file.
  await Promise.all([
    supabase.from('lab_requests').update({ file_path: null }).eq('file_path', attachment.storage_path),
    supabase.from('radiology_records').update({ file_path: null }).eq('file_path', attachment.storage_path),
  ]);
  await removeMedicalFile(attachment.storage_path);
}

/** "2.4 ميجابايت" / "312 كيلوبايت" */
export function fmtFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} كيلوبايت`;
  return `${(n / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

// ---------- timeline ----------

const TIMELINE_META = {
  visit: { icon: 'stethoscope', tone: 'var(--brand)', label: 'كشف' },
  prescription: { icon: 'pill', tone: 'var(--green-600)', label: 'روشتة' },
  lab: { icon: 'flask-conical', tone: 'var(--blue-600)', label: 'تحليل' },
  radiology: { icon: 'scan-line', tone: 'var(--amber-600)', label: 'أشعة' },
  attachment: { icon: 'paperclip', tone: 'var(--gray-600)', label: 'مرفق' },
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
export function buildTimeline({ visits = [], prescriptions = [], labs = [], radiology = [], attachments = [], appointments = [] }) {
  const events = [
    ...visits.map(v => ({
      kind: 'visit', date: v.visit_date, id: v.id, ref: v,
      title: v.reason ? `كشف — ${v.reason}` : 'كشف',
      sub: [v.doctorName, v.branchName].filter(Boolean).join(' · '),
      detail: [
        v.symptoms ? `الأعراض: ${v.symptoms}` : null,
        v.diagnosis ? `التشخيص: ${v.diagnosis}` : null,
      ].filter(Boolean).join(' — ') || null,
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
    // A file the visit's own record doesn't already show (a lab result image is
    // listed under its تحليل; a standalone report earns its own line).
    ...attachments.map(a => ({
      kind: 'attachment', date: (a.created_at || '').slice(0, 10), id: a.id, ref: a,
      title: `${attachmentCategoryMeta(a.category).label} — ${a.file_name}`,
      sub: a.uploaded_by_name ? `رفعه ${a.uploaded_by_name}` : null,
      detail: a.description || null,
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
