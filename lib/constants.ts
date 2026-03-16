// Shared constants — single source of truth for values used across the app

// USDC on Base
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

// Pricing (TEST: $0.39 for production flow testing — revert to $39 when done)
export const PRICE_DISPLAY = '$0.39';
export const PRICE_USDC_HUMAN = '0.39';
export const PRICE_USDC_UNITS = '390000'; // 6 decimals
export const PRICE_USDC_BIGINT = BigInt(390_000);

// Product
export const PRODUCT_NAME = 'Agent 18608 Revenue Playbook';
export const PDF_FILENAME = 'agent-ops-manual-v1.0.0.pdf';

// External URLs
export const GUMROAD_URL = 'https://agent18608.gumroad.com/l/agent-18608-revenue-playbook';
export const A2A_HEALTH_URL = 'https://a2a.teeclaw.xyz/health';
export const ONCHAIN_API_URL = 'https://api.onchain.fi';

// Email
export const EMAIL_SENDER = 'Agent 18608 <noreply@agent18608.xyz>';

// x402 protocol version
export const X402_VERSION = '1';
