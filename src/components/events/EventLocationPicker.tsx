import { fontFamily } from '@/theme/typography';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import MapView, { MapPressEvent, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { AppBackground } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme';

export interface EventLocationSelection {
  label: string;
  latitude: number;
  longitude: number;
}

interface EventLocationPickerProps {
  visible: boolean;
  initialLabel?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  onCancel: () => void;
  onSelect: (selection: EventLocationSelection) => void;
  onClear?: () => void;
  mapEnabled?: boolean;
}

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function EventLocationPicker({
  visible,
  initialLabel = '',
  initialLatitude,
  initialLongitude,
  onCancel,
  onSelect,
  onClear,
  mapEnabled,
}: EventLocationPickerProps) {
  const { theme } = useTheme();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [label, setLabel] = useState(initialLabel);
  const [status, setStatus] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadTimedOut, setMapLoadTimedOut] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const mapsConfigured = mapEnabled ?? Constants.expoConfig?.extra?.googleMapsConfigured === true;

  const describeCoordinate = async (latitude: number, longitude: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = result[0];
      if (!place) return;
      const description = [place.name, place.street, place.city, place.region, place.country]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(', ');
      if (description) setLabel(description);
    } catch {
      setStatus('The point was selected, but its address could not be resolved. You can enter a label manually.');
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setStatus(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('Location permission was denied. You can still tap a point on the map.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinate(next);
      setRegion(previous => ({ ...previous, ...next, latitudeDelta: 0.025, longitudeDelta: 0.025 }));
      await describeCoordinate(next.latitude, next.longitude);
    } catch {
      setStatus('Your current location could not be read. Tap a point on the map instead.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setMapLoaded(false);
    setMapLoadTimedOut(false);
    setLabel(initialLabel);
    setStatus(null);
    if (typeof initialLatitude === 'number' && typeof initialLongitude === 'number') {
      const next = { latitude: initialLatitude, longitude: initialLongitude };
      setCoordinate(next);
      setRegion(previous => ({ ...previous, ...next }));
    } else {
      setCoordinate(null);
      if (initialLabel) {
        setStatus('This saved location has no map pin yet. Tap the map or use your current location.');
      } else {
        void useCurrentLocation();
      }
    }
  }, [visible, initialLatitude, initialLongitude, initialLabel]);

  useEffect(() => {
    if (!visible || !mapsConfigured || mapLoaded) return;
    const timeout = setTimeout(() => setMapLoadTimedOut(true), 12_000);
    return () => clearTimeout(timeout);
  }, [visible, mapsConfigured, mapLoaded, mapAttempt]);

  const selectPoint = (event: MapPressEvent) => {
    const next = event.nativeEvent.coordinate;
    setCoordinate(next);
    setStatus(null);
    void describeCoordinate(next.latitude, next.longitude);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AppBackground />
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" style={styles.headerAction} onPress={onCancel}>
            <Text style={[styles.cancel, { color: theme.textSub }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Choose location</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !coordinate }}
            disabled={!coordinate}
            style={styles.headerAction}
            onPress={() => coordinate && onSelect({ ...coordinate, label: label.trim() || 'Pinned location' })}
          >
            <Text style={[styles.done, { color: coordinate ? theme.accent.base : theme.textDim }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.mapFrame, { borderColor: theme.glass.border }]}>
          {mapsConfigured ? (
            <MapView
              key={`event-location-map-${mapAttempt}`}
              testID="event-location-map"
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_GOOGLE}
              mapType="standard"
              region={region}
              onRegionChangeComplete={setRegion}
              onPress={selectPoint}
              onMapLoaded={() => {
                setMapLoaded(true);
                setMapLoadTimedOut(false);
              }}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {coordinate ? <Marker coordinate={coordinate} pinColor={theme.accent.base} /> : null}
            </MapView>
          ) : (
            <View testID="event-location-map-unavailable" style={[styles.mapUnavailable, { backgroundColor: theme.glass.solid }]}>
              <View style={[styles.mapUnavailableIcon, { backgroundColor: theme.accent.soft }]}>
                <Ionicons name="map-outline" size={30} color={theme.accent.base} />
              </View>
              <Text style={[styles.mapUnavailableTitle, { color: theme.text }]}>Map unavailable in this build</Text>
              <Text style={[styles.mapUnavailableText, { color: theme.textSub }]}>Use your current location now, or rebuild OmniTask with its Google Maps API key to choose a pin.</Text>
            </View>
          )}
          {mapsConfigured && !mapLoaded ? (
            <View style={[styles.mapLoading, { backgroundColor: theme.glass.solid }]}>
              {mapLoadTimedOut ? (
                <>
                  <Ionicons name="map-outline" size={30} color={theme.accent.base} />
                  <Text style={[styles.mapLoadingTitle, { color: theme.text }]}>Map couldn’t load</Text>
                  <Text style={[styles.mapLoadingText, { color: theme.textSub }]}>Check your connection and Google Maps key access, then try again.</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.retryButton, { backgroundColor: theme.accent.base }]}
                    onPress={() => {
                      setMapLoaded(false);
                      setMapLoadTimedOut(false);
                      setMapAttempt(value => value + 1);
                    }}
                  >
                    <Ionicons name="refresh" size={17} color="#fff" />
                    <Text style={styles.retryText}>Retry map</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <ActivityIndicator size="large" color={theme.accent.base} />
                  <Text style={[styles.mapLoadingTitle, { color: theme.text }]}>Loading map…</Text>
                </>
              )}
            </View>
          ) : null}
          <TouchableOpacity
            testID="event-use-current-location"
            accessibilityRole="button"
            style={[styles.currentButton, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}
            onPress={() => void useCurrentLocation()}
            disabled={locating}
          >
            <Ionicons name="locate-outline" size={19} color={theme.accent.base} />
            <Text style={[styles.currentLabel, { color: theme.text }]}>{locating ? 'Locating...' : 'Use my location'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={[styles.fieldLabel, { color: theme.textSub }]}>Location label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Venue, address, or meeting point"
            placeholderTextColor={theme.textDim}
            style={[styles.input, { color: theme.text, backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}
          />
          {status ? (
            <View style={[styles.status, { backgroundColor: theme.accent.soft }]}>
              <Ionicons name="information-circle-outline" size={18} color={theme.accent.base} />
              <Text style={[styles.statusText, { color: theme.textSub }]}>{status}</Text>
            </View>
          ) : null}
          <Text style={[styles.hint, { color: theme.textDim }]}>
            {mapsConfigured ? 'Tap anywhere on the map to move the event pin.' : 'A map pin requires a Maps-enabled app build.'}
          </Text>
          {onClear && (initialLabel || coordinate) ? (
            <TouchableOpacity testID="event-clear-location" accessibilityRole="button" style={styles.clearButton} onPress={onClear}>
              <Ionicons name="close-circle-outline" size={17} color={theme.semantic.danger} />
              <Text style={[styles.clearText, { color: theme.semantic.danger }]}>Clear location</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { height: 62, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerAction: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  cancel: { fontSize: 15, fontFamily: fontFamily.semibold },
  done: { fontSize: 15, fontFamily: fontFamily.bold, textAlign: 'right' },
  title: { fontSize: 18, fontFamily: fontFamily.bold },
  mapFrame: { flex: 1, marginHorizontal: 16, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  mapUnavailable: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mapUnavailableIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  mapUnavailableTitle: { fontSize: 17, fontFamily: fontFamily.extrabold, textAlign: 'center', marginBottom: 7 },
  mapUnavailableText: { maxWidth: 310, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mapLoadingTitle: { fontSize: 16, fontFamily: fontFamily.extrabold, textAlign: 'center', marginTop: 12 },
  mapLoadingText: { maxWidth: 290, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  retryButton: { minHeight: 44, borderRadius: radii.pill, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  retryText: { color: '#fff', fontSize: 13, fontFamily: fontFamily.extrabold },
  currentButton: { position: 'absolute', right: 12, top: 12, minHeight: 44, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  currentLabel: { fontSize: 13, fontFamily: fontFamily.bold },
  form: { padding: 16 },
  fieldLabel: { fontSize: 13, fontFamily: fontFamily.semibold, marginBottom: 7 },
  input: { minHeight: 52, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  status: { borderRadius: radii.md, padding: 12, marginTop: 10, flexDirection: 'row', gap: 8 },
  statusText: { flex: 1, fontSize: 12, lineHeight: 17 },
  hint: { fontSize: 12, marginTop: 9 },
  clearButton: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  clearText: { fontSize: 13, fontFamily: fontFamily.bold },
});
