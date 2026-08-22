// Generates the "what is this project" brief the assistant carries in its system
// prompt. Run it after schema or structure changes so the assistant's answers about
// the code stay true:  npm run build:context
//
// Everything here is derived from the repo itself rather than hand-written, so the
// brief can't quietly drift out of date the way a maintained-by-hand doc would.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'supabase', 'functions', 'chat', 'project-context.ts');

const IGNORE = new Set(['node_modules', '.git', 'dist', '_ds', 'public', 'story']);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry) || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(jsx?|sql)$/.test(entry)) acc.push(relative(root, full).replace(/\\/g, '/'));
  }
  return acc;
}

/** One line per file: path, size, and its exported names — enough to answer "where does X live?". */
function describe(file) {
  const src = readFileSync(join(root, file), 'utf8');
  const lines = src.split('\n').length;
  const exports = [...src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+(\w+)/g)]
    .map(m => m[1]);
  return `- \`${file}\` (${lines} سطر)${exports.length ? ` — يصدّر: ${exports.join(', ')}` : ''}`;
}

/** Pull table + policy names straight out of the migrations so the schema section is real. */
function schema() {
  const dir = join(root, 'supabase', 'migrations');
  const sql = readdirSync(dir).sort().map(f => readFileSync(join(dir, f), 'utf8')).join('\n');

  const tables = [...sql.matchAll(/create table if not exists (\w+)\s*\(([\s\S]*?)\n\);/g)].map(([, name, body]) => {
    const cols = body
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('--') && !/^(primary key|constraint|unique)/i.test(l))
      .map(l => l.replace(/,$/, ''));
    return `### ${name}\n${cols.map(c => `  - ${c}`).join('\n')}`;
  });

  const policies = [...sql.matchAll(/create policy "([^"]+)" on (\w+)\s+for (\w+)\s+(?:using|with check)\s*\(([^;]+?)\);/g)]
    .map(([, name, table, cmd, expr]) => `- \`${table}\` — ${name} (${cmd.toUpperCase()}): \`${expr.replace(/\s+/g, ' ').trim()}\``);

  const funcs = [...sql.matchAll(/create or replace function (\w+)\(/g)].map(m => `- \`${m[1]}()\``);

  return { tables, policies, funcs };
}

const files = walk(join(root, 'src')).concat(walk(join(root, 'supabase')));
const { tables, policies, funcs } = schema();

const context = `# مشروع ميعاد — سياق تقني

منصة حجز مواعيد عيادات، عربية بالكامل واتجاه RTL. تطبيق React (Vite) ثابت
بالكامل — **مفيش backend خاص به**؛ المتصفح بيتكلم مع Supabase مباشرة، والحماية
معتمدة كليًا على Row Level Security.

## الواجهات
- **تطبيق العميل** — صفحة هبوط، تسجيل/دخول، حجز موعد، صفحة حساب.
- **لوحة الإدارة** (\`src/components/Admin.jsx\`) — مواعيد، مواعيد متاحة، عملاء،
  تذكيرات، حسابات، موظفون، صلاحيات.

## المصادقة
دخول برقم هاتف مصري + كلمة مرور، أو Google OAuth. الأرقام بتتخزّن بصيغة
\`20xxxxxxxxxx\`. \`src/lib/auth/AuthContext.jsx\` بيتولى الجلسة، و
\`ProtectedRoute\` بيحرس المسارات (\`staffOnly\` للوحة الإدارة).

## نموذج الصلاحيات
دالة \`is_staff()\` بترجع true لأي دور مش \`customer\`، وكل سياسات الكتابة معتمدة
عليها. جدول \`role_permissions\` بيتقري عشان يرسم مصفوفة الصلاحيات في الواجهة بس،
**وما بيتقريش قبل تنفيذ أي إجراء** — يعني المصفوفة حاليًا ديكور.

## جداول قاعدة البيانات

${tables.join('\n\n')}

## سياسات RLS

${policies.join('\n')}

## دوال قاعدة البيانات

${funcs.join('\n')}

## ملفات المشروع

${files.map(describe).join('\n')}

## مشاكل معروفة (من تدقيق ١٥ أغسطس ٢٠٢٦)

لو حد سأل عن أمان المشروع أو عيوبه، دي النتائج الموثّقة — اذكرها بصراحة:

1. **حرجة — تصعيد صلاحيات:** سياسة \`profiles_update_own\` مكتوبة بـ USING من غير
   WITH CHECK، فأي عميل يقدر يعمل UPDATE على صفه ويحط \`role = 'owner'\`. مُثبتة
   عمليًا داخل transaction اتعمله rollback.
2. **حرجة — أكواد OTP تجريبية:** إعداد \`sms_test_otp\` فيه أرقام بأكواد ثابتة
   صالحة لحد يناير ٢٠٢٧، من ضمنها رقم حساب بدور \`owner\`. أي حد يقدر ياخد الحساب
   من صفحة استعادة كلمة المرور.
3. **عالية — مصفوفة الصلاحيات ديكور:** \`is_staff()\` بتساوي كل الأدوار، ودور
   «مشاهد» عنده صلاحيات المدير كاملة.
4. **عالية — مفيش منع تعارض حجوزات:** مفيش UNIQUE index على
   \`(doctor_id, appointment_date, appointment_time)\`. المنع في الواجهة فقط.
5. **عالية — العميل يحدد سعره:** سياسات \`appointments\` مالهاش WITH CHECK على
   \`price\`/\`status\`.
6. **متوسطة:** \`is_staff()\` من غير \`search_path\` ثابت؛ كلمة المرور ٦ أحرف؛
   مفيش CAPTCHA مع Twilio؛ \`redirect\` غير مُتحقق.
7. **التذكيرات غير منفّذة:** جدول \`reminders\` موجود لكن مفيش كود بيكتب فيه، ومفيش
   Edge Function ولا cron. تبويب التذكيرات بيعرض بيانات ثابتة من \`src/data.js\`.
8. **أخطاء:** تعديل الموعد بيمسح \`price\`؛ البريد في الملف الشخصي ما بيتحفظش؛
   قنوات التذكير ما بتتحفظش.
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `// AUTO-GENERATED by scripts/build-project-context.mjs — do not edit by hand.\nexport const PROJECT_CONTEXT = ${JSON.stringify(context)};\n`);

const approxTokens = Math.round(context.length / 3.2);
console.log(`wrote ${relative(root, out)} — ${context.length} chars (~${approxTokens} tokens), ${files.length} files, ${tables.length} tables, ${policies.length} policies`);
