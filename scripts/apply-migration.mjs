// ميعاد — applies a migration to the linked Supabase project.
//
// Why this exists: the SQL Editor works fine, but copy/paste across a chat window
// is easy to get wrong. This does the same thing with one command.
//
//   node scripts/apply-migration.mjs
//   node scripts/apply-migration.mjs supabase/migrations/0004_...sql
//
// The access token is read from the SUPABASE_ACCESS_TOKEN environment variable, or
// typed at a hidden prompt. Either way it stays on this machine: it is never
// written to a file, never printed, and never sent anywhere except api.supabase.com.
//
// Create a token at https://supabase.com/dashboard/account/tokens — and revoke it
// again afterwards if it was only needed for this.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const PROJECT_REF = 'dcnveaunbehtsimewgoa';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

// 0005 builds on 0004 — run 0004 first if this is a fresh project:
//   node scripts/apply-migration.mjs supabase/migrations/0004_inventory_and_medical_records.sql
const DEFAULT_MIGRATION = 'supabase/migrations/0005_inventory_expiry_and_patient_files.sql';

// Tables 0004 + 0005 are expected to leave behind, used for the check at the end.
const EXPECTED = [
  'patients', 'visits', 'prescriptions', 'prescription_items',
  'lab_requests', 'radiology_records', 'inventory_products', 'inventory_transactions',
  'patient_medical_history', 'patient_attachments',
];

/** Reads a secret from the terminal without echoing it. */
function promptHidden(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = char => {
      // Re-print the prompt with nothing after it, so the token never appears.
      if (!['\n', '\r', ''].includes(char.toString('utf8'))) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(question);
      }
    };
    process.stdin.on('data', onData);
    rl.question(question, answer => {
      process.stdin.removeListener('data', onData);
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function runSql(token, sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const file = process.argv[2] || DEFAULT_MIGRATION;
  const full = path.resolve(file);

  if (!fs.existsSync(full)) {
    console.error(`✗ الملف غير موجود: ${full}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(full, 'utf8');
  console.log(`الملف   : ${file}`);
  console.log(`الحجم   : ${sql.length} حرف`);
  console.log(`المشروع : ${PROJECT_REF}\n`);

  let token = process.env.SUPABASE_ACCESS_TOKEN;
  if (token) {
    console.log('التوكن  : من متغيّر البيئة SUPABASE_ACCESS_TOKEN\n');
  } else {
    console.log('أنشئ توكن من https://supabase.com/dashboard/account/tokens');
    console.log('(لن يظهر على الشاشة أثناء الكتابة، ولن يُحفظ في أي ملف)\n');
    token = await promptHidden('الصق التوكن ثم اضغط Enter: ');
  }

  if (!token || !token.startsWith('sbp_')) {
    console.error('\n✗ التوكن غير صحيح — المفروض يبدأ بـ sbp_');
    process.exit(1);
  }

  console.log('\n… جارِ تنفيذ الـ migration');
  const result = await runSql(token, sql);

  if (!result.ok) {
    console.error(`\n✗ فشل التنفيذ (HTTP ${result.status})`);
    console.error(typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2));
    if (result.status === 401) console.error('\nالتوكن مرفوض — تأكد أنه صالح ولم يُلغَ.');
    process.exit(1);
  }

  console.log('✓ تم تنفيذ الـ migration\n');

  // Verify rather than trust: ask the database which tables actually exist now.
  const check = await runSql(token, `
    select table_name from information_schema.tables
     where table_schema = 'public'
       and table_name in (${EXPECTED.map(t => `'${t}'`).join(', ')})
     order by table_name;
  `);

  const found = Array.isArray(check.body) ? check.body.map(r => r.table_name) : [];
  console.log('التحقق من الجداول:');
  for (const t of EXPECTED) {
    console.log(`  ${found.includes(t) ? '✓' : '✗'}  ${t}`);
  }
  console.log(`\n${found.length}/${EXPECTED.length} جدول موجود`);

  if (found.length === EXPECTED.length) {
    console.log('\nتمام — قاعدة البيانات جاهزة.');
    console.log('لو أنشأت التوكن لهذه المرة فقط، ألغِه الآن من:');
    console.log('https://supabase.com/dashboard/account/tokens');
  } else {
    console.log('\nبعض الجداول ناقصة — راجع رسالة الخطأ أعلاه.');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n✗ خطأ غير متوقع:', e.message);
  process.exit(1);
});
