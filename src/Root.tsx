import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { CastSheet } from "./videos/mark/CastSheet";
import { MarkShort, MARK_FRAMES } from "./videos/mark/Mark";
import { NoahShort, NOAH_FRAMES } from "./videos/noah/Noah";
import { CainShort, CAIN_FRAMES } from "./videos/cain/Cain";
import { CoverShort, COVER_FRAMES } from "./videos/cover/Cover";
import { MountainsShort, MOUNTAINS_FRAMES } from "./videos/mountains/Mountains";
import { AbrahamShort, ABRAHAM_FRAMES } from "./videos/abraham/Abraham";
import { AaronShort, AARON_FRAMES } from "./videos/aaron/Aaron";
import { Paul1Short, PAUL1_FRAMES } from "./videos/paul1/Paul1";
import { Paul2Short, PAUL2_FRAMES } from "./videos/paul2/Paul2";
import { EsauShort, ESAU_FRAMES } from "./videos/esau/Esau";
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MarkShort" component={MarkShort} durationInFrames={MARK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="NoahShort" component={NoahShort} durationInFrames={NOAH_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CainShort" component={CainShort} durationInFrames={CAIN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CoverShort" component={CoverShort} durationInFrames={COVER_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ lang: "en" }} />
    <Composition id="MountainsShort" component={MountainsShort} durationInFrames={MOUNTAINS_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ lang: "en" }} />
    <Composition id="AbrahamShort" component={AbrahamShort} durationInFrames={ABRAHAM_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ lang: "en" }} />
    <Composition id="AaronShort" component={AaronShort} durationInFrames={AARON_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ lang: "en" }} />
    <Composition id="Paul1Short" component={Paul1Short} durationInFrames={PAUL1_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Paul2Short" component={Paul2Short} durationInFrames={PAUL2_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EsauShort" component={EsauShort} durationInFrames={ESAU_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CastSheet" component={CastSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
