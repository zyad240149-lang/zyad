// ميعاد — التحاليل والأشعة والمرفقات الطبية.
//
// One patient's files: upload (several at once), classify, tie to the visit they
// came out of, preview images and PDFs in place, download, replace, delete.
// Grouped by category and sorted newest-first inside each group, so a doctor
// opening the file sees "التحاليل → تحليل دم — 22/08/2026" rather than a flat pile.
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ATTACHMENT_CATEGORIES, attachmentCategoryMeta, guessCategory,
  isImageAttachment, isPdfAttachment, fmtFileSize, MAX_FILE_BYTES,
  uploadAttachment, updateAttachment, deleteAttachment, replaceAttachmentFile,
  getMedicalFileUrl, getMedicalFileUrls,
} from '../../lib/api/medical.js';
import {
  ds, font, Card2, Ring2, Btn, IconBtn, ErrorNote, EmptyState,
  ModalShell, ConfirmBox, TextArea, fmtDate, fmtDateTime,
} from './ui.jsx';

const { Icon, Field, Select, Input, Alert } = ds;

const ACCEPT = 'image/*,application/pdf';

/** Category chips, plus a الكل chip — the filter above the gallery. */
function CategoryFilter({ value, onChange, counts }) {
  const options = [['all', 'الكل'], ...ATTACHMENT_CATEGORIES.map(([id, label]) => [id, label])];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(([id, label]) => {
        const count = id === 'all'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : (counts[id] ?? 0);
        if (id !== 'all' && count === 0) return null;
        const on = value === id;
        return (
          <span key={id} onClick={() => onChange(id)} style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', background: on ? 'var(--brand-subtle)' : 'transparent', color: on ? 'var(--teal-700)' : 'var(--text-muted)', border: on ? '1px solid var(--brand-border)' : '1px solid transparent' }}>
            {label} <span style={{ opacity: 0.7 }}>({count})</span>
          </span>
        );
      })}
    </div>
  );
}

