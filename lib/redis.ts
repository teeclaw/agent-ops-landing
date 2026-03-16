import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error('Missing required env vars: KV_REST_API_URL and KV_REST_API_TOKEN must be configured');
}

export const redis = new Redis({ url, token });
