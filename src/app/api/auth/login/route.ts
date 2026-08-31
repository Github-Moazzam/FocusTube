import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signAuth } from '@/lib/auth';
import crypto from 'crypto';

// In-memory rate limiting for login attempts
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    const rateLimit = rateLimitMap.get(ip);
    if (rateLimit && now - rateLimit.timestamp < RATE_LIMIT_WINDOW) {
      if (rateLimit.count >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
      }
      rateLimitMap.set(ip, { count: rateLimit.count + 1, timestamp: rateLimit.timestamp });
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json({ error: 'Server misconfiguration: ADMIN_PASSWORD not set' }, { status: 500 });
    }

    // Timing-safe comparison
    const providedBuffer = Buffer.from(password);
    const expectedBuffer = Buffer.from(adminPassword);

    let isMatch = false;
    if (providedBuffer.length === expectedBuffer.length) {
      isMatch = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    } else {
      // Still do a comparison to avoid timing attack on length (mostly)
      crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    }

    if (isMatch) {
      // Clear rate limit on success
      rateLimitMap.delete(ip);

      const token = await signAuth();
      const cookieStore = await cookies();
      
      cookieStore.set({
        name: 'focus-tube-token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60, // 365 days
        path: '/',
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

