/**
 * x402-verify.ts — payment verification
 * Verifies USDC transfers on-chain using viem.
 */

import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { USDC_ADDRESS, PRICE_USDC_HUMAN } from '@/lib/constants';

const client = createPublicClient({
  chain: base,
  transport: http(),
});

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

interface VerificationResult {
  verified: boolean;
  txHash?: string;
  from?: string;
  amount?: string;
  error?: string;
}

interface PaymentRequirements {
  amount: string;
  recipient: string;
}

/**
 * Verify a USDC transfer on-chain by reading the transaction receipt
 * and checking the ERC20 Transfer event logs.
 */
export async function verifyPaymentOnchain(
  txHash: string,
  requirements: PaymentRequirements
): Promise<VerificationResult> {
  try {
    const hash = txHash.trim() as `0x${string}`;

    // 1. Get the transaction receipt
    const receipt = await client.getTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction reverted on-chain' };
    }

    // 2. Find the USDC Transfer event in the logs
    const transferLog = receipt.logs.find((log) => {
      if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) return false;
      if (log.topics[0] !== '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') return false;
      return true;
    });

    if (!transferLog) {
      return { verified: false, error: 'No USDC transfer found in transaction' };
    }

    // 3. Decode the Transfer event
    const to = `0x${transferLog.topics[2]!.slice(26)}`.toLowerCase();
    const value = BigInt(transferLog.data);
    const from = `0x${transferLog.topics[1]!.slice(26)}`.toLowerCase();

    // 4. Verify recipient
    if (to !== requirements.recipient.toLowerCase()) {
      return {
        verified: false,
        error: `Transfer recipient mismatch: expected ${requirements.recipient}, got 0x${transferLog.topics[2]!.slice(26)}`,
      };
    }

    // 5. Verify amount (USDC has 6 decimals)
    const transferredAmount = formatUnits(value, 6);
    const expectedAmount = parseFloat(requirements.amount);
    const actualAmount = parseFloat(transferredAmount);

    if (actualAmount < expectedAmount) {
      return {
        verified: false,
        error: `Insufficient amount: expected ${requirements.amount} USDC, got ${transferredAmount} USDC`,
      };
    }

    return {
      verified: true,
      txHash: hash,
      from,
      amount: transferredAmount,
    };
  } catch (error) {
    console.error('[x402-verify] Error:', error);

    // Handle common viem errors
    const message = error instanceof Error ? error.message : 'Verification failed';

    if (message.includes('could not be found') || message.includes('not found')) {
      return {
        verified: false,
        error: 'Transaction not found. It may still be confirming — please wait and retry.',
      };
    }

    return { verified: false, error: message };
  }
}
