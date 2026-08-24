// In-memory sliding window rate limiters for Higgs Tools

interface RequestLog {
  timestamp: number;
  count: number;
}

const sortirRateLimitMap = new Map<string, RequestLog[]>();
const intipNomorRateLimitMap = new Map<string, RequestLog[]>();
const cekInfoAkunRateLimitMap = new Map<string, RequestLog[]>();
const loginAttemptRateLimitMap = new Map<string, RequestLog[]>();
const registerRateLimitMap = new Map<string, RequestLog[]>();
const trackRateLimitMap = new Map<string, RequestLog[]>();

// Periodically clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const oneMinMs = 60 * 1000;
    const oneHourMs = 60 * 60 * 1000;

    // Clean Sortir
    for (const [userId, logs] of sortirRateLimitMap.entries()) {
      const active = logs.filter((log) => now - log.timestamp < oneMinMs);
      if (active.length === 0) sortirRateLimitMap.delete(userId);
      else sortirRateLimitMap.set(userId, active);
    }

    // Clean Intip Nomor
    for (const [userId, logs] of intipNomorRateLimitMap.entries()) {
      const active = logs.filter((log) => now - log.timestamp < oneMinMs);
      if (active.length === 0) intipNomorRateLimitMap.delete(userId);
      else intipNomorRateLimitMap.set(userId, active);
    }

    // Clean Cek Info Akun
    for (const [userId, logs] of cekInfoAkunRateLimitMap.entries()) {
      const active = logs.filter((log) => now - log.timestamp < oneHourMs);
      if (active.length === 0) cekInfoAkunRateLimitMap.delete(userId);
      else cekInfoAkunRateLimitMap.set(userId, active);
    }

    // Clean Login Attempts (15 menit window)
    const fifteenMinMs = 15 * 60 * 1000;
    for (const [key, logs] of loginAttemptRateLimitMap.entries()) {
      const active = logs.filter((log) => now - log.timestamp < fifteenMinMs);
      if (active.length === 0) loginAttemptRateLimitMap.delete(key);
      else loginAttemptRateLimitMap.set(key, active);
    }

    // Clean Register Attempts (1 jam window, per-IP)
    const oneHourMsReg = 60 * 60 * 1000;
    for (const [ip, logs] of registerRateLimitMap.entries()) {
      const active = logs.filter((log) => now - log.timestamp < oneHourMsReg);
      if (active.length === 0) registerRateLimitMap.delete(ip);
      else registerRateLimitMap.set(ip, active);
    }

    // Clean Track (1 menit window, per-ip-hash)
    for (const [key, logs] of trackRateLimitMap.entries()) {
      const active = logs.filter((log) => now - log.timestamp < oneMinMs);
      if (active.length === 0) trackRateLimitMap.delete(key);
      else trackRateLimitMap.set(key, active);
    }
  }, 5 * 60 * 1000);
}

// 4. Rate Limiter for Login (per-username & per-IP, immune to UA rotation)
// MAX_ATTEMPTS dalam 15 menit per username — tidak bisa dilewati dengan ganti User-Agent.
export function checkLoginAttemptRateLimit(
  username: string,
  ip: string
): { allowed: boolean; retryAfterSeconds: number; error?: string } {
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000;
  const now = Date.now();

  // ponytail: key per-username saja — cegah brute-force satu akun lewat rotasi UA/IP.
  // Lock DB per-(username,ip,ua) tetap dipertahankan sebagai lapisan kedua.
  const key = `u:${username.toLowerCase()}`;
  const userLogs = loginAttemptRateLimitMap.get(key) || [];
  const recentLogs = userLogs.filter((log) => now - log.timestamp < WINDOW_MS);

  if (recentLogs.length >= MAX_ATTEMPTS) {
    const oldestLog = recentLogs[0];
    const retryAfter = oldestLog
      ? Math.ceil((oldestLog.timestamp + WINDOW_MS - now) / 1000)
      : 900;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfter),
      error: `Terlalu banyak percobaan login untuk akun ini. Coba lagi dalam ${Math.ceil(Math.max(1, retryAfter) / 60)} menit.`,
    };
  }

  recentLogs.push({ timestamp: now, count: 1 });
  loginAttemptRateLimitMap.set(key, recentLogs);

  return { allowed: true, retryAfterSeconds: 0 };
}

// Reset rate limit setelah login sukses
export function resetLoginAttemptRateLimit(username: string) {
  loginAttemptRateLimitMap.delete(`u:${username.toLowerCase()}`);
}

// 6. Rate Limiter for /api/track (per-ip-hash, cegah log-spam/DB flood)
// ponytail: in-memory per-ip-hash, 30 event/menit. Upgrade Redis saat multi-instance.
export function checkTrackRateLimit(
  ipHash: string
): { allowed: boolean; retryAfterSeconds: number } {
  const MAX_EVENTS = 30;
  const WINDOW_MS = 60 * 1000; // 1 menit
  const now = Date.now();

  const logs = trackRateLimitMap.get(ipHash) || [];
  const recentLogs = logs.filter((log) => now - log.timestamp < WINDOW_MS);

  if (recentLogs.length >= MAX_EVENTS) {
    const oldestLog = recentLogs[0];
    const retryAfter = oldestLog
      ? Math.ceil((oldestLog.timestamp + WINDOW_MS - now) / 1000)
      : 60;
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  recentLogs.push({ timestamp: now, count: 1 });
  trackRateLimitMap.set(ipHash, recentLogs);

  return { allowed: true, retryAfterSeconds: 0 };
}

// 5. Rate Limiter for Register (per-IP, cegah mass-account creation / akun bulk spam)
// ponytail: in-memory per-IP, 3 registrasi per jam per IP. Upgrade ke Redis saat multi-instance.
export function checkRegisterRateLimit(
  ip: string
): { allowed: boolean; retryAfterSeconds: number; error?: string } {
  const MAX_REGISTRATIONS = 3;
  const WINDOW_MS = 60 * 60 * 1000; // 1 jam
  const now = Date.now();

  const ipLogs = registerRateLimitMap.get(ip) || [];
  const recentLogs = ipLogs.filter((log) => now - log.timestamp < WINDOW_MS);

  if (recentLogs.length >= MAX_REGISTRATIONS) {
    const oldestLog = recentLogs[0];
    const retryAfter = oldestLog
      ? Math.ceil((oldestLog.timestamp + WINDOW_MS - now) / 1000)
      : 3600;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfter),
      error: `Terlalu banyak registrasi dari IP ini. Coba lagi dalam ${Math.ceil(Math.max(1, retryAfter) / 60)} menit.`,
    };
  }

  recentLogs.push({ timestamp: now, count: 1 });
  registerRateLimitMap.set(ip, recentLogs);

  return { allowed: true, retryAfterSeconds: 0 };
}

