import React from 'react';
import { Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { AtmosphereProps } from './types';

const effect = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;
uniform float intensity;
uniform float wind;
half4 main(float2 xy) {
  float2 uv = xy / resolution;
  float2 cell = float2(uv.x * 82.0, uv.y * 118.0);
  float2 id = floor(cell);
  float random = fract(sin(dot(id, float2(12.9898, 78.233))) * 43758.5453);
  float speed = 0.55 + random * 0.9;
  float2 local = fract(cell + float2(time * wind * 0.00008, time * speed * 0.0012 + random));
  float streak = smoothstep(0.075, 0.0, abs(local.x - 0.5));
  streak *= smoothstep(0.82, 0.25, local.y) * smoothstep(0.02, 0.18, local.y);
  float alpha = streak * intensity * (0.2 + random * 0.62);
  return half4(0.72, 0.86, 0.9, alpha);
}`);

export const Rain = React.memo(({ width, height, clock, intensity }: AtmosphereProps & { wind?: number }) => {
  const uniforms = useDerivedValue(() => ({ resolution: [width, height], time: clock.value, intensity: intensity.value, wind: .8 }));
  if (!effect) return null;
  return <Fill><Shader source={effect} uniforms={uniforms} /></Fill>;
});

