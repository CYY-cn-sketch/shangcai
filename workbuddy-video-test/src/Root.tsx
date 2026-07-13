import React from "react";
import { Composition } from "remotion";
import { SufeSmokeComposition } from "./compositions/sufe-smoke/SufeSmokeComposition";
import { SufeWorkbuddyComposition } from "./compositions/sufe-workbuddy-video/VideoComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="sufe-smoke"
        component={SufeSmokeComposition}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="sufe-workbuddy-video"
        component={SufeWorkbuddyComposition}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
