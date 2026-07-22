import React from 'react';
import { LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import type { SceneProps } from './types';
export const Sky = React.memo(({ width, height, palette }: SceneProps) => <Rect x={0} y={0} width={width} height={height}><LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[palette.skyTop, palette.skyBottom]} /></Rect>);

