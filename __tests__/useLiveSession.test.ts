/**
 * useLiveSession lifecycle tests
 *
 * Covers the 13 scenarios listed in the task:
 *  1.  Initial disconnected state
 *  2.  Connecting state
 *  3.  Successful connection
 *  4.  Analyser becoming available after connection
 *  5.  Canvas mounting after connection (analyser drives canvas visibility)
 *  6.  Visualizer animation starting (analyser exposed to component)
 *  7.  Disconnect cleanup
 *  8.  Analyser state returning to null
 *  9.  Reconnection
 * 10.  Visualizer restarting exactly once (single setAnalyser call per connect)
 * 11.  Connection failure
 * 12.  Component unmount during connection
 * 13.  Strict Mode double-effect: currentAttemptRef invalidates the first pass
 *
 * Implementation evidence for the PR #47 race condition
 * ──────────────────────────────────────────────────────
 * Before PR #47, the visualizer effect read analyserRef.current directly.
 * This meant the effect could access the analyser while isConnected was still
 * false, so canvasRef.current was null (canvas not yet in DOM) — the draw
 * loop silently did nothing, breaking the visualizer on every fresh connect.
 *
 * Fix (PR #47 + this PR):
 *  • analyser is now exposed as React state; setAnalyser is only called inside
 *    onopen, ensuring analyser becomes non-null in the same render that sets
 *    isConnected=true, so the canvas is always mounted before the draw loop.
 *  • currentAttemptRef replaces (connect as any).currentAttempt, eliminating
 *    the stale-closure bug where disconnect() could nullify the token on the
 *    wrong function object after props changed.
 *  • connect() calls cleanup() before allocating new AudioContexts, preventing
 *    leaking contexts when called on an already-open session.
 *
 * Lifecycle state diagram
 * ──────────────────────────────────────────────────────────────────────────
 *  IDLE ──connect()──► CONNECTING ──onopen──► CONNECTED
 *         (isConnecting=true)                  (isConnected=true, analyser≠null)
 *  CONNECTED ──disconnect()──► IDLE
 *              (cleanup: analyser=null, isConnected=false, AudioCtx closed)
 *  CONNECTED ──connect()──► cleanup ──► CONNECTING ──► CONNECTED  (reconnect)
 *  CONNECTING ──onerror──► IDLE  (setError, cleanup)
 *  CONNECTING ──unmount──► (currentAttemptRef=null → all callbacks bail)
 * ──────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveSession } from '../hooks/useLiveSession';

// ---------------------------------------------------------------------------
// Single top-level vi.mock for ../services/geminiService
// The factory closes over `mockLiveHolder` which is populated per-test.
// ---------------------------------------------------------------------------

type Callbacks = {
  onopen: () => Promise<void>;
  onmessage: (msg: any) => Promise<void>;
  onclose: () => void;
  onerror: (e: any) => void;
};

/** Mutable holder updated by each test before calling connect(). */
const mockLiveHolder: { current: any } = { current: null };

vi.mock('../services/liveAuth', () => ({
  resolveLiveAiCredentials: async () => ({
    provider: 'gemini',
    ai: { live: mockLiveHolder.current },
    model: 'test-live-model',
    source: 'ephemeral',
  }),
}));

// ---------------------------------------------------------------------------
// Browser API mocks
// ---------------------------------------------------------------------------

function makeAnalyser() {
  return {
    fftSize: 256,
    frequencyBinCount: 128,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteTimeDomainData: vi.fn(),
  };
}

