import React from 'react';
import {Composition} from 'remotion';
import {DURATION, FPS, H, LinkYouAd, W} from './LinkYouAd';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LinkYouAd"
      component={LinkYouAd}
      durationInFrames={DURATION}
      fps={FPS}
      width={W}
      height={H}
    />
  );
};
