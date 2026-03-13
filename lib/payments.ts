import { redis } from '@/lib/redis';

const PAYMENT_TTL_SECONDS = 2592000; // 30 days

export interface PaymentRecord {
  txHash?: string;
  sessionId?: string;
  saleId?: string;
  email?: string;
  downloadUrl: string;
  facilitator?: string;
  source: 'x402' | 'gumroad';
  verifiedAt: string;
}

function getKey(record: Pick<PaymentRecord, 'source' | 'txHash' | 'saleId'>): string {
  if (record.source === 'gumroad' && record.saleId) {
    return `payment:gumroad:${record.saleId}`;
  }
  if (record.txHash) {
    return `payment:${record.txHash}`;
  }
  throw new Error('Cannot derive storage key: missing txHash or saleId');
}

export async function storePayment(data: PaymentRecord): Promise<void> {
  const key = getKey(data);
  await redis.set(key, JSON.stringify(data), { ex: PAYMENT_TTL_SECONDS });
}

export async function getPaymentByTxHash(txHash: string): Promise<PaymentRecord | null> {
  const key = `payment:${txHash}`;
  const raw = await redis.get<string>(key);
  if (!raw) return null;

  // Upstash may return the parsed object directly or a string
  if (typeof raw === 'object') return raw as unknown as PaymentRecord;
  return JSON.parse(raw) as PaymentRecord;
}
