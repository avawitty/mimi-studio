import { test, expect, type Page } from '@playwright/test';

const waitForVoiceReady = async (page: Page) => {
  await expect(page.getByTestId('voice-memo-status')).toHaveText('Ready');
};

const recordMemo = async (page: Page) => {
  await page.getByTestId('voice-memo-record').click();
  await expect(page.getByTestId('voice-memo-stop')).toBeVisible();
  await page.getByTestId('voice-memo-stop').click();
  await waitForVoiceReady(page);
};

test.describe('Voice memo audio lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__mimiFailPlaybackOnce = false;

      const tracker = {
        created: [] as string[],
        revoked: [] as string[],
      };
      (window as any).__mimiBlobUrlTracker = tracker;

      const originalCreate = URL.createObjectURL.bind(URL);
      const originalRevoke = URL.revokeObjectURL.bind(URL);

      URL.createObjectURL = (value: Blob | MediaSource) => {
        const url = originalCreate(value);
        tracker.created.push(url);
        return url;
      };

      URL.revokeObjectURL = (url: string) => {
        tracker.revoked.push(url);
        originalRevoke(url);
      };

      const originalPlay = HTMLMediaElement.prototype.play;
      (window as any).__mimiAudioCalls = { play: 0, pause: 0 };
      HTMLMediaElement.prototype.play = function playPatched() {
        (window as any).__mimiAudioCalls.play += 1;
        if ((window as any).__mimiFailPlaybackOnce) {
          (window as any).__mimiFailPlaybackOnce = false;
          return Promise.reject(new Error('SIMULATED_PLAYBACK_BLOCK'));
        }
        return Promise.resolve();
      };

      HTMLMediaElement.prototype.pause = function pausePatched() {
        (window as any).__mimiAudioCalls.pause += 1;
      };

      class FakeMediaRecorder {
        static isTypeSupported() {
          return true;
        }

        mimeType = 'audio/webm';
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;

        start() {
          // no-op
        }

        stop() {
          const blob = new Blob([`memo-${Date.now()}`], { type: this.mimeType });
          this.ondataavailable?.({ data: blob });
          this.onstop?.();
        }
      }

      (window as any).MediaRecorder = FakeMediaRecorder;
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => ({
            getTracks: () => [{ stop: () => {} }],
          }),
        },
      });

      (window as any).__mimiRestorePlay = () => {
        HTMLMediaElement.prototype.play = originalPlay;
      };
    });

    await page.goto('/e2e-audio-lifecycle.html');
  });

  test('covers upload, preview, replace, failure, retry, and cleanup', async ({ page }) => {
    await recordMemo(page);

    await page.getByTestId('voice-memo-play-toggle').click();
    await expect(page.getByTestId('voice-memo-play-toggle')).toHaveAttribute('title', 'Pause');
    await page.getByTestId('voice-memo-play-toggle').click();
    const audioCalls = await page.evaluate(() => (window as any).__mimiAudioCalls);
    expect(audioCalls.play).toBeGreaterThan(0);

    const beforeReplace = await page.evaluate(() => {
      const tracker = (window as any).__mimiBlobUrlTracker;
      return {
        created: tracker.created.length,
        revoked: tracker.revoked.length,
      };
    });

    await page.getByTestId('voice-memo-reset').click();
    await expect(page.getByTestId('voice-memo-status')).toHaveText('Idle');
    const callsAfterReset = await page.evaluate(() => (window as any).__mimiAudioCalls);
    expect(callsAfterReset.pause).toBeGreaterThan(0);
    await recordMemo(page);

    const afterReplace = await page.evaluate(() => {
      const tracker = (window as any).__mimiBlobUrlTracker;
      return {
        created: tracker.created.length,
        revoked: tracker.revoked.length,
      };
    });

    expect(afterReplace.created).toBeGreaterThan(beforeReplace.created);
    expect(afterReplace.revoked).toBeGreaterThan(beforeReplace.revoked);

    await page.getByTestId('voice-memo-submit').dblclick();
    await expect(page.getByTestId('voice-memo-status')).toHaveText('Submitted');
    await expect(page.getByTestId('submit-count')).toHaveText('submit-count: 1');

    await page.getByTestId('voice-memo-reset').click();
    await recordMemo(page);

    await page.getByTestId('arm-upload-failure').click();
    await expect(page.getByTestId('harness-mode')).toHaveText('mode: failure-armed');

    await page.getByTestId('voice-memo-submit').click();
    await expect(page.getByTestId('voice-memo-status')).toHaveText('Upload failed');
    await expect(page.getByText('Upload failed. Retry without re-recording.')).toBeVisible();

    await page.getByTestId('voice-memo-submit').click();
    await expect(page.getByTestId('voice-memo-status')).toHaveText('Submitted');
    await expect(page.getByTestId('submit-count')).toHaveText('submit-count: 2');

    await page.getByTestId('fail-playback-once').click();
    await page.getByTestId('voice-memo-play-toggle').click();
    await expect(page.getByTestId('voice-memo-play-toggle')).toBeVisible();

    await page.getByTestId('voice-memo-reset').click();
    await expect(page.getByTestId('voice-memo-status')).toHaveText('Idle');
    await expect(page.getByTestId('voice-memo-record')).toBeVisible();

    const trackerAtEnd = await page.evaluate(() => {
      const tracker = (window as any).__mimiBlobUrlTracker;
      return {
        created: tracker.created.length,
        revoked: tracker.revoked.length,
      };
    });

    expect(trackerAtEnd.created).toBeGreaterThan(0);
    expect(trackerAtEnd.revoked).toBe(trackerAtEnd.created);
  });
});
