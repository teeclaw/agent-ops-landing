import { NextRequest, NextResponse } from 'next/server';
import { generateDownloadUrl } from '@/lib/download-url';
import { getPaymentByTxHash } from '@/lib/payments';

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;

export async function POST(req: NextRequest) {
  try {
    const { txHash } = await req.json();

    if (!txHash || typeof txHash !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    const trimmedHash = txHash.trim();

    if (!TX_HASH_REGEX.test(trimmedHash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction hash format. Must start with 0x followed by 64 hex characters.' },
        { status: 400 }
      );
    }

    // Look up payment in Redis
    const payment = await getPaymentByTxHash(trimmedHash);

    if (payment) {
      // Generate a fresh download URL (original may have expired)
      const downloadUrl = generateDownloadUrl(payment.sessionId || trimmedHash);

      return NextResponse.json({
        success: true,
        verified: true,
        downloadUrl,
        txHash: trimmedHash,
      });
    }

    // Payment not found in Redis — do NOT re-call onchain.fi
    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: 'No verified payment found for this transaction hash. If you just paid, please wait a moment and try again.',
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Recovery error:', error);
    return NextResponse.json(
      { success: false, error: 'Recovery failed. Please try again.' },
      { status: 500 }
    );
  }
}
