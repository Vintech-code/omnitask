import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { AtmosphereProps } from './types';
export const Lightning = React.memo(({ width, height, clock, intensity }: AtmosphereProps) => { const opacity = useDerivedValue(() => { const pulse = Math.max(0, Math.sin(clock.value / 1270) - .965) * 28.5; return Math.min(.48, pulse * pulse * intensity.value); }); return <Rect x={0} y={0} width={width} height={height} color="#F2FAFF" opacity={opacity} />; });

