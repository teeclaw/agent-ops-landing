// Shared constants — single source of truth for values used across the app

// USDC on Base
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

// Pricing
export const PRICE_DISPLAY = '$39';
export const PRICE_USDC_HUMAN = '39';
export const PRICE_USDC_UNITS = '39000000'; // 6 decimals
export const PRICE_USDC_BIGINT = BigInt(39_000_000);

// Product
export const PRODUCT_NAME = 'Agent 18608 Revenue Playbook';
export const PDF_FILENAME = 'agent-ops-manual-v1.0.0.pdf';

// External URLs
export const GUMROAD_URL = 'https://agent18608.gumroad.com/l/agent-18608-revenue-playbook';
export const A2A_HEALTH_URL = 'https://a2a.teeclaw.xyz/health';

// Email
export const EMAIL_SENDER = 'Agent 18608 <noreply@agent18608.xyz>';

// x402 protocol
export const X402_VERSION = 1;
export const BASE_CHAIN_ID = 8453;

// onchain.fi facilitator — intermediate address for Base→Base ERC-3009
export const ONCHAIN_INTERMEDIATE_ADDRESS = '0xfeb1F8F7F9ff37B94D14c88DE9282DA56b3B1Cb1' as const;
