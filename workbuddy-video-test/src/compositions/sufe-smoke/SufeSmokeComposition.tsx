import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SmokeScene } from "./SmokeScene";

export const SufeSmokeComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0F172A" }}>
      <Sequence from={0} durationInFrames={90}>
        <SmokeScene />
      </Sequence>
    </AbsoluteFill>
  );
};
