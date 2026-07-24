import React, { memo, useEffect, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { fontFamily } from '@/theme/typography';
import { AppText as Text } from './AppText';

interface WheelPickerColumnProps {
  items: readonly string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
  itemHeight?: number;
  resetKey?: string | number;
  selectedFontSize?: number;
  adjacentFontSize?: number;
  distantFontSize?: number;
}

export const WheelPickerColumn = memo(function WheelPickerColumn({
  items,
  selectedIndex,
  onSelect,
  width = 80,
  itemHeight = 54,
  resetKey,
  selectedFontSize = 34,
  adjacentFontSize = 26,
  distantFontSize = 20,
}: WheelPickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [itemHeight, resetKey, selectedIndex]);

  const selectFromScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
    onSelect(Math.max(0, Math.min(items.length - 1, index)));
  };

  return (
    <View style={{ width, height: itemHeight * 5, overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: itemHeight * 2,
          height: itemHeight,
          backgroundColor: theme.accent.soft,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.accent.base,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={selectFromScroll}
        onScrollEndDrag={selectFromScroll}
        contentContainerStyle={{ paddingVertical: itemHeight * 2 }}
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const isSelected = distance === 0;
          const isAdjacent = distance === 1;
          return (
            <TouchableOpacity
              key={`${item}-${index}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => {
                onSelect(index);
                scrollRef.current?.scrollTo({ y: index * itemHeight, animated: true });
              }}
            >
              <Text
                style={{
                  fontSize: isSelected
                    ? selectedFontSize
                    : isAdjacent
                      ? adjacentFontSize
                      : distantFontSize,
                  fontFamily: isSelected ? fontFamily.bold : fontFamily.regular,
                  color: isSelected
                    ? theme.content.primary
                    : isAdjacent
                      ? theme.content.secondary
                      : theme.content.muted,
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

