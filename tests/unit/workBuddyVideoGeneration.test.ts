import { describe, expect, it } from "vitest";
import {
  createWorkBuddyVideoJobInput,
  nextVideoGenerationRevision,
  videoGenerationIdempotencyKey,
} from "../../src/workBuddyVideoGeneration";

const asset = {
  id: "asset-001",
  ideaId: "idea-001",
  sourceMessageId: "message-001",
  title: "项目宣传视频",
  prompt: "正式高校风格",
  script: "30 秒脚本",
  storyboard: "六个镜头",
};

describe("WorkBuddy 视频任务边界", () => {
  it("同一版本始终使用同一个幂等键", () => {
    expect(videoGenerationIdempotencyKey(asset.id, 1)).toBe("workbuddy-video:asset-001:v1");
    expect(createWorkBuddyVideoJobInput(asset, 1).idempotencyKey).toBe(
      createWorkBuddyVideoJobInput(asset, 1).idempotencyKey,
    );
  });

  it("只有明确重新生成才增加版本", () => {
    expect(nextVideoGenerationRevision()).toBe(1);
    expect(nextVideoGenerationRevision(1)).toBe(2);
  });

  it("任务固定为多媒体专家并携带付费确认和冻结快照", () => {
    const input = createWorkBuddyVideoJobInput(asset, 2);

    expect(input.expertId).toBe("media");
    expect(input.costConfirmed).toBe(true);
    expect(input.contextSnapshot).toMatchObject({ assetId: "asset-001", revision: 2 });
    expect(JSON.stringify(input)).not.toContain("apiKey");
  });
});
