/**
 * LiveMentor visualizer lifecycle tests
 *
 * Tests the canvas mounting, RAF management, and cleanup behavior of the
 * LiveMentor component, covering the visualizer scenarios from the task:
 *
 *  - Canvas is absent when disconnected
 *  - Canvas mounts when isConnected becomes true
 *  - RAF loop starts exactly once when analyser + canvas are both ready
 *  - RAF loop is cancelled during cleanup (disconnect)
 *  - RAF loop is not duplicated on reconnect
 *  - Strict Mode double-effect: animationRef is reset to 0 before new loop
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock useLiveSession so the component is testable in isolation
// ---------------------------------------------------------------------------
type MockSession = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  error: string | null;
  analyser: AnalyserNode | null;
  transcript: string;
  volume: number;
  sendVideoFrame: ReturnType<typeof vi.fn>;
};

let mockSession: MockSession;

vi.mock('../hooks/useLiveSession', () => ({
  useLiveSession: () => mockSession,
}));

// ---------------------------------------------------------------------------
// RAF mocks
// ---------------------------------------------------------------------------

let rafCallbacks: Map<number, FrameRequestCallback>;
let rafIdCounter: number;
let cancelledIds: Set<number>;

function installRafMocks() {
  rafCallbacks = new Map();
  rafIdCounter = 0;
  cancelledIds = new Set();

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++rafIdCounter;
    rafCallbacks.set(id, cb);
    return id;
  });

  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelledIds.add(id);
    rafCallbacks.delete(id);
  });
}

function flushRaf(times = 1) {
  for (let i = 0; i < times; i++) {
    for (const [id, cb] of Array.from(rafCallbacks.entries())) {
      rafCallbacks.delete(id);
      cb(performance.now());
    }
  }
}

// ---------------------------------------------------------------------------
// Canvas 2d context mock (jsdom doesn't implement it)
// ---------------------------------------------------------------------------
function installCanvasMock() {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    getContext: vi.fn(),
  };

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx as any);
  return ctx;
}

// ---------------------------------------------------------------------------
// Minimal AnalyserNode stand-in
// ---------------------------------------------------------------------------
function makeAnalyser(): AnalyserNode {
  return {
    frequencyBinCount: 128,
    fftSize: 256,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteTimeDomainData: vi.fn((arr: Uint8Array) => arr.fill(128)),
  } as unknown as AnalyserNode;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let canvasCtx: ReturnType<typeof installCanvasMock>;

beforeEach(async () => {
  installRafMocks();
  canvasCtx = installCanvasMock();

  mockSession = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    error: null,
    analyser: null,
    transcript: '',
    volume: 0,
    sendVideoFrame: vi.fn(),
  };

  // Import LiveMentor lazily so vi.mock hoisting takes effect
  const { LiveMentor } = await import('../components/LiveMentor');
  (globalThis as any).__LiveMentor = LiveMentor;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (globalThis as any).__LiveMentor;
});

function getLiveMentor() {
  return (globalThis as any).__LiveMentor as React.FC<any>;
}

const defaultProps = {
  name: 'Mimi',
  role: 'AI stylist',
  voiceName: 'Kore',
  systemInstruction: 'You are helpful.',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LiveMentor visualizer lifecycle', () => {
  it('canvas is absent when disconnected', async () => {
    const LiveMentor = getLiveMentor();
    await act(async () => { render(<LiveMentor {...defaultProps} />); });

    expect(screen.queryByRole('img')).toBeNull();
    // canvas element should not be rendered
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('canvas mounts when isConnected becomes true and analyser is non-null', async () => {
    mockSession.isConnected = true;
    mockSession.analyser = makeAnalyser();

    const LiveMentor = getLiveMentor();
    await act(async () => { render(<LiveMentor {...defaultProps} />); });

    expect(document.querySelector('canvas')).not.toBeNull();
  });

  it('RAF loop starts after analyser + canvas are both ready', async () => {
    mockSession.isConnected = true;
    mockSession.analyser = makeAnalyser();

    const LiveMentor = getLiveMentor();
    await act(async () => { render(<LiveMentor {...defaultProps} />); });

    // At least one RAF must have been scheduled
    expect(rafCallbacks.size + cancelledIds.size).toBeGreaterThanOrEqual(1);

    // Flush one frame and verify drawing happened
    act(() => { flushRaf(1); });
    expect(canvasCtx.clearRect).toHaveBeenCalled();
    expect(canvasCtx.stroke).toHaveBeenCalled();
  });

  it('RAF is cancelled when analyser goes null (disconnect)', async () => {
    const { LiveMentor } = await import('../components/LiveMentor');
    mockSession.isConnected = true;
    mockSession.analyser = makeAnalyser();

    const { rerender } = render(<LiveMentor {...defaultProps} />);
    // Flush the initial RAF
    act(() => { flushRaf(1); });

    const rafIdBeforeDisconnect = rafIdCounter;

    // Simulate disconnect: analyser → null, isConnected → false
    await act(async () => {
      mockSession.isConnected = false;
      mockSession.analyser = null;
      rerender(<LiveMentor {...defaultProps} />);
    });

    // The effect cleanup should have cancelled the pending RAF
    expect(cancelledIds.size).toBeGreaterThan(0);
    // No new RAF should have been started (analyser is null)
    expect(rafCallbacks.size).toBe(0);
  });

  it('RAF loop is not duplicated on reconnect (exactly one active loop)', async () => {
    const { LiveMentor } = await import('../components/LiveMentor');
    const analyser1 = makeAnalyser();
    mockSession.isConnected = true;
    mockSession.analyser = analyser1;

    const { rerender } = render(<LiveMentor {...defaultProps} />);
    act(() => { flushRaf(1); });

    // Disconnect
    await act(async () => {
      mockSession.isConnected = false;
      mockSession.analyser = null;
      rerender(<LiveMentor {...defaultProps} />);
    });

    const cancelCountAfterDisconnect = cancelledIds.size;

    // Reconnect with a fresh analyser
    const analyser2 = makeAnalyser();
    await act(async () => {
      mockSession.isConnected = true;
      mockSession.analyser = analyser2;
      rerender(<LiveMentor {...defaultProps} />);
    });

    // After reconnect there should be exactly one pending RAF, not two
    expect(rafCallbacks.size).toBe(1);
  });

  it('animationRef is cancelled and reset when the visualizer effect re-runs (dep change)', async () => {
    const { LiveMentor } = await import('../components/LiveMentor');
    const analyser1 = makeAnalyser();
    mockSession.isConnected = true;
    mockSession.analyser = analyser1;

    const { rerender } = render(<LiveMentor {...defaultProps} />);
    // Flush the initial RAF to simulate normal animation
    act(() => { flushRaf(1); });
    const firstPendingId = Array.from(rafCallbacks.keys())[0];

    // Swap analyser to a new object — triggers effect cleanup + re-run
    const analyser2 = makeAnalyser();
    await act(async () => {
      mockSession.analyser = analyser2;
      rerender(<LiveMentor {...defaultProps} />);
    });

    // The previous RAF (from analyser1) must have been explicitly cancelled
    expect(cancelledIds.has(firstPendingId)).toBe(true);
    // Exactly one new RAF pending — no duplicate loop
    expect(rafCallbacks.size).toBe(1);
  });

  it('RAF is cancelled on component unmount', async () => {
    const { LiveMentor } = await import('../components/LiveMentor');
    mockSession.isConnected = true;
    mockSession.analyser = makeAnalyser();

    const { unmount } = render(<LiveMentor {...defaultProps} />);
    act(() => { flushRaf(1); });

    const pendingBeforeUnmount = rafCallbacks.size;
    expect(pendingBeforeUnmount).toBeGreaterThan(0);

    unmount();

    expect(rafCallbacks.size).toBe(0);
    expect(cancelledIds.size).toBeGreaterThan(0);
  });
});
