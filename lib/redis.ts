import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.warn('Upstash Redis credentials missing (KV_REST_API_URL, KV_REST_API_TOKEN)');
}

export const redis = new Redis({
  url: url || '',
  token: token || '',
});
