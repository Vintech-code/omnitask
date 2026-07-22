import React from 'react';
import { Group, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SceneProps } from './types';
export const Mountains = React.memo(({ width, height, clock, palette }: SceneProps) => {
  const back = React.useMemo(() => { const p = Skia.Path.Make(); p.moveTo(-40, height * .54); p.lineTo(width * .16, height * .31); p.lineTo(width * .32, height * .48); p.lineTo(width * .53, height * .23); p.lineTo(width * .72, height * .44); p.lineTo(width * .9, height * .27); p.lineTo(width + 40, height * .48); p.lineTo(width + 40, height * .67); p.lineTo(-40, height * .67); p.close(); return p; }, [height, width]);
  const front = React.useMemo(() => { const p = Skia.Path.Make(); p.moveTo(-30, height * .62); p.lineTo(width * .18, height * .43); p.lineTo(width * .38, height * .59); p.lineTo(width * .61, height * .38); p.lineTo(width * .82, height * .57); p.lineTo(width + 30, height * .46); p.lineTo(width + 30, height * .72); p.lineTo(-30, height * .72); p.close(); return p; }, [height, width]);
  const backTransform = useDerivedValue(() => [{ translateX: Math.sin(clock.value / 18000) * 4 }]); const frontTransform = useDerivedValue(() => [{ translateX: Math.sin(clock.value / 23000) * 7 }]);
  return <><Group transform={backTransform}><Path path={back} color={palette.mountainBack} opacity={.82} /></Group><Group transform={frontTransform}><Path path={front} color={palette.mountainFront} opacity={.96} /></Group></>;
});

