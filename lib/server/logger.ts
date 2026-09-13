/**
 * Structured logger.
 *
 * - Pretty, colourised lines in development; single-line JSON in production so
 *   Vercel log drains (and anything else) can parse them.
 * - Redacts secrets and customer PII automatically. Nothing that reaches this
 *   module should ever put a password, token or full phone number into a log.
 * - Child loggers carry context (request id, route) so related lines can be
 *   correlated without repeating fields at every call site.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const isProd = process.env.NODE_ENV === 'production';
const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? (isProd ? 'info' : 'debug');
const MIN = RANK[configured] ?? RANK.info;

type Context = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Redaction                                                           */
/* ------------------------------------------------------------------ */

/** Keys whose values are never safe to log in full. */
const SECRET_KEY = /pass(word)?|secret|token|authorization|auth|api[-_]?key|cookie|session|mongodb_uri|uri|dsn/i;
/** Keys holding personal data we reduce rather than remove. */
const EMAIL_KEY = /^e?mail$/i;
const PHONE_KEY = /phone|mobile|whatsapp/i;

/** ramesh@example.com -> r***h@example.com */
export function maskEmail(value: string): string {
  const [user, domain] = value.split('@');
  if (!domain) return '***';
  const head = user.slice(0, 1);
  const tail = user.length > 1 ? user.slice(-1) : '';
  return `${head}***${tail}@${domain}`;
}

/** 9876543210 -> ******3210 — enough to match a support query, not enough to dial. */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `${'*'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`;
}

/** Strips credentials out of any connection string that slips through. */
export function maskUri(value: string): string {
  return value.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (SECRET_KEY.test(key)) return value.includes('://') ? maskUri(value) : '[redacted]';
    if (EMAIL_KEY.test(key)) return maskEmail(value);
    if (PHONE_KEY.test(key)) return maskPhone(value);
    // Catch credentials embedded in an otherwise innocent string.
    return value.includes('://') && value.includes('@') ? maskUri(value) : value;
  }

  if (Array.isArray(value)) {
    return depth >= 4 ? '[array]' : value.slice(0, 20).map((v) => redactValue(key, v, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= 4) return '[object]';
    return redact(value as Context, depth + 1);
  }

  return value;
}

export function redact(ctx: Context, depth = 0): Context {
  const out: Context = {};
  for (const [k, v] of Object.entries(ctx)) out[k] = redactValue(k, v, depth);
  return out;
}

/* ------------------------------------------------------------------ */
/* Error serialisation                                                 */
/* ------------------------------------------------------------------ */

function serialiseError(err: unknown): Context {
  if (err instanceof Error) {
    const e = err as Error & { code?: unknown; cause?: unknown };
    return {
      errName: e.name,
      errMessage: maskUri(e.message),
      ...(e.code !== undefined ? { errCode: String(e.code) } : {}),
      // Stacks are noisy and can leak paths; keep them out of production logs.
      ...(isProd ? {} : { errStack: e.stack?.split('\n').slice(0, 4).join('\n') }),
    };
  }
  return { errMessage: String(err) };
}

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

const COLOUR: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';

function emit(level: LogLevel, event: string, ctx: Context) {
  if (RANK[level] < MIN) return;

  const safe = redact(ctx);
  const line = { level, time: new Date().toISOString(), event, ...safe };

  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (isProd) {
    sink(JSON.stringify(line));
    return;
  }

  const kv = Object.entries(safe)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' ');
  sink(`${COLOUR[level]}${level.toUpperCase().padEnd(5)}${RESET} ${event}${kv ? ` ${'\x1b[90m'}${kv}${RESET}` : ''}`);
}

export type Logger = {
  debug(event: string, ctx?: Context): void;
  info(event: string, ctx?: Context): void;
  warn(event: string, ctx?: Context): void;
  error(event: string, err?: unknown, ctx?: Context): void;
  child(ctx: Context): Logger;
  /** Returns a function that logs the elapsed time when called. */
  timer(event: string, ctx?: Context): (extra?: Context) => void;
};

function build(base: Context): Logger {
  return {
    debug: (event, ctx) => emit('debug', event, { ...base, ...ctx }),
    info: (event, ctx) => emit('info', event, { ...base, ...ctx }),
    warn: (event, ctx) => emit('warn', event, { ...base, ...ctx }),
    error: (event, err, ctx) => emit('error', event, { ...base, ...ctx, ...(err ? serialiseError(err) : {}) }),
    child: (ctx) => build({ ...base, ...ctx }),
    timer(event, ctx) {
      const start = Date.now();
      return (extra) => emit('info', event, { ...base, ...ctx, ...extra, ms: Date.now() - start });
    },
  };
}

export const logger = build({});

/** Short id for correlating all log lines from one request. */
export function requestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Per-request child logger. Use in every API route. */
export function requestLogger(req: Request, route: string): Logger {
  const url = new URL(req.url);
  return logger.child({ rid: requestId(), method: req.method, route, path: url.pathname });
}
