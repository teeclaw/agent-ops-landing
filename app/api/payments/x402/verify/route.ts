import { NextRequest, NextResponse } from 'next/server';
import { verifyAndSettlePayment } from '@/lib/x402-verify';
import { generateDownloadUrl } from '@/lib/download-url';
import { storePayment } from '@/lib/payments';
import { ONCHAIN_INTERMEDIATE_ADDRESS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, paymentHeader } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (!paymentHeader || typeof paymentHeader !== 'string') {
      return NextResponse.json({ error: 'Payment header required' }, { status: 400 });
    }

    const finalRecipient = process.env.NEXT_PUBLIC_X402_WALLET;
    if (!finalRecipient) {
      console.error('NEXT_PUBLIC_X402_WALLET is not configured');
      return NextResponse.json(
        { success: false, verified: false, error: 'Payment system misconfigured' },
        { status: 500 },
      );
    }

    // recipientAddress = intermediate address (must match authorization.to in payment header)
    // finalRecipient = actual wallet that receives funds after settlement
    const result = await verifyAndSettlePayment(
      paymentHeader,
      ONCHAIN_INTERMEDIATE_ADDRESS,
      finalRecipient,
    );

    if (result.verified) {
      const downloadUrl = generateDownloadUrl(sessionId);

      // Store payment in Redis (non-fatal on failure)
      try {
        await storePayment({
          txHash: result.txHash,
          sessionId,
          downloadUrl,
          source: 'x402',
          verifiedAt: new Date().toISOString(),
        });
      } catch (storeError) {
        console.error('Failed to store payment in Redis:', storeError);
      }

      return NextResponse.json({
        success: true,
        verified: true,
        status: 'confirmed',
        downloadUrl,
        txHash: result.txHash,
        facilitator: result.facilitator,
      });
    }

    return NextResponse.json(
      {
        success: false,
        verified: false,
        status: 'failed',
        error: result.error || 'Payment settlement failed',
      },
      { status: 400 },
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, verified: false, error: 'Verification failed' },
      { status: 500 },
    );
  }
}
