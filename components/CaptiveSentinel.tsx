// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Folder, ExternalLink, Copy, Check, X } from 'lucide-react';

// Manila dossier palette — spy × folder motif; light blue is house Accent C.
const MANILA = {
  tab: 'var(--mimi-manila-tab, #E8DCB5)',
  body: 'var(--mimi-manila-body, #F0E6C8)',
  bodyEdge: 'var(--mimi-manila-edge, #C9BA86)',
  sheet: 'var(--mimi-manila-sheet, #F7F3E8)',
  sheetEdge: 'var(--mimi-manila-edge, #D8CBA0)',
  ink: '#232018',
  inkSoft: '#3A352A',
  label: '#8A7F5C',
  labelStrong: 'var(--mimi-manila-ink, #5C5334)',
  stamp: '#8B2E2E',
  signal: 'var(--mimi-cobalt, #9BB8CE)',
  signalDeep: 'var(--mimi-cobalt-deep, #6A8AA4)',
};

const detectSource = () => {
  if (typeof navigator === 'undefined') return 'In-App Browser';
  const ua = (navigator.userAgent || '').toLowerCase();
  if (/instagram/.test(ua)) return 'Instagram In-App Browser';
  if (/fban|fbav|fb_iab/.test(ua)) return 'Facebook In-App Browser';
  if (/tiktok/.test(ua)) return 'TikTok In-App Browser';
  if (/threads/.test(ua)) return 'Threads In-App Browser';
  if (/snapchat/.test(ua)) return 'Snapchat In-App Browser';
  if (/line/.test(ua)) return 'LINE In-App Browser';
  return 'In-App Browser';
};

export const CaptiveSentinel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const [meta] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      source: detectSource(),
      caseNo: `IAB-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`,
      filed: `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  });

  const handleCopy = () => {
    navigator.clipboard?.writeText(currentUrl).catch((e) => console.error('[v0] Clipboard error', e));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenBrowser = () => {
    try {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('[v0] Open in browser failed', e);
    }
  };

  const metaRows = [
    { label: 'Detected Source', value: meta.source },
    { label: 'Environment', value: 'Sandboxed Webview' },
    { label: 'Render Fidelity', value: 'Reduced' },
    { label: 'Filed', value: meta.filed },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[20000] flex items-center justify-center p-5 bg-nous-base/90 backdrop-blur-md overflow-y-auto"
    >
      {/* Dismiss */}
      <button
        onClick={onClose}
        aria-label="Dismiss field report"
        className="fixed top-5 right-5 z-[20003] w-11 h-11 rounded-full bg-nous-base border border-nous-border flex items-center justify-center text-nous-subtle hover:text-nous-text active:scale-90 transition-all"
      >
        <X size={18} />
      </button>

      <motion.div
        initial={{ y: 26, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative w-full max-w-sm md:max-w-md my-16"
      >
        {/* Folder tab */}
        <div className="flex items-end pl-7">
          <div
            className="relative -mb-px px-5 pt-2.5 pb-3 rounded-t-md"
            style={{ background: MANILA.tab }}
          >
            <span
              className="font-mono text-[9px] uppercase tracking-[0.3em] font-black"
              style={{ color: MANILA.labelStrong }}
            >
              Mimi // Field Ops
            </span>
          </div>
        </div>

        {/* Folder body */}
        <div
          className="relative rounded-b-md rounded-tr-md border shadow-2xl"
          style={{ background: MANILA.body, borderColor: MANILA.bodyEdge }}
        >
          <div className="p-5 md:p-7 space-y-5">
            {/* Classification row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2" style={{ color: MANILA.labelStrong }}>
                <Folder size={14} strokeWidth={2} />
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] font-black">
                  Field Report
                </span>
              </div>
              <span
                className="font-mono text-[8px] uppercase tracking-[0.2em] font-black px-2 py-1 border"
                style={{ color: MANILA.signalDeep, borderColor: MANILA.signal }}
              >
                Restricted
              </span>
            </div>

            {/* Inner document sheet */}
            <div
              className="paper-texture relative border"
              style={{ background: MANILA.sheet, borderColor: MANILA.sheetEdge }}
            >
              {/* Angled stamp — light-blue signal accent on manila sheet */}
              <div
                className="absolute right-3 top-3 -rotate-6 border-2 px-2 py-1 opacity-90 pointer-events-none"
                style={{ color: MANILA.signalDeep, borderColor: MANILA.signal }}
              >
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] font-black">
                  In-App Capture
                </span>
              </div>

              <div className="p-5 md:p-6 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <p
                    className="font-mono text-[8px] uppercase tracking-[0.4em] font-bold"
                    style={{ color: MANILA.label }}
                  >
                    Case No. {meta.caseNo}
                  </p>
                  <h2
                    className="font-serif text-3xl md:text-4xl tracking-tight leading-none"
                    style={{ color: MANILA.ink }}
                  >
                    Captive Sentinel
                  </h2>
                </div>

                {/* Metadata grid */}
                <div
                  className="border"
                  style={{ borderColor: MANILA.sheetEdge }}
                >
                  {metaRows.map((row, i) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between px-3 py-2.5"
                      style={{
                        borderTop: i === 0 ? 'none' : `1px solid ${MANILA.sheetEdge}`,
                      }}
                    >
                      <span
                        className="font-mono text-[8px] uppercase tracking-[0.2em] font-bold"
                        style={{ color: MANILA.label }}
                      >
                        {row.label}
                      </span>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.08em] font-black text-right"
                        style={{ color: MANILA.ink }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notice body */}
                <p className="font-serif text-[15px] leading-relaxed" style={{ color: MANILA.inkSoft }}>
                  This session opened inside{' '}
                  <span className="font-semibold italic">{meta.source}</span>. Mimi renders
                  high-fidelity embeddings and experimental features that the in-app sandbox
                  restricts. Continue in your system browser to restore full resolution.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleOpenBrowser}
                className="w-full py-4 flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] font-black transition-all active:scale-[0.98]"
                style={{ background: MANILA.ink, color: MANILA.sheet }}
              >
                <ExternalLink size={15} /> Open in Browser
              </button>
              <button
                onClick={handleCopy}
                className="w-full py-4 flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] font-black border transition-all active:scale-[0.98]"
                style={{ color: MANILA.ink, borderColor: MANILA.ink, background: 'transparent' }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Link Copied' : 'Copy Link'}
              </button>
              <p
                className="text-center font-mono text-[8px] uppercase tracking-[0.15em] leading-relaxed pt-1"
                style={{ color: MANILA.label }}
              >
                If nothing opens, tap the ⋯ menu and choose &quot;Open in Browser&quot;.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
