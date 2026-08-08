import { describe, expect, it } from 'vitest';
import {
  handleCreateCalibrationSessionRoute,
  handleGetCalibrationSessionRoute,
  handleSubmitCalibrationJudgmentRoute,
} from '../lib/tasteCalibrationRoute';

function mockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(body?: string) {
      this.body = body;
    },
  };
  return res;
}

describe('taste calibration API auth', () => {
  it('rejects unauthorized session creation', async () => {
    const req = { method: 'POST', headers: {}, body: {} };
    const res = mockRes();
    await handleCreateCalibrationSessionRoute(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthorized session read', async () => {
    const req = {
      method: 'GET',
      headers: {},
      query: { sessionId: '00000000-0000-4000-8000-000000000001' },
    };
    const res = mockRes();
    await handleGetCalibrationSessionRoute(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('rejects judgment without idempotency key', async () => {
    const req = {
      method: 'POST',
      headers: { 'x-user-token': 'Bearer invalid' },
      body: {
        sessionId: '00000000-0000-4000-8000-000000000001',
        pairId: '00000000-0000-4000-8000-000000000002',
        choice: 'left',
      },
    };
    const res = mockRes();
    await handleSubmitCalibrationJudgmentRoute(req, res);
    expect(res.statusCode).toBe(400);
    const payload = JSON.parse(res.body);
    expect(payload.code).toBe('INVALID_REQUEST');
  });
});
