import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceCommentSection } from '../components/VoiceCommentSection';

type AlertPayload = { message?: string };

const Harness = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failNextSubmit, setFailNextSubmit] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [lastDurationSeconds, setLastDurationSeconds] = useState<number | null>(null);
  const [lastAlertMessage, setLastAlertMessage] = useState('');

  useEffect(() => {
    const onAlert = (event: Event) => {
      const custom = event as CustomEvent<AlertPayload>;
      setLastAlertMessage(custom.detail?.message ?? '');
    };
    window.addEventListener('mimi:registry_alert', onAlert as EventListener);
    return () => window.removeEventListener('mimi:registry_alert', onAlert as EventListener);
  }, []);

  const status = useMemo(() => (failNextSubmit ? 'failure-armed' : 'normal'), [failNextSubmit]);

  const onSubmit = async (_blob: Blob, durationSeconds: number) => {
    setIsSubmitting(true);
    setLastDurationSeconds(durationSeconds);
    await new Promise((resolve) => setTimeout(resolve, 120));

    if (failNextSubmit) {
      setFailNextSubmit(false);
      setIsSubmitting(false);
      throw new Error('SIMULATED_UPLOAD_FAILURE');
    }

    setSubmitCount((value) => value + 1);
    setIsSubmitting(false);
  };

  return (
    <main style={{ padding: 20, maxWidth: 760, margin: '0 auto', fontFamily: 'monospace' }}>
      <h1>Voice Memo Audio Lifecycle Harness</h1>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button data-testid="arm-upload-failure" onClick={() => setFailNextSubmit(true)}>
          Arm upload failure
        </button>
        <button
          data-testid="fail-playback-once"
          onClick={() => {
            (window as any).__mimiFailPlaybackOnce = true;
          }}
        >
          Fail playback once
        </button>
      </div>

      <div style={{ border: '1px solid #777', padding: 12, marginBottom: 16 }}>
        <VoiceCommentSection onSubmit={onSubmit} isSubmitting={isSubmitting} />
      </div>

      <div style={{ border: '1px dashed #777', padding: 12 }}>
        <p data-testid="harness-mode">mode: {status}</p>
        <p data-testid="submit-count">submit-count: {submitCount}</p>
        <p data-testid="last-duration-seconds">last-duration-seconds: {lastDurationSeconds ?? 'none'}</p>
        <p data-testid="last-alert">last-alert: {lastAlertMessage || 'none'}</p>
      </div>
    </main>
  );
};

const container = document.getElementById('root');
if (!container) {
  throw new Error('Harness root not found');
}

createRoot(container).render(<Harness />);
