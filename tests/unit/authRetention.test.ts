import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_RETENTION_MS,
  clearAuthRetention,
  getAuthRetentionExpiry,
  markAuthRetention,
  shouldRestoreAuth,
} from "../../src/authRetention";

describe("auth retention", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("retains a successful login for eight hours in the tab and device", () => {
    const now = 1_000;
    expect(markAuthRetention(now)).toBe(now + AUTH_RETENTION_MS);
    expect(shouldRestoreAuth(now + 1)).toBe(true);
    expect(window.localStorage.length).toBe(1);
    expect(window.sessionStorage.length).toBe(1);
  });

  it("restores from device retention and expires exactly at eight hours", () => {
    const now = 2_000;
    const expiresAt = markAuthRetention(now);
    window.sessionStorage.clear();

    expect(getAuthRetentionExpiry(now + 1)).toBe(expiresAt);
    expect(shouldRestoreAuth(now + AUTH_RETENTION_MS - 1)).toBe(true);
    expect(shouldRestoreAuth(now + AUTH_RETENTION_MS)).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });

  it("clears both retention scopes on logout", () => {
    markAuthRetention(3_000);
    clearAuthRetention();

    expect(shouldRestoreAuth(3_001)).toBe(false);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