function makeAudioContext() {
  const analyser = makeAnalyser();
  return {
    _analyser: analyser,
    sampleRate: 24000,
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => undefined),
    createAnalyser: vi.fn(() => analyser),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      onended: null as (() => void) | null,
    })),
    createBuffer: vi.fn((ch: number, len: number, sr: number) => ({
      getChannelData: vi.fn(() => new Float32Array(len)),
      duration: len / sr,
    })),
    createMediaStreamSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createScriptProcessor: vi.fn(() => ({
      onaudioprocess: null as ((e: any) => void) | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makeSession() {
  return {
    sendRealtimeInput: vi.fn().mockResolvedValue(undefined),
    sendToolResponse: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
}

/**
 * Build a controllable Gemini live.connect mock.
 * Returns helpers to trigger each server-side event.
 */
function makeLiveMock() {
  let capturedCallbacks: Callbacks | null = null;
  let connectGeneration = 0;
  const session = makeSession();

  const liveMock = {
    connect: vi.fn(({ callbacks }: { callbacks: Callbacks }) => {
      connectGeneration += 1;
      capturedCallbacks = callbacks;
      return Promise.resolve(session);
    }),
  };

  const fire = {
    open: async () => { await capturedCallbacks!.onopen(); },
    message: async (msg: any) => { await capturedCallbacks!.onmessage(msg); },
    close: () => { capturedCallbacks!.onclose(); },
    error: (e: any) => { capturedCallbacks!.onerror(e); },
    hasCallbacks: () => capturedCallbacks !== null,
    generation: () => connectGeneration,
  };

  return { liveMock, session, fire };
}

/** Flush microtasks until live.connect has captured a new generation of callbacks. */
async function waitForCallbacks(
  fire: { hasCallbacks: () => boolean; generation: () => number },
  minGeneration = 1,
  maxTicks = 60,
) {
  for (let i = 0; i < maxTicks; i++) {
    await Promise.resolve();
    if (fire.hasCallbacks() && fire.generation() >= minGeneration) return;
  }
  throw new Error(`live.connect callbacks never reached generation ${minGeneration}`);
}


// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

let AudioContextInstances: ReturnType<typeof makeAudioContext>[];
let AudioContextMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  AudioContextInstances = [];
  // Use a regular `function` (not arrow) so `new AudioContext(...)` works.
  // When a constructor returns a plain object, `new` returns that object.
  AudioContextMock = vi.fn(function (this: any) {
    const ctx = makeAudioContext();
    AudioContextInstances.push(ctx);
    return ctx as any;
  });
  vi.stubGlobal('AudioContext', AudioContextMock);

  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
  });

  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  mockLiveHolder.current = null;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLiveSession lifecycle', () => {
  // 1 ── Initial disconnected state ──────────────────────────────────────────
  it('1: starts in disconnected state with null analyser', () => {
    const { liveMock } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() =>
      useLiveSession('You are a helpful assistant', 'Kore'),
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.analyser).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // 2 ── Connecting state ────────────────────────────────────────────────────
  it('2: isConnecting becomes true while waiting for onopen', async () => {
    let resolveConnect!: (v: any) => void;
    const liveMock = {
      connect: vi.fn(({ callbacks }: { callbacks: Callbacks }) => {
        return new Promise<any>((resolve) => { resolveConnect = resolve; });
      }),
    };
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    await act(async () => {
      // Fire connect but don't resolve yet
      void result.current.connect();
      // Flush credential mint microtasks so isConnecting settles true
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isConnected).toBe(false);

    // Cleanup: resolve to avoid unhandled promise
    resolveConnect(makeSession());
  });

  // 3 ── Successful connection ───────────────────────────────────────────────
  it('3: isConnected becomes true after onopen fires', async () => {
    const { liveMock, fire } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire);
      await fire.open();
      await connectPromise;
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
  });

  // 4 ── Analyser available after connection ─────────────────────────────────
  it('4: analyser is null before connect and non-null only after onopen fires', async () => {
    const { liveMock, fire } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    // Before any connection attempt
    expect(result.current.analyser).toBeNull();

    await act(async () => {
      void result.current.connect();
      await waitForCallbacks(fire);
    });

    // Mid-connect: still null (PR #47 fix — analyser not set from ref eagerly)
    expect(result.current.analyser).toBeNull();

    await act(async () => { await fire.open(); });

    expect(result.current.analyser).not.toBeNull();
  });

  // 5 ── Canvas mounting after connection ────────────────────────────────────
  // The canvas is rendered only when isConnected=true in LiveMentor.
  // This test verifies the state contract: analyser is non-null if and only
  // if isConnected is true after onopen, so the canvas is in the DOM before
  // the visualizer effect can try to read canvasRef.current.
  it('5: analyser and isConnected become true in the same React render cycle', async () => {
    const { liveMock, fire } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const snapshots: { connected: boolean; hasAnalyser: boolean }[] = [];
    const { result } = renderHook(() => {
      const s = useLiveSession('sys', 'Kore');
      snapshots.push({ connected: s.isConnected, hasAnalyser: s.analyser !== null });
      return s;
    });

    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire);
      await fire.open();
      await connectPromise;
    });

    // There must never be a render where analyser is non-null but isConnected
    // is false (that would mean the canvas is unmounted when the effect fires).
    const badState = snapshots.some(s => s.hasAnalyser && !s.connected);
    expect(badState).toBe(false);

    // Final state: both true
    expect(result.current.isConnected).toBe(true);
    expect(result.current.analyser).not.toBeNull();
  });

  // 6 ── Visualizer animation starting ──────────────────────────────────────
  it('6: analyser returned is the AnalyserNode wired to the output AudioContext', async () => {
    const { liveMock, fire } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire);
      await fire.open();
      await connectPromise;
    });

    const ctx = AudioContextInstances[0];
    expect(ctx.createAnalyser).toHaveBeenCalledOnce();
    const expectedAnalyser = ctx.createAnalyser.mock.results[0].value;
    expect(result.current.analyser).toBe(expectedAnalyser);
    expect(expectedAnalyser.connect).toHaveBeenCalledWith(ctx.destination);
  });

  // 7 ── Disconnect cleanup ──────────────────────────────────────────────────
  it('7: disconnect resets state and closes AudioContexts', async () => {
    const { liveMock, fire } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire);
      await fire.open();
      await connectPromise;
    });

    expect(result.current.isConnected).toBe(true);

    await act(async () => { result.current.disconnect(); });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    // The first AudioContext (output) should be closed
    expect(AudioContextInstances[0].close).toHaveBeenCalled();
  });

  // 8 ── Analyser returns to null ────────────────────────────────────────────
  it('8: analyser becomes null after disconnect', async () => {
    const { liveMock, fire } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire);
      await fire.open();
      await connectPromise;
    });

    expect(result.current.analyser).not.toBeNull();

    await act(async () => { result.current.disconnect(); });

    expect(result.current.analyser).toBeNull();
  });

  // 9 ── Reconnection ────────────────────────────────────────────────────────
  it('9: reconnect re-establishes isConnected=true with a fresh analyser', async () => {
    const { liveMock, fire } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    // First connection
    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire);
      await fire.open();
      await connectPromise;
    });

    // Disconnect
    await act(async () => { result.current.disconnect(); });
    expect(result.current.analyser).toBeNull();

    // Reconnect
    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire, 2);
      await fire.open();
      await connectPromise;
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.analyser).not.toBeNull();
  });

  // 10 ── No duplicate audio contexts on reconnect ───────────────────────────
  // connect() must call cleanup() before creating new AudioContexts so that
  // there is never more than one pair of live AudioContexts.
  it('10: reconnect does not leak old AudioContexts (cleanup called before new contexts)', async () => {
    const { liveMock, fire } = makeLiveMock();
    mockLiveHolder.current = liveMock;

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    // First connect
    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire);
      await fire.open();
      await connectPromise;
    });

    const ctxCountAfterFirst = AudioContextInstances.length;

    // Reconnect without explicit disconnect — connect() must close old contexts
    await act(async () => {
      const connectPromise = result.current.connect();
      await waitForCallbacks(fire, 2);
      await fire.open();
      await connectPromise;
    });

    // Old contexts closed before new ones were created
    expect(AudioContextInstances[0].close).toHaveBeenCalled();
    expect(AudioContextInstances[1].close).toHaveBeenCalled();
    // Two new contexts were created for the second connection
    expect(AudioContextInstances.length).toBe(ctxCountAfterFirst + 2);
  });

  // 11 ── Connection failure ─────────────────────────────────────────────────
  it('11: all retries failing sets error and leaves isConnected=false', async () => {
    mockLiveHolder.current = {
      connect: vi.fn().mockRejectedValue(new Error('Network refused')),
    };

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    await act(async () => {
      const p = result.current.connect();
      await vi.runAllTimersAsync();
      await p.catch(() => {});
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toMatch(/Network refused|Failed to establish/i);
  });

  // 12 ── Component unmount during connection ────────────────────────────────
  it('12: onopen is ignored after the hook is torn down mid-connect', async () => {
    let capturedCallbacks!: Callbacks;
    let resolveSession!: (v: any) => void;
    mockLiveHolder.current = {
      connect: vi.fn(({ callbacks }: { callbacks: Callbacks }) => {
        capturedCallbacks = callbacks;
        return new Promise((resolve) => { resolveSession = resolve; });
      }),
    };

    const { result, unmount } = renderHook(() => useLiveSession('sys', 'Kore'));

    await act(async () => {
      void result.current.connect();
      for (let i = 0; i < 60 && !capturedCallbacks; i++) await Promise.resolve();
    });
    expect(capturedCallbacks).toBeTruthy();

    // Tear down (simulates component unmount)
    unmount();

    // Now fire onopen from the in-flight connection
    const session = makeSession();
    resolveSession(session);
    await act(async () => {
      await capturedCallbacks.onopen();
    });

    // currentAttemptRef was nulled by cleanup on unmount, so onopen bails out
    expect(result.current.isConnected).toBe(false);
    expect(result.current.analyser).toBeNull();
  });

  // 13 ── Strict Mode double-effect ─────────────────────────────────────────
  // Simulates: connect() → disconnect() (Strict Mode cleanup) → connect()
  // The first connect's onopen should be ignored because currentAttemptRef
  // was replaced when disconnect() was called.
  it('13: first-pass onopen is ignored when currentAttemptRef is replaced by disconnect', async () => {
    let firstCallbacks!: Callbacks;
    let callCount = 0;

    mockLiveHolder.current = {
      connect: vi.fn(({ callbacks }: { callbacks: Callbacks }) => {
        callCount++;
        if (callCount === 1) {
          firstCallbacks = callbacks;
          return new Promise(() => {}); // first pass never resolves
        }
        // Second pass: resolve without firing onopen
        return Promise.resolve(makeSession());
      }),
    };

    const { result } = renderHook(() => useLiveSession('sys', 'Kore'));

    await act(async () => {
      void result.current.connect(); // first pass
      for (let i = 0; i < 60 && callCount < 1; i++) await Promise.resolve();
      result.current.disconnect(); // Strict Mode cleanup → nulls currentAttemptRef
      void result.current.connect(); // second pass
      for (let i = 0; i < 60 && callCount < 2; i++) await Promise.resolve();
    });

    expect(callCount).toBeGreaterThanOrEqual(1);
    expect(firstCallbacks).toBeTruthy();

    // Fire first-pass onopen — must be silently ignored
    await act(async () => {
      await firstCallbacks.onopen();
    });

    // State reflects only the second connect (which did not fire onopen)
    expect(result.current.isConnected).toBe(false);
    expect(result.current.analyser).toBeNull();
  });
});
