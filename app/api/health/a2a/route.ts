import { NextResponse } from 'next/server';
import { A2A_HEALTH_URL } from '@/lib/constants';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(A2A_HEALTH_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      return NextResponse.json({ status: 'online' });
    }

    return NextResponse.json({ status: 'offline' }, { status: 502 });
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 502 });
  }
}