// ---------- upload ----------
function UploadModal({ patientId, visits, defaultVisitId, onClose, onDone }) {
  const [files, setFiles] = useState([]);          // { file, category }
  const [description, setDescription] = useState('');
  const [visitId, setVisitId] = useState(defaultVisitId ?? '');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const pick = e => {
    const chosen = [...(e.target.files ?? [])];
    e.target.value = '';
    const tooBig = chosen.filter(f => f.size > MAX_FILE_BYTES);
    if (tooBig.length) {
      setError(`تجاوز الحد الأقصى (10 ميجابايت): ${tooBig.map(f => f.name).join('، ')}`);
    }
    const ok = chosen.filter(f => f.size <= MAX_FILE_BYTES);
    setFiles(list => [...list, ...ok.map(file => ({ file, category: guessCategory(file) }))]);
  };

  const setCategory = (i, category) => setFiles(list => list.map((f, idx) => idx === i ? { ...f, category } : f));

  const upload = async () => {
    setBusy(true);
    setError('');
    let done = 0;
    try {
      // Sequential, not Promise.all: a half-finished batch should leave the files
      // that did upload registered, and the progress count honest.
      for (const { file, category } of files) {
        await uploadAttachment(patientId, file, { category, description: description.trim(), visitId: visitId || null });
        done += 1;
        setProgress(done);
      }
      onDone(done === 1 ? 'تم رفع الملف.' : `تم رفع ${done} ملفات.`);
    } catch (e) {
      setError(`${e.message || 'تعذّر رفع الملف.'}${done ? ` (تم رفع ${done} قبل التوقف)` : ''}`);
      if (done) onDone(null, { silent: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="رفع ملف طبي" sub="صور التحاليل والأشعة والتقارير وملفات PDF" onClose={busy ? () => {} : onClose} width={560}>
      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 18px', borderRadius: 16, border: '1.5px dashed var(--border-default)', background: 'var(--surface-page)', cursor: busy ? 'not-allowed' : 'pointer', textAlign: 'center' }}>
        <Ring2 icon="upload" size={44} />
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14.5, color: 'var(--text-strong)' }}>اختر ملفاً أو أكثر</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>صور (JPG/PNG) أو PDF · حتى 10 ميجابايت للملف</div>
        <input type="file" accept={ACCEPT} multiple onChange={pick} disabled={busy} style={{ display: 'none' }} />
      </label>

      {files.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {files.map(({ file, category }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 13, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
              <Icon name={file.type?.startsWith('image/') ? 'image' : 'file-text'} size={17} color="var(--text-muted)" />
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--text-strong)', wordBreak: 'break-all' }}>{file.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fmtFileSize(file.size)}</div>
              </div>
              <select
                value={category}
                onChange={e => setCategory(i, e.target.value)}
                disabled={busy}
                style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, padding: '7px 10px', borderRadius: 10, border: '1px solid var(--border-default)', background: '#fff', color: 'var(--text-body)' }}
              >
                {ATTACHMENT_CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
              <IconBtn icon="x" size={30} tone="var(--red-500)" title="إزالة" disabled={busy}
                onClick={() => setFiles(list => list.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="الزيارة المرتبطة (اختياري)" hint="اربط الملف بالكشف الذي طُلب فيه">
          <Select value={visitId} onChange={e => setVisitId(e.target.value)} placeholder="غير مرتبط بزيارة">
            {visits.map(v => (
              <option key={v.id} value={v.id}>{fmtDate(v.visit_date)}{v.reason ? ` — ${v.reason}` : ''}</option>
            ))}
          </Select>
        </Field>
        <Field label="وصف / ملاحظة (اختياري)">
          <TextArea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="مثال: صورة دم كاملة — النتيجة طبيعية" />
        </Field>
      </div>

      {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Btn variant="ghost" size="lg" onClick={onClose} disabled={busy}>إلغاء</Btn>
        <Btn size="lg" icon="upload" disabled={!files.length || busy} onClick={upload} style={{ flex: 1 }}>
          {busy ? `جارِ الرفع… (${progress}/${files.length})` : `رفع ${files.length || ''} ملف`}
        </Btn>
      </div>
    </ModalShell>
  );
}

// ---------- viewer ----------
function ViewerModal({ attachment, onClose }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  const meta = attachmentCategoryMeta(attachment.category);

  useEffect(() => {
    let cancelled = false;
    // Ten minutes: long enough to read a report without the link going stale mid-view.
    getMedicalFileUrl(attachment.storage_path, { expiresIn: 600 })
      .then(u => { if (!cancelled) setUrl(u); })
      .catch(e => { if (!cancelled) setError(e.message || 'تعذّر فتح الملف.'); });
    return () => { cancelled = true; };
  }, [attachment.storage_path]);

  const download = async () => {
    try {
      const u = await getMedicalFileUrl(attachment.storage_path, { download: attachment.file_name });
      if (u) window.open(u, '_blank', 'noopener');
    } catch (e) {
      setError(e.message || 'تعذّر تحميل الملف.');
    }
  };

  return (
    <ModalShell
      title={attachment.file_name}
      sub={[meta.label, fmtDateTime(attachment.created_at), attachment.uploaded_by_name].filter(Boolean).join(' · ')}
      onClose={onClose}
      width={780}
    >
      <ErrorNote>{error}</ErrorNote>

      {attachment.description && (
        <div style={{ marginBottom: 14 }}><Alert tone="info">{attachment.description}</Alert></div>
      )}

      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
        {!url && !error && <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ فتح الملف…</div>}
        {url && isImageAttachment(attachment) && (
          <img src={url} alt={attachment.file_name} style={{ maxWidth: '100%', maxHeight: '65vh', display: 'block' }} />
        )}
        {url && isPdfAttachment(attachment) && (
          <iframe src={url} title={attachment.file_name} style={{ width: '100%', height: '65vh', border: 'none', background: '#fff' }} />
        )}
        {url && !isImageAttachment(attachment) && !isPdfAttachment(attachment) && (
          <EmptyState icon="file" title="لا يمكن معاينة هذا النوع داخل النظام" sub="حمّل الملف لفتحه بالتطبيق المناسب على جهازك." />
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Btn icon="download" onClick={download}>تحميل الملف</Btn>
        {url && <Btn variant="ghost" icon="external-link" onClick={() => window.open(url, '_blank', 'noopener')}>فتح في تبويب جديد</Btn>}
        <Btn variant="ghost" onClick={onClose} style={{ marginInlineStart: 'auto' }}>إغلاق</Btn>
      </div>
    </ModalShell>
  );
}

// ---------- edit metadata ----------
function EditModal({ attachment, visits, onClose, onSaved }) {
  const [category, setCategory] = useState(attachment.category);
  const [description, setDescription] = useState(attachment.description ?? '');
  const [visitId, setVisitId] = useState(attachment.visit_id ?? '');
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await updateAttachment(attachment.id, { category, description: description.trim(), visitId: visitId || null });
      onSaved(saved, 'تم حفظ بيانات الملف.');
    } catch (e) {
      setError(e.message || 'تعذّر حفظ التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  const replace = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setError('حجم الملف أكبر من 10 ميجابايت.'); return; }
    setReplacing(true);
    setError('');
    try {
      const saved = await replaceAttachmentFile(attachment, file);
      onSaved(saved, 'تم استبدال الملف.');
    } catch (err) {
      setError(err.message || 'تعذّر استبدال الملف.');
    } finally {
      setReplacing(false);
    }
  };

  return (
    <ModalShell title="تفاصيل الملف" sub={attachment.file_name} onClose={onClose} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 13, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', fontSize: 12.5, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <Icon name="info" size={15} color="var(--text-muted)" />
          {[attachment.file_type || 'ملف', fmtFileSize(attachment.file_size), `رُفع ${fmtDateTime(attachment.created_at)}`, attachment.uploaded_by_name && `بواسطة ${attachment.uploaded_by_name}`].filter(Boolean).join(' · ')}
        </div>

        <Field label="التصنيف">
          <Select value={category} onChange={e => setCategory(e.target.value)}>
            {ATTACHMENT_CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select>
        </Field>

        <Field label="الزيارة المرتبطة" hint="يظهر الملف داخل تفاصيل هذه الزيارة">
          <Select value={visitId} onChange={e => setVisitId(e.target.value)} placeholder="غير مرتبط بزيارة">
            {visits.map(v => (
              <option key={v.id} value={v.id}>{fmtDate(v.visit_date)}{v.reason ? ` — ${v.reason}` : ''}</option>
            ))}
          </Select>
        </Field>

        <Field label="وصف / ملاحظة">
          <TextArea rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', padding: '9px 14px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: replacing ? 'not-allowed' : 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-body)', opacity: replacing ? 0.5 : 1 }}>
          <Icon name="refresh-cw" size={14} />
          {replacing ? 'جارِ الاستبدال…' : 'استبدال الملف نفسه'}
          <input type="file" accept={ACCEPT} onChange={replace} disabled={replacing} style={{ display: 'none' }} />
        </label>
      </div>

      {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Btn variant="ghost" size="lg" onClick={onClose}>إلغاء</Btn>
        <Btn size="lg" disabled={saving || replacing} onClick={save} style={{ flex: 1 }}>{saving ? 'جارِ الحفظ…' : 'حفظ'}</Btn>
      </div>
    </ModalShell>
  );
}

// ---------- one file card ----------
function AttachmentCard({ attachment, thumb, canManage, onOpen, onEdit, onDelete }) {
  const meta = attachmentCategoryMeta(attachment.category);
  const isImage = isImageAttachment(attachment);
  return (
    <div style={{ borderRadius: 16, border: '1px solid var(--border-subtle)', background: 'var(--white)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={onOpen}
        title="معاينة الملف"
        style={{ border: 'none', padding: 0, cursor: 'pointer', background: 'var(--surface-sunken)', height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        {isImage && thumb
          ? <img src={thumb} alt={attachment.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Ring2 icon={isPdfAttachment(attachment) ? 'file-text' : meta.icon} tone={meta.tone} size={48} />}
      </button>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: meta.tone, background: `color-mix(in srgb, ${meta.tone} 12%, white)`, padding: '3px 9px', borderRadius: 999 }}>
            <Icon name={meta.icon} size={11} color={meta.tone} />{meta.label}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fmtDate(attachment.created_at)}</span>
        </div>

        <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--text-strong)', wordBreak: 'break-all', lineHeight: 1.5 }}>{attachment.file_name}</div>

        {attachment.description && (
          <div style={{ fontSize: 12, color: 'var(--text-body)', lineHeight: 1.6 }}>{attachment.description}</div>
        )}

        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {[fmtFileSize(attachment.file_size), attachment.uploaded_by_name].filter(Boolean).join(' · ')}
        </div>

        {attachment.visitDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--teal-700)' }}>
            <Icon name="link" size={12} color="var(--teal-700)" />
            زيارة {fmtDate(attachment.visitDate)}{attachment.visitReason ? ` — ${attachment.visitReason}` : ''}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
          <Btn size="sm" variant="soft" icon="eye" onClick={onOpen} style={{ flex: 1 }}>معاينة</Btn>
          {canManage && <IconBtn icon="pencil" size={32} title="تفاصيل / استبدال" onClick={onEdit} />}
          {canManage && <IconBtn icon="trash-2" size={32} tone="var(--red-500)" title="حذف الملف" onClick={onDelete} />}
        </div>
      </div>
    </div>
  );
}

// ---------- section ----------
export default function PatientAttachments({ patientId, attachments = [], visits = [], canManage, onChanged }) {
  const [filter, setFilter] = useState('all');
  const [thumbs, setThumbs] = useState({});
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(''), 3000);
    return () => clearTimeout(id);
  }, [flash]);

  // One signed-URL request for every image on screen, rather than one per card.
  const imagePaths = useMemo(
    () => attachments.filter(isImageAttachment).map(a => a.storage_path),
    [attachments],
  );

  useEffect(() => {
    let cancelled = false;
    if (!imagePaths.length) { setThumbs({}); return; }
    getMedicalFileUrls(imagePaths).then(map => { if (!cancelled) setThumbs(map); });
    return () => { cancelled = true; };
  }, [imagePaths.join('|')]);

  const counts = useMemo(() => {
    const out = {};
    for (const a of attachments) {
      const id = attachmentCategoryMeta(a.category).id;
      out[id] = (out[id] ?? 0) + 1;
    }
    return out;
  }, [attachments]);

  // Groups keep ATTACHMENT_CATEGORIES' order (تحليل → أشعة → تقرير → …) and each
  // group is newest-first, which is the order a doctor scans them in.
  const groups = useMemo(() => {
    const visible = filter === 'all' ? attachments : attachments.filter(a => attachmentCategoryMeta(a.category).id === filter);
    return ATTACHMENT_CATEGORIES
      .map(([id, label]) => ({
        id, label,
        items: visible
          .filter(a => attachmentCategoryMeta(a.category).id === id)
          .sort((x, y) => (y.created_at || '').localeCompare(x.created_at || '')),
      }))
      .filter(g => g.items.length);
  }, [attachments, filter]);

  const afterChange = useCallback(async (message, opts = {}) => {
    setUploading(false); setEditing(null); setRemoving(null);
    if (message) setFlash(message);
    if (!opts.skipReload) await onChanged?.();
  }, [onChanged]);

  const handleDelete = async () => {
    setRemoveBusy(true);
    setError('');
    try {
      await deleteAttachment(removing);
      await afterChange('تم حذف الملف.');
    } catch (e) {
      setError(e.message || 'تعذّر حذف الملف.');
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <div>
      <ErrorNote>{error}</ErrorNote>
      {flash && <div style={{ marginBottom: 14 }}><Alert tone="success">{flash}</Alert></div>}

      <Card2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>التحاليل والأشعة والمرفقات الطبية</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {attachments.length ? `${attachments.length} ملف · مرتبة حسب التاريخ` : 'صور التحاليل والأشعة والتقارير وملفات PDF'}
            </div>
          </div>
          {canManage && (
            <div style={{ marginInlineStart: 'auto' }}>
              <Btn icon="upload" onClick={() => setUploading(true)}>رفع ملف</Btn>
            </div>
          )}
        </div>

        {attachments.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <CategoryFilter value={filter} onChange={setFilter} counts={counts} />
          </div>
        )}

        {attachments.length === 0 && (
          <EmptyState
            icon="paperclip"
            title="لا توجد مرفقات بعد"
            sub="ارفع صور التحاليل والأشعة والتقارير الطبية هنا — أو أرفقها أثناء الكشف وستظهر تلقائياً."
            action={canManage ? <Btn icon="upload" onClick={() => setUploading(true)}>رفع ملف</Btn> : null}
          />
        )}

        {attachments.length > 0 && groups.length === 0 && (
          <EmptyState icon="paperclip" title="لا توجد ملفات في هذا التصنيف" sub="جرّب تصنيفاً آخر." />
        )}

        {groups.map(g => (
          <div key={g.id} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name={attachmentCategoryMeta(g.id).icon} size={16} color={attachmentCategoryMeta(g.id).tone} />
              <span style={{ fontFamily: font, fontWeight: 800, fontSize: 14.5, color: 'var(--text-strong)' }}>{g.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({g.items.length})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
              {g.items.map(a => (
                <AttachmentCard
                  key={a.id}
                  attachment={a}
                  thumb={thumbs[a.storage_path]}
                  canManage={canManage}
                  onOpen={() => setViewing(a)}
                  onEdit={() => setEditing(a)}
                  onDelete={() => setRemoving(a)}
                />
              ))}
            </div>
          </div>
        ))}
      </Card2>

      {uploading && (
        <UploadModal
          patientId={patientId}
          visits={visits}
          onClose={() => setUploading(false)}
          onDone={(msg, opts) => afterChange(msg, opts)}
        />
      )}

      {viewing && <ViewerModal attachment={viewing} onClose={() => setViewing(null)} />}

      {editing && (
        <EditModal
          attachment={editing}
          visits={visits}
          onClose={() => setEditing(null)}
          onSaved={(_, msg) => afterChange(msg)}
        />
      )}

      {removing && (
        <ModalShell title="حذف الملف" sub={removing.file_name} onClose={() => setRemoving(null)} width={460}>
          <ConfirmBox
            message="سيُحذف الملف نهائياً من السجل الطبي ومن التخزين، ولا يمكن التراجع. متأكد؟"
            confirmLabel="حذف نهائي"
            busy={removeBusy}
            onConfirm={handleDelete}
            onCancel={() => setRemoving(null)}
          />
        </ModalShell>
      )}
    </div>
  );
}
