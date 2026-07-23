import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import * as Location from 'expo-location';

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#111111',
      textSub: '#444444',
      textDim: '#777777',
      glass: { solid: '#ffffff', border: '#dddddd' },
      accent: { base: '#12B9A9', soft: 'rgba(196,224,225,0.72)' },
      iconTile: { coral: '#F26841', cyan: '#34C7D9', teal: '#12B9A9', blue: '#20A6EB', foreground: '#EDEDEF' },
      semantic: { danger: '#dc2626' },
    },
  }),
}));
jest.mock('@/components/ui', () => ({
  AppBackground: () => {
    const ReactRuntime = require('react');
    const { View: NativeView } = require('react-native');
    return ReactRuntime.createElement(NativeView);
  },
}));

import { EventLocationPicker } from '@/components/events/EventLocationPicker';

describe('event location picker', () => {
  it('allows manual pin selection after location permission is denied', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <EventLocationPicker visible mapEnabled onCancel={jest.fn()} onSelect={onSelect} />,
    );

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();

    await fireEvent(screen.getByTestId('event-location-map'), 'press', {
      nativeEvent: { coordinate: { latitude: 14.5995, longitude: 120.9842 } },
    });
    await fireEvent.press(screen.getByText('Done'));
    expect(onSelect).toHaveBeenCalledWith({
      label: 'Pinned location',
      latitude: 14.5995,
      longitude: 120.9842,
    });
  });

  it('can clear a previously saved coordinate', async () => {
    const onClear = jest.fn();
    const screen = await render(
      <EventLocationPicker
        visible
        mapEnabled
        initialLabel="Old venue"
        initialLatitude={14.5}
        initialLongitude={121}
        onCancel={jest.fn()}
        onSelect={jest.fn()}
        onClear={onClear}
      />,
    );
    await fireEvent.press(screen.getByTestId('event-clear-location'));
    expect(onClear).toHaveBeenCalled();
  });

  it('does not mount the native map when the API key is missing', async () => {
    const screen = await render(
      <EventLocationPicker visible mapEnabled={false} onCancel={jest.fn()} onSelect={jest.fn()} />,
    );

    expect(screen.getByTestId('event-location-map-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('event-location-map')).toBeNull();
  });
});
