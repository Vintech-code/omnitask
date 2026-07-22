import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { AppText, AppTextInput } from '@/components/ui/AppText';
import { fontFamily } from '@/theme/typography';

describe('app typography primitives', () => {
  it('uses Nunito Regular for ordinary text and inputs', async () => {
    const screen = await render(
      <>
        <AppText>OmniTask text</AppText>
        <AppTextInput placeholder="OmniTask input" />
      </>,
    );

    expect(StyleSheet.flatten(screen.getByText('OmniTask text').props.style).fontFamily).toBe(fontFamily.regular);
    expect(StyleSheet.flatten(screen.getByPlaceholderText('OmniTask input').props.style).fontFamily).toBe(fontFamily.regular);
  });

  it('allows a loaded Nunito weight to override the regular face', async () => {
    const screen = await render(<AppText style={{ fontFamily: fontFamily.black }}>Important</AppText>);
    expect(StyleSheet.flatten(screen.getByText('Important').props.style).fontFamily).toBe(fontFamily.black);
  });
});
