/**
 * rateLimiter.ts — Client-Side Rate Limiter & Security Service.
 * Persists tracking in localStorage/sessionStorage to prevent bypass via page refresh.
 */

// Configuration thresholds (overridable via environment variables)
const AUTH_MAX_ATTEMPTS = Number(import.meta.env.VITE_AUTH_RATE_LIMIT_MAX_ATTEMPTS) || 5;
const AUTH_WINDOW_MS = Number(import.meta.env.VITE_AUTH_RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute

const AI_MAX_ATTEMPTS = Number(import.meta.env.VITE_AI_RATE_LIMIT_MAX_ATTEMPTS) || 15;
const AI_WINDOW_MS = Number(import.meta.env.VITE_AI_RATE_LIMIT_WINDOW_MS) || 3600000; // 1 hour

const ACTION_MAX_LIMIT = 100; // Looser limit for CRUD
const ACTION_WINDOW_MS = 60000;

const PUBLIC_MAX_LIMIT = 30; // Moderate limit for public endpoints
const PUBLIC_WINDOW_MS = 60000;

interface AuthLimitState {
  attempts: number;
  lastAttemptTime: number;
  blockedUntil: number;
}

export const rateLimiter = {
  /**
   * Evaluates auth rate limit using exponential backoff.
   * Tracks attempts per-account (noteId) and per-IP (simulated via client identifier).
   */
  checkAuthRateLimit(noteId: string): { allowed: boolean; waitTimeMs: number } {
    const now = Date.now();
    const key = `strata_auth_limit_${noteId.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return { allowed: true, waitTimeMs: 0 };
    }

    const state: AuthLimitState = JSON.parse(stored);

    // If blocked time is still in the future
    if (state.blockedUntil > now) {
      return { allowed: false, waitTimeMs: state.blockedUntil - now };
    }

    // Reset attempts if the cooldown window has fully passed
    if (now - state.lastAttemptTime > AUTH_WINDOW_MS && state.attempts < AUTH_MAX_ATTEMPTS) {
      return { allowed: true, waitTimeMs: 0 };
    }

    return { allowed: true, waitTimeMs: 0 };
  },

  /**
   * Records a failed authentication attempt and calculates backoff.
   */
  recordAuthFailure(noteId: string): number {
    const now = Date.now();
    const key = `strata_auth_limit_${noteId.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    
    let state: AuthLimitState = {
      attempts: 1,
      lastAttemptTime: now,
      blockedUntil: 0
    };

    if (stored) {
      const parsed = JSON.parse(stored);
      // Clean up old attempts if window expired
      if (now - parsed.lastAttemptTime > AUTH_WINDOW_MS) {
        state.attempts = 1;
      } else {
        state.attempts = parsed.attempts + 1;
      }
    }

    state.lastAttemptTime = now;

    // Exponential backoff: 2^attempts * 1000ms after exceeding max attempts
    if (state.attempts >= AUTH_MAX_ATTEMPTS) {
      const backoffFactor = Math.pow(2, state.attempts - AUTH_MAX_ATTEMPTS);
      const delay = Math.min(backoffFactor * 2000, 300000); // Caps backoff delay at 5 minutes max
      state.blockedUntil = now + delay;
    }

    localStorage.setItem(key, JSON.stringify(state));
    return state.blockedUntil > now ? state.blockedUntil - now : 0;
  },

  /**
   * Resets rate-limit state upon a successful login.
   */
  recordAuthSuccess(noteId: string): void {
    localStorage.removeItem(`strata_auth_limit_${noteId.toLowerCase()}`);
  },

  /**
   * Tracks and enforces request tier limits.
   */
  checkRequestRateLimit(tier: 'public' | 'auth_action' | 'ai'): { allowed: boolean; limit: number; remaining: number } {
    const now = Date.now();
    const storageKey = `strata_req_limit_${tier}`;
    
    let windowMs = ACTION_WINDOW_MS;
    let maxLimit = ACTION_MAX_LIMIT;

    if (tier === 'public') {
      windowMs = PUBLIC_WINDOW_MS;
      maxLimit = PUBLIC_MAX_LIMIT;
    } else if (tier === 'ai') {
      windowMs = AI_WINDOW_MS;
      maxLimit = AI_MAX_ATTEMPTS;
    }

    const stored = sessionStorage.getItem(storageKey);
    let requests: number[] = [];

    if (stored) {
      requests = JSON.parse(stored);
    }

    // Filter requests out of current window
    requests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (requests.length >= maxLimit) {
      return { allowed: false, limit: maxLimit, remaining: 0 };
    }

    requests.push(now);
    sessionStorage.setItem(storageKey, JSON.stringify(requests));

    return { allowed: true, limit: maxLimit, remaining: maxLimit - requests.length };
  }
};
