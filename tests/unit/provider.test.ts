import { afterEach, describe, expect, it, vi } from "vitest";
import { requestDeepSeekExpertReply, requestLexiangPptContext } from "../../src/api/provider";

describe("requestDeepSeekExpertReply", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the Java gateway and keeps provider credentials out of the browser request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ headerName: "X-XSRF-TOKEN", token: "csrf-test" }))
      .mockResolvedValueOnce(Response.json({ content: "专家回复", model: "deepseek-v4-flash" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestDeepSeekExpertReply({
        ideaId: "idea-001",
        expertId: "positioning",
        clientMessageId: "message-001",
      }),
    ).resolves.toEqual({ content: "专家回复", model: "deepseek-v4-flash" });

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/provider/deepseek/chat", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": "csrf-test",
      },
      body: JSON.stringify({
        ideaId: "idea-001",
        expertId: "positioning",
        clientMessageId: "message-001",
      }),
    });
    expect(JSON.stringify(fetchMock.mock.calls[1])).not.toContain("apiKey");
    expect(JSON.stringify(fetchMock.mock.calls[1])).not.toContain("Authorization");
  });

  it("uses the Java Lexiang gateway only to obtain PPT knowledge content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ headerName: "X-XSRF-TOKEN", token: "csrf-test" }))
      .mockResolvedValueOnce(Response.json({
        content: "封面｜用户痛点｜解决方案｜商业模式",
        sessionId: "lexiang-session-001",
        referenceDocs: [{ title: "路演结构模板" }],
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestLexiangPptContext({
        projectId: "idea-001",
        conversationId: "conversation-001",
        expertId: "pitch",
        query: "生成路演 PPT 逐页内容",
      }),
    ).resolves.toEqual({
      configured: true,
      content: "封面｜用户痛点｜解决方案｜商业模式",
      sessionId: "lexiang-session-001",
      references: [{ title: "路演结构模板" }],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/provider/lexiang/qa", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": "csrf-test",
      },
      body: JSON.stringify({
        projectId: "idea-001",
        conversationId: "conversation-001",
        expertId: "pitch",
        query: "生成路演 PPT 逐页内容",
        targets: [],
      }),
    });
    expect(JSON.stringify(fetchMock.mock.calls[1])).not.toContain("appKey");
    expect(JSON.stringify(fetchMock.mock.calls[1])).not.toContain("appSecret");
  });
});
