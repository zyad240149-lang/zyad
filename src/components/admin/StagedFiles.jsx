// ميعاد — ملفات مُجهَّزة للرفع، قبل أن يوجد سجل تُربط به.
//
// The نافذة إضافة مريض needs files *before* the patient row exists, so nothing can
// be uploaded while the form is open: a file picked here is held in memory, shown as
// a thumbnail, and can be removed with no trace. The parent uploads the survivors
// once it has an id — see uploadStaged() below.
//
// Used for the الأدوية / التحاليل / الأشعة sections, which are all optional: an
// empty list is a valid state and never blocks a save.
import { useEffect, useState } from 'react';
import { MAX_FILE_BYTES, uploadAttachment, fmtFileSize } from '../../lib/api/medical.js';
import { ds, font } from './ui.jsx';

const { Icon } = ds;

const ACCEPT_ALL = 'image/*,application/pdf';
const ACCEPT_IMAGE = 'image/*';

let seq = 0;

/**
 * Validates a picked FileList and turns it into staged entries.
 * Returns { staged, errors } — a file that's too big is reported and skipped rather
 * than failing the whole selection.
 */
export function stageFiles(fileList) {
  const staged = [];
  const errors = [];
  for (const file of fileList) {
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name}: أكبر من ١٠ ميجابايت`);
      continue;
    }
    const isImage = (file.type || '').startsWith('image/');
    staged.push({
      id: `staged-${++seq}`,
      file,
      isImage,
      // Object URLs are revoked in the effect below — without that, previewing a
      // few X-rays would pin them all in memory for the life of the page.
      url: isImage ? URL.createObjectURL(file) : null,
    });
  }
  return { staged, errors };
}

/**
 * Uploads staged files against a patient that now exists.
 * Sequential, and it collects failures instead of throwing: a photo that fails to
 * upload must not undo a patient who was already saved.
 */
export async function uploadStaged(items, patientId, { category, visitId, description } = {}) {
  const failed = [];
  let uploaded = 0;
  for (const item of items) {
    try {
      await uploadAttachment(patientId, item.file, { category, visitId, description });
      uploaded += 1;
    } catch (e) {
      failed.push(`${item.file.name}: ${e.message || 'تعذّر الرفع'}`);
    }
  }
  return { uploaded, failed };
}

/**
 * The picker itself: a camera button, a file button, and a thumbnail strip.
 *
 * `capture="environment"` is what makes 📷 open the rear camera straight away on a
 * phone — the browser handles the permission prompt. On a desktop, where there is no
 * such capture device, the same input degrades to an ordinary file dialog, so the
 * button is still useful rather than broken.
 */
export default function StagedFiles({ items, onChange, disabled, cameraLabel = 'التقاط صورة', fileLabel = 'رفع صورة / ملف' }) {
  const [error, setError] = useState('');

  // Revoke every preview URL this component created, on unmount and whenever an
  // entry leaves the list.
  useEffect(() => () => { items.forEach(i => i.url && URL.revokeObjectURL(i.url)); }, []);

  const pick = e => {
    const picked = [...(e.target.files ?? [])];
    e.target.value = '';   // so picking the same file twice still fires onChange
    if (!picked.length) return;
    const { staged, errors } = stageFiles(picked);
    setError(errors.join(' · '));
    if (staged.length) onChange([...items, ...staged]);
  };

  const remove = item => {
    if (item.url) URL.revokeObjectURL(item.url);
    onChange(items.filter(i => i.id !== item.id));
  };

  const btn = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 999,
    border: '1.5px solid var(--border-default)', background: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-body)',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label style={btn}>
          <Icon name="camera" size={14} />{cameraLabel}
          <input type="file" accept={ACCEPT_IMAGE} capture="environment" onChange={pick} disabled={disabled} style={{ display: 'none' }} />
        </label>
        <label style={btn}>
          <Icon name="paperclip" size={14} />{fileLabel}
          <input type="file" accept={ACCEPT_ALL} multiple onChange={pick} disabled={disabled} style={{ display: 'none' }} />
        </label>
        {items.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            {items.length === 1 ? 'ملف واحد' : `${items.length} ملفات`}
          </span>
        )}
      </div>

      {items.length > 0 && (
        // Wraps rather than scrolls, so a phone shows two per row and a desktop six.
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {items.map(item => (
            <div key={item.id} style={{ position: 'relative', width: 84 }}>
              <div style={{ width: 84, height: 84, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--surface-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.isImage
                  ? <img src={item.url} alt={item.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Icon name="file-text" size={28} color="var(--text-muted)" />}
              </div>
              <button
                onClick={() => remove(item)}
                disabled={disabled}
                title={`حذف ${item.file.name}`}
                aria-label={`حذف ${item.file.name}`}
                style={{ position: 'absolute', insetInlineEnd: -6, top: -6, width: 24, height: 24, borderRadius: '50%', border: '2px solid #fff', background: 'var(--red-500)', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.25)' }}
              >
                <Icon name="x" size={13} color="#fff" />
              </button>
              <div title={item.file.name} style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.file.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtFileSize(item.file.size)}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--red-600)' }}>{error}</div>}
    </div>
  );
}
