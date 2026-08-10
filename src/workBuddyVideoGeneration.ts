import type { SubmitGenerationJobInput } from "./api/generation";

export type WorkBuddyVideoAssetSnapshot = {
  id: string;
  ideaId: string;
  sourceMessageId?: string;
  title: string;
  prompt?: string;
  script?: string;
  storyboard?: string;
  posterPrompt?: string;
  visualPrompt?: string;
  referenceImageAssetIds?: string[];
};

export function nextVideoGenerationRevision(currentRevision?: number) {
  return Math.max(0, currentRevision || 0) + 1;
}

export function videoGenerationIdempotencyKey(assetId: string, revision: number) {
  return `workbuddy-video:${assetId}:v${revision}`;
}

export function buildWorkBuddyVideoPrompt(asset: WorkBuddyVideoAssetSnapshot) {
  return [
    "请根据平台已经确认的视频方案生成最终 MP4。",
    "只能使用本次任务快照中的内容和平台明确授权的参考资料，不得读取其他用户或其他任务文件。",
    "必须实际完成渲染；完成后将 MP4 写入平台指定的结果路径。",
    "",
    `视频标题：${asset.title}`,
    "",
    "模型/风格提示词：",
    asset.prompt || "",
    "",
    "视频脚本：",
    asset.script || "",
    "",
    "视频分镜：",
    asset.storyboard || "",
    "",
    "海报文案 Prompt：",
    asset.posterPrompt || "",
    "",
    "产品视觉图 Prompt：",
    asset.visualPrompt || "",
  ].join("\n");
}

export function createWorkBuddyVideoJobInput(
  asset: WorkBuddyVideoAssetSnapshot,
  revision: number,
): SubmitGenerationJobInput {
  return {
    artifactType: "VIDEO",
    projectId: asset.ideaId,
    conversationId: asset.sourceMessageId || asset.ideaId,
    ideaId: asset.ideaId,
    expertId: "media",
    contextSnapshot: {
      assetId: asset.id,
      revision,
      businessPrompt: buildWorkBuddyVideoPrompt(asset),
      referenceImageAssetIds: asset.referenceImageAssetIds || [],
    },
    idempotencyKey: videoGenerationIdempotencyKey(asset.id, revision),
    costConfirmed: true,
  };
}
