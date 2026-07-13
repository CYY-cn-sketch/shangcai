import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Scene1 } from "./Scene1";
import { Scene2 } from "./Scene2";
import { Scene3 } from "./Scene3";
import { Scene4 } from "./Scene4";
import { Scene5 } from "./Scene5";
import { Scene6 } from "./Scene6";
import { VIDEO_CONFIG } from "./constants";

// 上海财经大学商学院 - AI 就业教练宣传视频
// 30秒 @ 30fps = 900 frames, 6 scenes × 150 frames each
export const SufeWorkbuddyComposition: React.FC = () => {
  const { sceneDuration } = VIDEO_CONFIG;
  return (
    <AbsoluteFill style={{ backgroundColor: "#F5F7FA" }}>
      <Sequence from={0} durationInFrames={sceneDuration}>
        <Scene1 />
      </Sequence>
      <Sequence from={sceneDuration} durationInFrames={sceneDuration}>
        <Scene2 />
      </Sequence>
      <Sequence from={sceneDuration * 2} durationInFrames={sceneDuration}>
        <Scene3 />
      </Sequence>
      <Sequence from={sceneDuration * 3} durationInFrames={sceneDuration}>
        <Scene4 />
      </Sequence>
      <Sequence from={sceneDuration * 4} durationInFrames={sceneDuration}>
        <Scene5 />
      </Sequence>
      <Sequence from={sceneDuration * 5} durationInFrames={sceneDuration}>
        <Scene6 />
      </Sequence>
    </AbsoluteFill>
  );
};
