import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, isSessionExpired } from '@/lib/sessions';
import { verifyUSDCTransfer } from '@/lib/base-rpc';
import crypto from 'crypto';

// Generate signed download URL (same logic as download/generate)
function generateSignedUrl(sessionId: string): string {
  const secret = process.env.DOWNLOAD_SECRET || 'change-me-in-production';
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  const data = `${sessionId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  
  return `/api/download/file?id=${sessionId}&expires=${expiresAt}&sig=${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, txHash } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID required',
      }, { status: 400 });
    }

    // Get session
    const session = getSession(sessionId);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found',
      }, { status: 404 });
    }

    // Check if expired
    if (isSessionExpired(session)) {
      updateSession(sessionId, { status: 'expired' });
      return NextResponse.json({ 
        error: 'Payment session expired',
      }, { status: 400 });
    }

    // If already confirmed, return download URL
    if (session.status === 'confirmed') {
      return NextResponse.json({
        success: true,
        verified: true,
        downloadUrl: generateSignedUrl(sessionId),
      });
    }

    // If no txHash provided, just return current status
    if (!txHash) {
      return NextResponse.json({
        success: true,
        verified: false,
        status: session.status,
      });
    }

    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ 
        error: 'Invalid transaction hash',
      }, { status: 400 });
    }

    // Get expected recipient from environment
    const recipient = process.env.X402_WALLET_ADDRESS || 
                     process.env.PAYMENT_WALLET_ADDRESS || 
                     '0x1Af5f519DC738aC0f3B58B19A4bB8A8441937e78';

    // Verify transaction on Base
    const verification = await verifyUSDCTransfer(
      txHash,
      recipient,
      session.amount
    );

    if (!verification.verified) {
      updateSession(sessionId, { 
        status: 'failed',
        txHash 
      });
      
      return NextResponse.json({
        success: false,
        verified: false,
        error: verification.error || 'Payment verification failed',
      }, { status: 400 });
    }

    // Payment verified! Update session
    updateSession(sessionId, { 
      status: 'confirmed',
      txHash,
      confirmedAt: Date.now()
    });

    // Generate download URL
    const downloadUrl = generateSignedUrl(sessionId);

    // TODO: Send email with download link (optional)

    return NextResponse.json({
      success: true,
      verified: true,
      downloadUrl,
    });
    
  } catch (error) {
    console.error('x402 verify error:', error);
    return NextResponse.json({ 
      error: 'Verification failed',
    }, { status: 500 });
  }
}
