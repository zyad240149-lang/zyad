#!/usr/bin/env bash
# ميعاد — نشر البناء إلى استضافة Hostinger عبر SSH.
#
# يعتمد على مضيف مُعرّف في ~/.ssh/config باسم hostinger-meaad ومفتاح
# ~/.ssh/meaad_hostinger. لا يُستخدم أي كلمة مرور: ثبّت المفتاح العام مرة
# واحدة من hPanel ← Advanced ← SSH Access ← Manage SSH keys.
#
#   bash scripts/deploy-hostinger.sh              # يبني ثم ينشر
#   SKIP_BUILD=1 bash scripts/deploy-hostinger.sh # ينشر dist/ الحالي
#   REMOTE_DIR=~/domains/example.com/public_html bash scripts/deploy-hostinger.sh

set -euo pipefail

HOST="${HOST:-hostinger-meaad}"
cd "$(dirname "$0")/.."

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "==> بناء المشروع"
  npm run build
fi

[ -f dist/index.html ] || { echo "خطأ: dist/index.html غير موجود — شغّل npm run build أولًا." >&2; exit 1; }

# .htaccess ملف مخفي يخرج من public/ إلى dist/؛ بدونه تنكسر مسارات الـ SPA.
[ -f dist/.htaccess ] || echo "تحذير: dist/.htaccess مفقود — التنقّل المباشر بين الصفحات سيعطي 404."

echo "==> تحديد مجلد الموقع على الخادم"
REMOTE_DIR="${REMOTE_DIR:-$(ssh "$HOST" '
  if [ -d "$HOME/public_html" ]; then echo "$HOME/public_html"; exit 0; fi
  # حساب Hostinger عادةً يضع كل نطاق تحت domains/<name>/public_html
  set -- "$HOME"/domains/*/public_html
  [ -d "$1" ] && [ "$#" -eq 1 ] && echo "$1"
')}"

[ -n "$REMOTE_DIR" ] || {
  echo "تعذّر تحديد مجلد الموقع تلقائيًا (أكثر من نطاق؟). مرّره يدويًا:" >&2
  echo "  REMOTE_DIR=~/domains/<النطاق>/public_html bash scripts/deploy-hostinger.sh" >&2
  exit 1
}
echo "    $REMOTE_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
TARBALL="$(mktemp -t meaad-deploy-XXXXXX).tar.gz"
trap 'rm -f "$TARBALL"' EXIT

echo "==> تجهيز الحزمة"
tar -czf "$TARBALL" -C dist .

echo "==> الرفع"
scp -q "$TARBALL" "$HOST:/tmp/meaad-$STAMP.tar.gz"

echo "==> التركيب على الخادم"
# نسخة احتياطية من الإصدار الحالي قبل الاستبدال، ثم فك الحزمة فوقه.
ssh "$HOST" "
  set -eu
  DIR='$REMOTE_DIR'
  mkdir -p \"\$DIR\"
  if [ -f \"\$DIR/index.html\" ]; then
    tar -czf \"\$HOME/meaad-backup-$STAMP.tar.gz\" -C \"\$DIR\" . 2>/dev/null || true
  fi
  # حذف بناء سابق فقط — أي شيء آخر وضعه المستخدم في public_html يبقى.
  rm -rf \"\$DIR/assets\"
  tar -xzf /tmp/meaad-$STAMP.tar.gz -C \"\$DIR\"
  rm -f /tmp/meaad-$STAMP.tar.gz
  # الاحتفاظ بآخر ثلاث نسخ احتياطية فقط.
  ls -1t \"\$HOME\"/meaad-backup-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
"

echo "==> تم النشر ✅  (نسخة احتياطية: ~/meaad-backup-$STAMP.tar.gz)"
