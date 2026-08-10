import { describe, expect, it } from "vitest";
import { getArtifactType } from "../../src/expertGeneration";

describe("expert artifact routing", () => {
  it("为全部内置专家提供语义意图识别所需的候选成果类型", () => {
    expect({
      brainstorm: getArtifactType("brainstorm"),
      positioning: getArtifactType("positioning"),
      market: getArtifactType("market"),
      business: getArtifactType("business"),
      pitch: getArtifactType("pitch"),
      script: getArtifactType("script"),
      defense: getArtifactType("defense"),
      media: getArtifactType("media"),
    }).toEqual({
      brainstorm: "BRAINSTORM",
      positioning: "POSITIONING",
      market: "MARKET",
      business: "BP",
      pitch: "PPT",
      script: "SCRIPT",
      defense: "DEFENSE",
      media: "MEDIA",
    });
  });
});
