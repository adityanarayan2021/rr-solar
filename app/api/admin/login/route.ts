import { NextResponse } from 'next/server';
import { checkPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { requestLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const log = requestLogger(req, 'admin.login');
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };

  if (!process.env.ADMIN_PASSWORD || !process.env.AUTH_SECRET) {
    log.error('auth.not_configured');
    return NextResponse.json(
      { error: 'Admin login is not configured. Set ADMIN_PASSWORD and AUTH_SECRET.' },
      { status: 503 },
    );
  }
  if (!password || !checkPassword(password)) {
    // Small delay blunts brute-force attempts without needing a rate-limit store.
    await new Promise((r) => setTimeout(r, 600));
    // Failed logins are worth watching — repeated lines here mean a brute-force attempt.
    log.warn('auth.login_failed', { ip: req.headers.get('x-forwarded-for') ?? 'unknown' });
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  log.info('auth.login_success');
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions());
  return res;
}
