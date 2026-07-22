import type * as Location from 'expo-location';

const PLUS_CODE = /\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i;
const BARANGAY_NAME = /\b(?:barangay|brgy\.?)\b/i;

function usable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && !PLUS_CODE.test(trimmed) ? trimmed : null;
}

/** Produces a short weather label without changing the full addresses used by Events. */
export function weatherLocationLabel(address?: Location.LocationGeocodedAddress): string {
  if (!address) return 'Current location';

  const district = usable(address.district);
  const name = usable(address.name);
  const explicitBarangay = [district, name].find(value => value && BARANGAY_NAME.test(value));

  return explicitBarangay
    ?? usable(address.city)
    ?? district
    ?? usable(address.subregion)
    ?? usable(address.region)
    ?? 'Current location';
}

export function storedWeatherLocationLabel(label?: string | null): string {
  return usable(label) ?? 'Current location';
}
