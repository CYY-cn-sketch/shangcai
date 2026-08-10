const TAB_RETENTION_KEY = "sufe.auth.tab-retention";
const DEVICE_RETENTION_KEY = "sufe.auth.device-retention";

export const AUTH_RETENTION_HOURS = 8;
export const AUTH_RETENTION_MS = AUTH_RETENTION_HOURS * 60 * 60 * 1000;

type RetentionRecord = {
  expiresAt: number;
};

function readExpiry(storage: Storage, key: string, now: number) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RetentionRecord>;
    if (typeof parsed.expiresAt !== "number" || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= now) {
      storage.removeItem(key);
      return null;
    }
    return parsed.expiresAt;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Browser privacy settings may disable storage. In that case the session is not retained.
    }
    return null;
  }
}

function writeExpiry(storage: Storage, key: string, expiresAt: number) {
  try {
    storage.setItem(key, JSON.stringify({ expiresAt } satisfies RetentionRecord));
  } catch {
    // Retention is an optional convenience; authentication remains in the httpOnly server cookie.
  }
}

function removeKey(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function getAuthRetentionExpiry(now = Date.now()) {
  if (typeof window === "undefined") return null;
  const tabExpiry = readExpiry(window.sessionStorage, TAB_RETENTION_KEY, now);
  const deviceExpiry = readExpiry(window.localStorage, DEVICE_RETENTION_KEY, now);
  if (tabExpiry === null) return deviceExpiry;
  if (deviceExpiry === null) return tabExpiry;
  return Math.max(tabExpiry, deviceExpiry);
}

export function shouldRestoreAuth(now = Date.now()) {
  return getAuthRetentionExpiry(now) !== null;
}

export function markAuthRetention(now = Date.now()) {
  if (typeof window === "undefined") return null;
  const expiresAt = now + AUTH_RETENTION_MS;
  writeExpiry(window.sessionStorage, TAB_RETENTION_KEY, expiresAt);
  writeExpiry(window.localStorage, DEVICE_RETENTION_KEY, expiresAt);
  return expiresAt;
}

export function clearAuthRetention() {
  if (typeof window === "undefined") return;
  removeKey(window.sessionStorage, TAB_RETENTION_KEY);
  removeKey(window.localStorage, DEVICE_RETENTION_KEY);
}
