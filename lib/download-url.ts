import crypto from 'crypto';

/**
 * Generate a signed download URL with 24h expiry.
 * HMAC-SHA256 signature, base64url-encoded token.
 */
export function generateDownloadUrl(identifier: string): string {
  const secret = process.env.DOWNLOAD_SECRET;
  if (!secret) {
    throw new Error('DOWNLOAD_SECRET is not configured');
  }

  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24h

  const data = `${identifier}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  const token = Buffer.from(`${data}:${signature}`).toString('base64url');

  return `/api/download/file?token=${token}`;
}
