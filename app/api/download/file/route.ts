import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { PDF_FILENAME } from '@/lib/constants';

function getSecret(): string | null {
  return process.env.DOWNLOAD_SECRET || null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(purchaseId: string, expiresAt: string, signature: string, secret: string): boolean {
  const data = `${purchaseId}:${expiresAt}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return timingSafeEqual(signature, expectedSignature);
}

function parseTokenParam(token: string): { purchaseId: string; expiresAt: string; signature: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    return { purchaseId: parts[0], expiresAt: parts[1], signature: parts[2] };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const secret = getSecret();
    if (!secret) {
      console.error('DOWNLOAD_SECRET is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Download token required' }, { status: 400 });
    }

    const parsed = parseTokenParam(token);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid download token' }, { status: 400 });
    }

    const { purchaseId, expiresAt, signature } = parsed;

    // Check expiration
    const expiryTime = parseInt(expiresAt);
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
      return NextResponse.json({ error: 'Download link expired' }, { status: 403 });
    }

    // Verify signature with timing-safe comparison
    if (!verifySignature(purchaseId, expiresAt, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.log('Download requested:', { purchaseId, timestamp: new Date().toISOString() });

    // Serve the PDF file
    const pdfPath = path.join(process.cwd(), 'private', PDF_FILENAME);

    try {
      const fileBuffer = await fs.readFile(pdfPath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${PDF_FILENAME}"`,
          'Cache-Control': 'private, no-cache',
        },
      });
    } catch {
      console.error('PDF file not found:', pdfPath);
      return NextResponse.json({
        error: 'PDF file not ready. Please contact support.',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
