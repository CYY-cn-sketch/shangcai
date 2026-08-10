import { describe, expect, it } from "vitest";
import { attemptPostMutationRefresh } from "../../src/postMutationRefresh";

describe("postMutationRefresh", () => {
  it("把列表刷新失败作为独立结果返回，不把已完成写操作误报为失败", async () => {
    const error = new Error("列表接口暂时不可用");
    const outcome = await attemptPostMutationRefresh(async () => {
      throw error;
    });

    expect(outcome).toEqual({ refreshed: false, error });
  });

  it("列表刷新成功时返回明确成功结果", async () => {
    await expect(attemptPostMutationRefresh(async () => undefined)).resolves.toEqual({ refreshed: true });
  });
});
