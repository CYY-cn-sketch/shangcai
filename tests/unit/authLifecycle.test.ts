import { describe, expect, it, vi } from "vitest";
import { logoutAndClearSession, restoreRetainedSession } from "../../src/authLifecycle";

describe("authLifecycle", () => {
  it("异步会话返回时保留已过期则清理本地状态并结束远端会话", async () => {
    const clearRetention = vi.fn();
    const logoutRemote = vi.fn().mockResolvedValue(undefined);

    await expect(restoreRetainedSession({
      loadSession: async () => ({ account: "student@sufe.demo" }),
      getRetentionExpiry: () => null,
      clearRetention,
      logoutRemote,
    })).resolves.toBeNull();
    expect(clearRetention).toHaveBeenCalledOnce();
    expect(logoutRemote).toHaveBeenCalledOnce();
  });

  it("异步会话返回时仍有效则同时返回会话和定时器截止时间", async () => {
    const session = { account: "student@sufe.demo" };

    await expect(restoreRetainedSession({
      loadSession: async () => session,
      getRetentionExpiry: () => 12_345,
      clearRetention: vi.fn(),
      logoutRemote: vi.fn(),
    })).resolves.toEqual({ session, expiresAt: 12_345 });
  });

  it("远端退出失败也始终执行本地退出清理", async () => {
    const clearLocalSession = vi.fn();
    const error = new Error("远端退出失败");

    await expect(logoutAndClearSession({
      logoutRemote: async () => {
        throw error;
      },
      clearLocalSession,
    })).resolves.toBe(error);
    expect(clearLocalSession).toHaveBeenCalledOnce();
  });
});
