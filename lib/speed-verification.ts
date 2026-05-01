import crypto from 'crypto';

export type SpeedVerificationFormType = 'match-scouting' | 'pit-scouting' | 'sync';

type SpeedVerificationPayload = {
  formType: SpeedVerificationFormType;
  uploadMbps: number;
  issuedAtMs: number;
  expiresAtMs: number;
};

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  return (
    process.env.SPEED_TEST_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'avalanche-speed-guard-fallback'
  );
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function createSpeedVerificationToken(
  formType: SpeedVerificationFormType,
  uploadMbps: number,
  ttlMs: number = DEFAULT_TTL_MS
): string {
  const now = Date.now();
  const payload: SpeedVerificationPayload = {
    formType,
    uploadMbps: Number(uploadMbps),
    issuedAtMs: now,
    expiresAtMs: now + ttlMs,
  };
  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payloadEncoded)
    .digest('base64url');
  return `${payloadEncoded}.${signature}`;
}

export function verifySpeedVerificationToken(token: string | undefined | null): SpeedVerificationPayload | null {
  if (!token || typeof token !== 'string') return null;
  const [payloadEncoded, signature] = token.split('.');
  if (!payloadEncoded || !signature) return null;

  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(payloadEncoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payloadEncoded)) as SpeedVerificationPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Number.isFinite(parsed.uploadMbps)) return null;
    if (!Number.isFinite(parsed.expiresAtMs)) return null;
    if (Date.now() > parsed.expiresAtMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requiredUploadMbpsForForm(formType: SpeedVerificationFormType): number {
  if (formType === 'pit-scouting') return 5.0;
  if (formType === 'match-scouting') return 2.0000001; // strict greater-than 2 Mbps
  return 5.0;
}
