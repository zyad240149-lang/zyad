import { useState, useEffect } from 'react';

const { Icon, Button } = window.MeaadDesignSystem_54b82a;
const font = 'var(--font-display)';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * "ثبّت التطبيق" control.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt`, which we hold onto and replay on
 * click — that deferred event is the only way to open the native install sheet.
 * Safari/iOS never fires it and has no programmatic install, so there we show the
 * manual Share → Add to Home Screen steps instead.
 *
 * Renders nothing once the app is already installed.
 */
export default function InstallApp({ variant = 'primary', size = 'sm', block = false }) {
  // Seeded from the stash in index.html: the browser usually fires
  // beforeinstallprompt before React has mounted, so waiting for the event here
  // alone would miss it and the button would never appear.
  const [prompt, setPrompt] = useState(() => window.__meaadInstallPrompt ?? null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onBeforeInstall = e => {
      e.preventDefault(); // stop Chrome's own mini-infobar; we drive the UI
      setPrompt(e);
    };
    const onStashed = () => setPrompt(window.__meaadInstallPrompt ?? null);
    const onInstalled = () => { setInstalled(true); setPrompt(null); window.__meaadInstallPrompt = null; };

    // Both paths are needed: the custom event covers a prompt captured before mount,
    // the native one covers a prompt Chrome fires later (eligibility can change).
    window.addEventListener('meaad:installable', onStashed);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Covers the case where the user launches the installed app in an already-open tab.
    const mq = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = e => setInstalled(e.matches);
    mq.addEventListener?.('change', onDisplayChange);

    return () => {
      window.removeEventListener('meaad:installable', onStashed);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  if (installed) return null;
  // Nothing to offer: not iOS, and the browser never said the app is installable
  // (unsupported browser, or already installed under a different profile).
  if (!prompt && !isIOS()) return null;

  const install = async () => {
    if (!prompt) { setShowIosHelp(true); return; }
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // The event is single-use — a dismissed prompt can't be replayed, and Chrome
    // will fire a fresh one later if the user becomes eligible again.
    setPrompt(null);
    window.__meaadInstallPrompt = null;
    if (outcome === 'accepted') setInstalled(true);
  };

  return (
    <>
      <Button variant={variant} size={size} block={block} iconStart="download" onClick={install}>
        ثبّت التطبيق
      </Button>

      {showIosHelp && (
        <div
          onClick={() => setShowIosHelp(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(6,60,60,.42)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 340, maxWidth: '100%', background: '#fff', borderRadius: 22, padding: 24, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: 17, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontFamily: font, fontWeight: 900, fontSize: 24 }}>م</div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>ثبّت ميعاد على جهازك</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.9, marginTop: 10 }}>
              من متصفح Safari:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'start', margin: '4px 0 18px' }}>
              {[
                ['share', 'اضغط زر المشاركة تحت'],
                ['plus-square', 'اختر «إضافة إلى الشاشة الرئيسية»'],
                ['check', 'اضغط «إضافة»'],
              ].map(([icon, text], i) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 13, background: 'var(--surface-page)' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, flex: '0 0 auto', background: 'var(--brand-subtle)', color: 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 800, fontSize: 12.5 }}>{i + 1}</span>
                  <Icon name={icon} size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 13.5, color: 'var(--text-body)' }}>{text}</span>
                </div>
              ))}
            </div>
            <Button block onClick={() => setShowIosHelp(false)}>تمام</Button>
          </div>
        </div>
      )}
    </>
  );
}
