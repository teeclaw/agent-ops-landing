/**
 * x402-verify.ts — payment verification & settlement via onchain.fi
 * Two-step: POST /v1/verify → POST /v1/settle
 */

import { PRICE_USDC_HUMAN } from '@/lib/constants';

interface SettlementResult {
  verified: boolean;
  txHash?: string;
  facilitator?: string;
  error?: string;
}

export async function verifyAndSettlePayment(
  paymentHeader: string,
  recipientAddress: string,
  finalRecipient: string,
): Promise<SettlementResult> {
  const apiKey = process.env.ONCHAIN_API_KEY;
  if (!apiKey) {
    return { verified: false, error: 'ONCHAIN_API_KEY not configured' };
  }

  const baseUrl = process.env.ONCHAIN_API_URL || 'https://api.onchain.fi/v1';

  try {
    // Debug: log payment header structure
    try {
      const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      console.log('[x402] Payment header:', JSON.stringify(decoded, null, 2));
    } catch { /* ignore decode errors */ }

    const verifyBody = {
      paymentHeader,
      sourceNetwork: 'base',
      destinationNetwork: 'base',
      expectedAmount: PRICE_USDC_HUMAN,
      expectedToken: 'USDC',
      recipientAddress,
      finalRecipient,
      priority: 'balanced',
    };

    console.log('[x402] Verify request:', JSON.stringify(verifyBody, null, 2));

    // Step 1: Verify
    const verifyRes = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(verifyBody),
    });

    const verifyJson = await verifyRes.json();
    console.log(`[x402] verify (HTTP ${verifyRes.status}):`, JSON.stringify(verifyJson, null, 2));

    if (!verifyRes.ok || verifyJson?.status === 'error') {
      return {
        verified: false,
        error: verifyJson?.data?.reason || verifyJson?.message || `Verify failed (HTTP ${verifyRes.status})`,
      };
    }

    if (!verifyJson?.data?.valid) {
      return {
        verified: false,
        error: verifyJson?.data?.reason || 'Payment verification failed',
      };
    }

    // Step 2: Settle
    const settleBody = {
      paymentHeader,
      paymentId: verifyJson?.data?.paymentId,
      sourceNetwork: 'base',
      destinationNetwork: 'base',
      priority: 'balanced',
    };

    console.log('[x402] Settle request:', JSON.stringify(settleBody, null, 2));

    const settleRes = await fetch(`${baseUrl}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(settleBody),
    });

    const settleJson = await settleRes.json();
    console.log(`[x402] settle (HTTP ${settleRes.status}):`, JSON.stringify(settleJson, null, 2));

    if (!settleRes.ok || settleJson?.status === 'error') {
      return {
        verified: false,
        error: settleJson?.data?.reason || settleJson?.message || `Settle failed (HTTP ${settleRes.status})`,
      };
    }

    const txHash = settleJson?.data?.txHash;
    if (txHash) {
      return {
        verified: true,
        txHash,
        facilitator: settleJson?.data?.facilitator || 'onchain.fi',
      };
    }

    return {
      verified: false,
      error: settleJson?.data?.reason || 'Settlement returned no txHash',
    };
  } catch (error) {
    console.error('[x402] Network error:', error);
    return { verified: false, error: error instanceof Error ? error.message : 'Payment failed' };
  }
}
