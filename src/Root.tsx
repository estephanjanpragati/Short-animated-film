import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { CastSheet } from "./videos/mark/CastSheet";
import { MarkShort, MARK_FRAMES } from "./videos/mark/Mark";
import { NoahShort, NOAH_FRAMES } from "./videos/noah/Noah";
import { CainShort, CAIN_FRAMES } from "./videos/cain/Cain";
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MarkShort" component={MarkShort} durationInFrames={MARK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="NoahShort" component={NoahShort} durationInFrames={NOAH_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CainShort" component={CainShort} durationInFrames={CAIN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CastSheet" component={CastSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
