import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentWithOnchain } from '@/lib/x402-verify';
import { generateDownloadUrl } from '@/lib/download-url';
import { storePayment } from '@/lib/payments';

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;

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

    // Validate tx hash format
    if (txHash && !TX_HASH_REGEX.test(txHash.trim())) {
      return NextResponse.json({
        error: 'Invalid transaction hash format. Must start with 0x followed by 64 hex characters.',
      }, { status: 400 });
    }
    
    const recipientAddress = process.env.X402_WALLET_ADDRESS;
    if (!recipientAddress) {
      console.error('X402_WALLET_ADDRESS is not configured');
      return NextResponse.json(
        { success: false, verified: false, error: 'Payment system misconfigured' },
        { status: 500 }
      );
    }

    // Verify with onchain.fi aggregator
    const result = await verifyPaymentWithOnchain(proof, {
      amount: '39.00',
      token: 'USDC',
      network: 'base',
      recipient: recipientAddress,
    });
    
    if (result.verified) {
      // Generate signed download URL (24h expiry)
      const downloadUrl = generateDownloadUrl(sessionId);

      // Store payment in Redis (non-fatal on failure)
      try {
        await storePayment({
          txHash: result.txHash,
          sessionId,
          downloadUrl,
          facilitator: result.facilitator,
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

