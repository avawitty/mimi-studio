import { auth } from './firebaseInit';
import type {
  CalibrationChoice,
  CalibrationJudgmentResponse,
  CalibrationPairResponse,
  CalibrationSessionSummary,
  TasteCalibrationSession,
} from '../lib/tasteCalibration/contracts';

async function authHeaders(idempotencyKey?: string): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sign in to use Taste Calibration.');
  }
  const token = await currentUser.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-token': `Bearer ${token}`,
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { message?: string })?.message ||
      (payload as { error?: { message?: string } })?.error?.message ||
      'Taste calibration request failed.';
    throw Object.assign(new Error(message), {
      code: (payload as { code?: string })?.code,
      status: response.status,
    });
  }
  return payload as T;
}

export async function createCalibrationSession(input: {
  projectId: string;
  targetQuestionCount?: number;
  scope?: 'persistent' | 'project' | 'session';
}): Promise<{ session: TasteCalibrationSession; pair: CalibrationPairResponse }> {
  const response = await fetch('/api/mimi/taste-calibration/session', {
    method: 'POST',
    headers: await authHeaders(),
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function getCalibrationSession(
  sessionId: string,
): Promise<{ session: TasteCalibrationSession }> {
  const response = await fetch(
    `/api/mimi/taste-calibration/session?sessionId=${encodeURIComponent(sessionId)}`,
    {
      method: 'GET',
      headers: await authHeaders(),
      credentials: 'include',
    },
  );
  return parseResponse(response);
}

export async function getNextCalibrationPair(
  sessionId: string,
): Promise<CalibrationPairResponse> {
  const response = await fetch(
    `/api/mimi/taste-calibration/next-pair?sessionId=${encodeURIComponent(sessionId)}`,
    {
      method: 'GET',
      headers: await authHeaders(),
      credentials: 'include',
    },
  );
  return parseResponse(response);
}

export async function submitCalibrationJudgment(input: {
  sessionId: string;
  pairId: string;
  choice: CalibrationChoice;
  decidingFeatureIds?: string[];
  correctionNote?: string;
}): Promise<CalibrationJudgmentResponse> {
  const response = await fetch('/api/mimi/taste-calibration/judgment', {
    method: 'POST',
    headers: await authHeaders(crypto.randomUUID()),
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function completeCalibrationSession(
  sessionId: string,
): Promise<CalibrationSessionSummary> {
  const response = await fetch('/api/mimi/taste-calibration/complete', {
    method: 'POST',
    headers: await authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ sessionId }),
  });
  return parseResponse(response);
}

export async function pauseCalibrationSession(
  sessionId: string,
): Promise<{ session: TasteCalibrationSession }> {
  const response = await fetch('/api/mimi/taste-calibration/pause', {
    method: 'POST',
    headers: await authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ sessionId }),
  });
  return parseResponse(response);
}
