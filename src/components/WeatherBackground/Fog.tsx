import React from 'react';
import { Group, Oval, rect } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { AtmosphereProps } from './types';
export const Fog = React.memo(({ width, height, clock, intensity }: AtmosphereProps) => { const transform = useDerivedValue(() => [{ translateX: Math.sin(clock.value / 9000) * 42 }, { translateY: Math.sin(clock.value / 13000) * 8 }]); const opacity = useDerivedValue(() => intensity.value * .32); return <Group transform={transform} opacity={opacity}>{[0, 1, 2].map(i => <Oval key={i} rect={rect(-width * .2 + i * width * .34, height * (.48 + i * .035), width * .9, 100)} color="#E5EAEB" />)}</Group>; });