// 1. Rate Limiter for Sortir Banned (Max 100,000 IDs per bulk job, Unlimited Throughput)
export function checkSortirRateLimit(
  userId: string,
  requestedCount: number
): {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  error?: string;
} {
  const MAX_PER_REQUEST = 100000;

  if (requestedCount > MAX_PER_REQUEST) {
    return {
      allowed: false,
      limit: MAX_PER_REQUEST,
      remaining: 0,
      retryAfterSeconds: 0,
      error: `BATCH_SIZE_EXCEEDED: Maksimal ${MAX_PER_REQUEST.toLocaleString()} ID per single job. Silakan perkecil ukuran batch Anda.`,
    };
  }

  return {
    allowed: true,
    limit: MAX_PER_REQUEST,
    remaining: 999999, // Unlimited total throughput
    retryAfterSeconds: 0,
  };
}

// 2. Rate Limiter for Intip Nomor (Max 10 IDs/req, Max 100 req/min)
export function checkIntipNomorRateLimit(
  userId: string,
  requestedCount: number
): {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  error?: string;
} {
  const MAX_PER_REQUEST = 10;
  const MAX_PER_MINUTE = 100; // 100 requests per minute
  const WINDOW_MS = 60 * 1000;
  const now = Date.now();

  if (requestedCount > MAX_PER_REQUEST) {
    return {
      allowed: false,
      limit: MAX_PER_MINUTE,
      remaining: 0,
      retryAfterSeconds: 0,
      error: `MAX_10_IDS_EXCEEDED: Maksimal ${MAX_PER_REQUEST} ID per request untuk fitur Intip Nomor.`,
    };
  }

  const userLogs = intipNomorRateLimitMap.get(userId) || [];
  const recentLogs = userLogs.filter((log) => now - log.timestamp < WINDOW_MS);
  const currentRequests = recentLogs.length;

  if (currentRequests >= MAX_PER_MINUTE) {
    const oldestLog = recentLogs[0];
    const retryAfter = oldestLog
      ? Math.ceil((oldestLog.timestamp + WINDOW_MS - now) / 1000)
      : 60;

    return {
      allowed: false,
      limit: MAX_PER_MINUTE,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfter),
      error: `RATE_LIMIT_EXCEEDED: Batas maksimum adalah ${MAX_PER_MINUTE} request per menit. Silakan tunggu ${Math.max(1, retryAfter)} detik.`,
    };
  }

  recentLogs.push({ timestamp: now, count: requestedCount });
  intipNomorRateLimitMap.set(userId, recentLogs);

  return {
    allowed: true,
    limit: MAX_PER_MINUTE,
    remaining: MAX_PER_MINUTE - (currentRequests + 1),
    retryAfterSeconds: 0,
  };
}

// 3. Rate Limiter for Cek Info Akun (Max 1 account/req, Max 20 req/hour)
export function checkCekInfoAkunRateLimit(
  userId: string,
  requestedCount: number = 1
): {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  error?: string;
} {
  const MAX_PER_REQUEST = 1;
  const MAX_PER_HOUR = 20; // 20 requests per hour
  const WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const now = Date.now();

  if (requestedCount > MAX_PER_REQUEST) {
    return {
      allowed: false,
      limit: MAX_PER_HOUR,
      remaining: 0,
      retryAfterSeconds: 0,
      error: `Fitur Cek Info Akun hanya mendukung 1 akun per request.`,
    };
  }

  const userLogs = cekInfoAkunRateLimitMap.get(userId) || [];
  const recentLogs = userLogs.filter((log) => now - log.timestamp < WINDOW_MS);
  const currentRequests = recentLogs.length;

  if (currentRequests >= MAX_PER_HOUR) {
    const oldestLog = recentLogs[0];
    const retryAfter = oldestLog
      ? Math.ceil((oldestLog.timestamp + WINDOW_MS - now) / 1000)
      : 3600;

    const retryMinutes = Math.ceil(retryAfter / 60);

    return {
      allowed: false,
      limit: MAX_PER_HOUR,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfter),
      error: `RATE_LIMIT_EXCEEDED: Batas Cek Info Akun adalah ${MAX_PER_HOUR} request per jam. Silakan coba kembali dalam ${retryMinutes} menit.`,
    };
  }

  recentLogs.push({ timestamp: now, count: 1 });
  cekInfoAkunRateLimitMap.set(userId, recentLogs);

  return {
    allowed: true,
    limit: MAX_PER_HOUR,
    remaining: MAX_PER_HOUR - (currentRequests + 1),
    retryAfterSeconds: 0,
  };
}
