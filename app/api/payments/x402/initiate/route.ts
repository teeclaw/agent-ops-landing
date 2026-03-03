import { NextRequest, NextResponse } from 'next/server';
import { createSession, cleanupOldSessions } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ 
        error: 'Wallet address required',
      }, { status: 400 });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ 
        error: 'Invalid Ethereum address',
      }, { status: 400 });
    }

    // Clean up old sessions (runs in background)
    cleanupOldSessions();

    // Create new payment session
    const session = createSession(address);

    // Get payment recipient from environment
    const recipient = process.env.X402_WALLET_ADDRESS || 
                     process.env.PAYMENT_WALLET_ADDRESS || 
                     '0x1Af5f519DC738aC0f3B58B19A4bB8A8441937e78';
    
    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      amount: session.amount,
      currency: 'USDC',
      network: 'base',
      recipient,
      expiresAt: session.expiresAt,
    });
    
  } catch (error) {
    console.error('x402 initiate error:', error);
    return NextResponse.json({ 
      error: 'Payment initiation failed',
    }, { status: 500 });
  }
}
