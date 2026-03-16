import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { USDC_ADDRESS, PRICE_USDC_UNITS, PRODUCT_NAME, X402_VERSION } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const walletAddress = process.env.NEXT_PUBLIC_X402_WALLET;
    if (!walletAddress) {
      console.error('NEXT_PUBLIC_X402_WALLET is not configured');
      return NextResponse.json(
        { error: 'Payment system misconfigured' },
        { status: 500 }
      );
    }

    const { walletAddress: userWallet } = await req.json();

    // Generate session for download tracking
    const sessionId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    // Return x402 standard payment requirements
    const requirements = {
      x402Version: 1,
      error: 'Payment Required',
      accepts: [{
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: PRICE_USDC_UNITS,
        payTo: walletAddress,
        asset: USDC_ADDRESS,
        maxTimeoutSeconds: 7200, // 2 hours
        extra: {
          name: PRODUCT_NAME,
          description: 'Payment for PDF download',
          version: X402_VERSION,
        }
      }],
      sessionId,
      userWallet: userWallet || null, // Track for verification
    };

    return NextResponse.json(requirements);
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
