import type * as Location from 'expo-location';

import { storedWeatherLocationLabel, weatherLocationLabel } from '@/utils/weatherLocation';

const address = (values: Partial<Location.LocationGeocodedAddress>) => values as Location.LocationGeocodedAddress;

describe('weatherLocationLabel', () => {
  it('uses the city instead of an Android Plus Code', () => {
    expect(weatherLocationLabel(address({ name: 'FPHJ+4G3', city: 'Quezon City', region: 'Metro Manila' }))).toBe('Quezon City');
  });

  it('prefers an explicitly named barangay when available', () => {
    expect(weatherLocationLabel(address({ district: 'Barangay Commonwealth', city: 'Quezon City' }))).toBe('Barangay Commonwealth');
  });

  it('falls back through administrative areas without returning a Plus Code', () => {
    expect(weatherLocationLabel(address({ name: '7Q63+M5', subregion: 'Cavite' }))).toBe('Cavite');
    expect(weatherLocationLabel(address({ name: '7Q63+M5' }))).toBe('Current location');
  });

  it('does not restore an old cached Plus Code while offline', () => {
    expect(storedWeatherLocationLabel('FPHJ+4G3')).toBe('Current location');
    expect(storedWeatherLocationLabel('Quezon City')).toBe('Quezon City');
  });
});
