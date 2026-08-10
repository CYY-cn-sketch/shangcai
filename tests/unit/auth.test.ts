import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCurrentAuth } from "../../src/api/auth";

describe("loadCurrentAuth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats a 204 response as an anonymous browser session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadCurrentAuth()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("returns the authenticated profile", async () => {
    const session = {
      id: "A-STU-001",
      role: "student",
      name: "测试学生",
      account: "student@sufe.demo",
      title: "创业实践课学生",
      avatarId: "student-boy",
      quota: 100,
      disabledPermissions: [],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(session)));

    await expect(loadCurrentAuth()).resolves.toEqual(session);
  });
});
