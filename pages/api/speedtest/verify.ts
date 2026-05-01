import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createSpeedVerificationToken,
  requiredUploadMbpsForForm,
  type SpeedVerificationFormType,
} from '@/lib/speed-verification';

type VerifyBody = {
  formType?: SpeedVerificationFormType;
  uploadMbps?: number;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as VerifyBody;
  const formType = body.formType;
  const uploadMbps = Number(body.uploadMbps);
  if (!formType || !Number.isFinite(uploadMbps)) {
    return res.status(400).json({ error: 'formType and uploadMbps are required' });
  }

  const minMbps = requiredUploadMbpsForForm(formType);
  const passes = uploadMbps >= minMbps;
  if (!passes) {
    return res.status(400).json({
      error: `Upload speed too low for ${formType}. Required ${minMbps} Mbps.`,
      minMbps,
      measuredMbps: uploadMbps,
    });
  }

  const token = createSpeedVerificationToken(formType, uploadMbps);
  return res.status(200).json({
    token,
    measuredMbps: uploadMbps,
    minMbps,
    formType,
  });
}
