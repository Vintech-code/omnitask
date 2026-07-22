import React from 'react';
import { Group, Oval, rect } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { AtmosphereProps } from './types';
export const Clouds = React.memo(({ width, height, clock, intensity }: AtmosphereProps) => {
  const slow = useDerivedValue(() => [{ translateX: ((clock.value * .006) % (width + 240)) - 180 }]);
  const fast = useDerivedValue(() => [{ translateX: -(((clock.value * .011) % (width + 260)) - 80) }]);
  const opacity = useDerivedValue(() => .18 + intensity.value * .48);
  return <Group opacity={opacity}><Group transform={slow}>{[-120, 120, 390].map((x, i) => <Oval key={i} rect={rect(x, height * (.12 + i * .025), 270, 78)} color="#D8DEE0" opacity={.42} />)}</Group><Group transform={fast}>{[-180, 100, 370].map((x, i) => <Oval key={i} rect={rect(x, height * (.24 + i * .018), 330, 92)} color="#7D898F" opacity={.34} />)}</Group></Group>;
});

