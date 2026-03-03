import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentWithOnchain } from '@/lib/x402-verify';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, paymentProof, txHash } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID required',
      }, { status: 400 });
    }
    
    // Support both x402 proof and simple tx hash
    const proof = paymentProof || { txHash };
    
    if (!proof || (!paymentProof && !txHash)) {
      return NextResponse.json({ 
        error: 'Payment proof or transaction hash required',
      }, { status: 400 });
    }
    
    // Verify with onchain.fi aggregator
    const result = await verifyPaymentWithOnchain(proof, {
      amount: '39.00',
      token: 'USDC',
      network: 'base',
      recipient: process.env.X402_WALLET_ADDRESS || '0x1Af5f519DC738aC0f3B58B19A4bB8A8441937e78',
    });
    
    if (result.verified) {
      // Generate signed download URL (24h expiry)
      const downloadUrl = generateDownloadUrl(sessionId);
      
      return NextResponse.json({
        success: true,
        verified: true,
        status: 'confirmed',
        downloadUrl,
        txHash: result.txHash,
        facilitator: result.facilitator,
      });
    }
    
    if (result.error) {
      return NextResponse.json({
        success: false,
        verified: false,
        status: 'failed',
        error: result.error
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      verified: false,
      status: 'pending' 
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { 
        success: false,
        verified: false,
        error: 'Verification failed' 
      },
      { status: 500 }
    );
  }
}

// Helper: Generate signed download URL
function generateDownloadUrl(sessionId: string): string {
  const secret = process.env.DOWNLOAD_SECRET || 'fallback-secret';
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24h
  
  const data = `${sessionId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  
  const token = Buffer.from(`${data}:${signature}`).toString('base64url');
  
  return `/api/download/file?token=${token}`;
}
