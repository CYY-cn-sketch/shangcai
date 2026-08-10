import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLatestLexiangPullRun,
  listLexiangKnowledgeMappings,
  pullLexiangKnowledge,
  updateLexiangKnowledgeMapping,
} from "../../src/api/knowledge";

const run = {
  id: "pull-001",
  configured: true,
  status: "COMPLETED",
  startedAt: "2026-08-07T01:30:00Z",
  completedAt: "2026-08-07T01:31:30Z",
  addedCount: 4,
  updatedCount: 3,
  missingCount: 2,
  conflictCount: 1,
  failedCount: 0,
};

describe("乐享课程知识回拉 API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("从知识库后端读取最近一次同步摘要", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(run));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLatestLexiangPullRun()).resolves.toEqual(run);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/knowledge/lexiang/pull-runs/latest",
      { credentials: "include", headers: { Accept: "application/json" } },
    );
  });

  it("尚无同步记录时把 204 视为暂无摘要", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })));

    await expect(getLatestLexiangPullRun()).resolves.toBeNull();
  });

  it("显式同步通过受 CSRF 保护的知识库后端发起", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ headerName: "X-XSRF-TOKEN", token: "csrf-test" }))
      .mockResolvedValueOnce(Response.json(run));
    vi.stubGlobal("fetch", fetchMock);

    await expect(pullLexiangKnowledge()).resolves.toEqual(run);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/knowledge/lexiang/pull", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": "csrf-test",
      },
      body: "{}",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("LEXIANG_APP_SECRET");
  });

  it("按知识库 ID 读取并保存乐享空间映射，不提交供应商密钥", async () => {
    const mapping = {
      baseId: "base-course-001",
      spaceId: "space-course",
      parentEntryId: "entry-parent",
      enabled: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json([mapping]))
      .mockResolvedValueOnce(Response.json({ headerName: "X-XSRF-TOKEN", token: "csrf-test" }))
      .mockResolvedValueOnce(Response.json(mapping));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listLexiangKnowledgeMappings()).resolves.toEqual([mapping]);
    await expect(updateLexiangKnowledgeMapping(mapping)).resolves.toEqual(mapping);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/knowledge/lexiang/mappings", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/knowledge/lexiang/mappings", {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": "csrf-test",
      },
      body: JSON.stringify(mapping),
    });
    expect(String(fetchMock.mock.calls[2]?.[1]?.body)).not.toMatch(/appKey|appSecret|token/i);
  });
});
