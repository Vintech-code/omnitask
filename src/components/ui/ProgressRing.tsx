import React, { memo } from 'react';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  progress: number;
  color: string;
  size: number;
  strokeWidth: number;
  trackColor: string;
}

export const ProgressRing = memo(function ProgressRing({
  progress,
  color,
  size,
  strokeWidth,
  trackColor,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(1, progress));

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - normalized)}
      />
    </Svg>
  );
});
