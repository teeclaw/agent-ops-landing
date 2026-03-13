import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const walletAddress = process.env.X402_WALLET_ADDRESS;
    if (!walletAddress) {
      console.error('X402_WALLET_ADDRESS is not configured');
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
        maxAmountRequired: '390000', // 39 USDC (6 decimals)
        payTo: walletAddress,
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        maxTimeoutSeconds: 7200, // 2 hours
        extra: {
          name: 'Agent 18608 Revenue Playbook',
          description: 'Payment for PDF download',
          version: '1',
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
