// Base mainnet RPC verification
const BASE_RPC = 'https://mainnet.base.org';
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

interface TransactionReceipt {
  status: string;
  to: string;
  from: string;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  blockNumber: string;
}

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export async function verifyUSDCTransfer(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    // Get transaction receipt
    const receiptResponse = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });

    const receiptData = await receiptResponse.json();
    
    if (!receiptData.result) {
      return { verified: false, error: 'Transaction not found' };
    }

    const receipt: TransactionReceipt = receiptData.result;

    // Check transaction was successful
    if (receipt.status !== '0x1') {
      return { verified: false, error: 'Transaction failed' };
    }

    // Find USDC transfer event
    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
        log.topics[0] === TRANSFER_EVENT_SIG
    );

    if (!transferLog) {
      return { verified: false, error: 'No USDC transfer found' };
    }

    // Decode transfer event
    // topics[1] = from (padded address)
    // topics[2] = to (padded address)
    // data = amount
    const to = '0x' + transferLog.topics[2].slice(26); // Remove padding
    const amount = BigInt(transferLog.data).toString();

    // Verify recipient
    if (to.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return { 
        verified: false, 
        error: `Wrong recipient. Expected ${expectedRecipient}, got ${to}` 
      };
    }

    // Verify amount (39 USDC = 39000000 with 6 decimals)
    if (amount !== expectedAmount) {
      return { 
        verified: false, 
        error: `Wrong amount. Expected ${expectedAmount}, got ${amount}` 
      };
    }

    return { verified: true };

  } catch (error) {
    console.error('RPC verification error:', error);
    return { 
      verified: false, 
      error: error instanceof Error ? error.message : 'Verification failed' 
    };
  }
}

// Check if transaction is confirmed (has enough confirmations)
export async function isTransactionConfirmed(txHash: string): Promise<boolean> {
  try {
    const response = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });

    const data = await response.json();
    return !!data.result && data.result.status === '0x1';

  } catch (error) {
    console.error('Confirmation check error:', error);
    return false;
  }
}
