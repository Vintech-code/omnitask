import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BurgerMenu } from '@/components/BurgerMenu';
import { useAlarmStore, Alarm, Period } from '@/context/AlarmStore';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { styles } from './styles';


const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Built-in sounds mapped to bundled asset files
const BUILT_IN_SOUNDS: { label: string; file: any }[] = [
  { label: 'Silent',                  file: null },
  { label: 'Marimba Ringtone',        file: require('../../../assets/sounds/mixkit-marimba-ringtone-1359.wav') },
  { label: 'Marimba Waiting',         file: require('../../../assets/sounds/mixkit-marimba-waiting-ringtone-1360.wav') },
  { label: 'Waiting Ringtone',        file: require('../../../assets/sounds/mixkit-waiting-ringtone-1354.wav') },
  { label: 'On Hold Ringtone',        file: require('../../../assets/sounds/mixkit-on-hold-ringtone-1361.wav') },
  { label: 'Funky Triplets',          file: require('../../../assets/sounds/mixkit-funky-triplets-1141.mp3') },
  { label: 'Gimme That Groove',       file: require('../../../assets/sounds/mixkit-gimme-that-groove-872.mp3') },
  { label: 'Dirty Thinkin',           file: require('../../../assets/sounds/mixkit-dirty-thinkin-989.mp3') },
  { label: 'Love',                    file: require('../../../assets/sounds/mixkit-love-787.mp3') },
  { label: 'Sounds Good',             file: require('../../../assets/sounds/mixkit-sounds-good-1077.mp3') },
  { label: 'Little Birds',            file: require('../../../assets/sounds/mixkit-little-birds-singing-in-the-trees-17.wav') },
  { label: 'Rooster Crowing',         file: require('../../../assets/sounds/mixkit-rooster-crowing-in-the-morning-2462.wav') },
  { label: 'Cow Moo',                 file: require('../../../assets/sounds/mixkit-cow-moo-in-the-barn-1751.wav') },
  { label: 'Barking Dogs',            file: require('../../../assets/sounds/mixkit-horde-of-barking-dogs-60.wav') },
  { label: 'Cheers & Applause',       file: require('../../../assets/sounds/mixkit-small-group-cheer-and-applause-518.wav') },
  { label: 'Man Coughing',            file: require('../../../assets/sounds/mixkit-young-man-coughing-2227.wav') },
];

const SOUNDS = BUILT_IN_SOUNDS.map(s => s.label);
const SNOOZE_OPTIONS = [5, 10, 15, 20, 25, 30];
const HOURS_LIST   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS_LIST = ['AM', 'PM'];

const ITEM_H = 58;

function toMinutes(hour: number, minute: number, period: Period): number {
  let h = hour;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + minute;
}

function timeUntil(hour: number, minute: number, period: Period): string {
  const now = new Date();
  let h = hour;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const target = new Date(now);
  target.setHours(h, minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  const diff = Math.floor((target.getTime() - now.getTime()) / 60000);
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs === 0) return `${mins} minute${mins !== 1 ? 's' : ''}`;
  if (mins === 0) return `${hrs} hour${hrs !== 1 ? 's' : ''}`;
  return `${hrs} hour${hrs !== 1 ? 's' : ''} and ${mins} minute${mins !== 1 ? 's' : ''}`;
}

function getRepeatLabel(days: boolean[]): string {
  const count = days.filter(Boolean).length;
  if (count === 0) return 'Once';
  if (count === 7) return 'Every day';
  const weekdays = [false, true, true, true, true, true, false];
  const weekends = [true, false, false, false, false, false, true];
  if (days.every((d, i) => d === weekdays[i])) return 'Weekdays';
  if (days.every((d, i) => d === weekends[i])) return 'Weekends';
  return days.map((d, i) => (d ? DAY_NAMES[i].slice(0, 3) : null)).filter(Boolean).join(', ');
}

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// --- Wheel Picker Column ----------------------------------------------------
interface WheelColProps {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  width?: number;
}

function WheelCol({ items, selectedIndex, onSelect, width = 80 }: WheelColProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    onSelect(clamped);
  };

  return (
    <View style={{ width, height: ITEM_H * 5, overflow: 'hidden' }}>
      {/* centre-selection highlight band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: 0, right: 0,
          top: ITEM_H * 2, height: ITEM_H,
          backgroundColor: 'rgba(74,144,217,0.10)',
          borderTopWidth: 1, borderBottomWidth: 1, borderColor: BLUE,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          const isSelected = dist === 0;
          const isAdjacent = dist === 1;
          return (
            <TouchableOpacity
              key={i}
              style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: isSelected ? 38 : isAdjacent ? 30 : 24,
                  fontWeight: isSelected ? '700' : '400',
                  color: isSelected ? theme.text : isAdjacent ? theme.textSub : theme.textDim,
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
}

// --- Settings Row ------------------------------------------------------------
function SettingRow({
  label, value, onPress, isSwitch, switchVal, onSwitch,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  isSwitch?: boolean;
  switchVal?: boolean;
  onSwitch?: (v: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={!isSwitch ? onPress : undefined}
      activeOpacity={isSwitch ? 1 : 0.6}
    >
      <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      {isSwitch ? (
        <Switch
          value={switchVal}
          onValueChange={onSwitch}
          trackColor={{ false: '#E0E0E0', true: '#B8D4F5' }}
          thumbColor={switchVal ? BLUE : '#f0f0f0'}
        />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.settingValue, { color: theme.textDim }]}>{value}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// --- Animated icon button ----------------------------------------------------
function AnimIconBtn({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const sc = useRef(new Animated.Value(1)).current;
  const pi = () => Animated.spring(sc, { toValue: 0.82, useNativeDriver: true, speed: 30 }).start();
  const po = () => Animated.spring(sc, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();
  const childNode =
    typeof children === 'string' || typeof children === 'number'
      ? <Text>{children}</Text>
      : children;
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <TouchableOpacity onPressIn={pi} onPressOut={po} onPress={onPress} activeOpacity={1}>
        {childNode}
      </TouchableOpacity>
    </Animated.View>
  );
}

// --- Main Component ----------------------------------------------------------
export default function AlarmScreen({ navigation }: any) {
  const { alarms, isLoading, addAlarm, updateAlarm, removeAlarm, toggleAlarm: storeToggleAlarm } = useAlarmStore();
  const { theme } = useTheme();

  // -- Sound preview ref
  const soundRef = useRef<Audio.Sound | null>(null);
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  // Custom sounds added by user { label, uri }
  const [customSounds, setCustomSounds] = useState<{ label: string; uri: string }[]>([]);

  const stopPreview = async () => {
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
    setPreviewingSound(null);
  };

  const previewSound = async (soundLabel: string) => {
    await stopPreview();
    // Custom sound?
    const custom = customSounds.find(c => c.label === soundLabel);
    const builtIn = BUILT_IN_SOUNDS.find(b => b.label === soundLabel);
    const source = custom ? { uri: custom.uri } : builtIn?.file ?? null;
    if (!source) return; // Silent
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
      soundRef.current = sound;
      setPreviewingSound(soundLabel);
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          setPreviewingSound(null);
          soundRef.current = null;
        }
      });
    } catch { /* can't preview */ }
  };

  const pickCustomSound = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      const label = asset.name.replace(/\.[^.]+$/, ''); // strip extension
      if (customSounds.some(c => c.uri === asset.uri)) {
        Alert.alert('Already added', `"${label}" is already in your sounds.`);
        return;
      }
      setCustomSounds(prev => [...prev, { label, uri: asset.uri }]);
    } catch { /* cancelled */ }
  };

  // Clean up preview on unmount
  useEffect(() => () => { stopPreview(); }, []);

  // -- Edit modal ----------------------------------------------------------
  const [modalVisible, setModalVisible]     = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [modalKey, setModalKey]             = useState(0);

  // wheel state
  const [formHourIdx,   setFormHourIdx]   = useState(0);
  const [formMinuteIdx, setFormMinuteIdx] = useState(0);
  const [formPeriodIdx, setFormPeriodIdx] = useState(0);
  // settings state
  const [formLabel,        setFormLabel]        = useState('');
  const [formSound,        setFormSound]        = useState('Default alarm sound');
  const [formDays,         setFormDays]         = useState<boolean[]>([true,true,true,true,true,true,true]);
  const [formSnooze,       setFormSnooze]       = useState(5);
  const [formSkipHolidays, setFormSkipHolidays] = useState(false);
  const [formVibrate,      setFormVibrate]      = useState(true);

  // -- Sub-modals ----------------------------------------------------------
  const [repeatModal, setRepeatModal] = useState(false);
  const [repeatDraft, setRepeatDraft] = useState<boolean[]>([true,true,true,true,true,true,true]);
  const [snoozeModal, setSnoozeModal] = useState(false);
  const [soundModal,  setSoundModal]  = useState(false);
  const [labelModal,  setLabelModal]  = useState(false);
  const [tempLabel,   setTempLabel]   = useState('');

  // -- Derived -------------------------------------------------------------
  const activeCount = alarms.filter(a => a.active).length;
  const nextAlarm = useMemo(() => {
    const active = alarms.filter(a => a.active);
    if (!active.length) return null;
    return [...active].sort(
      (a, b) => toMinutes(a.hour, a.minute, a.period) - toMinutes(b.hour, b.minute, b.period)
    )[0];
  }, [alarms]);

  // -- Handlers ------------------------------------------------------------
  const toggleAlarm = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    storeToggleAlarm(id);
  };

  const confirmDelete = (id: string, label: string) =>
    Alert.alert('Delete Alarm', `Delete "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); removeAlarm(id); } },
    ]);

  const duplicateAlarm = (alarm: Alarm) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addAlarm({ ...alarm, id: Date.now().toString(), label: `${alarm.label} (copy)`, active: false });
  };

  const openAlarmMenu = (alarm: Alarm) =>
    Alert.alert(alarm.label, undefined, [
      { text: 'Edit',      onPress: () => openEdit(alarm) },
      { text: 'Duplicate', onPress: () => duplicateAlarm(alarm) },
      { text: alarm.active ? 'Disable' : 'Enable', onPress: () => toggleAlarm(alarm.id) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(alarm.id, alarm.label) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const openAdd = () => {
    setEditingId(null);
    setFormHourIdx(6);        // 07
    setFormMinuteIdx(0);
    setFormPeriodIdx(0);      // AM
    setFormLabel('');
    setFormSound('Default alarm sound');
    setFormDays([false,true,true,true,true,true,false]);
    setFormSnooze(5);
    setFormSkipHolidays(false);
    setFormVibrate(true);
    setModalKey(k => k + 1);
    setModalVisible(true);
  };

  const openEdit = (alarm: Alarm) => {
    setEditingId(alarm.id);
    setFormHourIdx(alarm.hour - 1);
    setFormMinuteIdx(alarm.minute);
    setFormPeriodIdx(alarm.period === 'AM' ? 0 : 1);
    setFormLabel(alarm.label);
    setFormSound(alarm.sound);
    setFormDays([...alarm.days]);
    setFormSnooze(alarm.snooze);
    setFormSkipHolidays(alarm.skipHolidays);
    setFormVibrate(alarm.vibrate);
    setModalKey(k => k + 1);
    setModalVisible(true);
  };

  const handleSave = () => {
    const hour   = formHourIdx + 1;
    const minute = formMinuteIdx;
    const period: Period = formPeriodIdx === 0 ? 'AM' : 'PM';
    const label = formLabel.trim() || 'Alarm';
    const alarm: Alarm = {
      id: editingId || Date.now().toString(),
      hour, minute, period, label,
      sound: formSound, days: formDays, snooze: formSnooze,
      skipHolidays: formSkipHolidays, vibrate: formVibrate, active: true,
    };
    if (editingId) {
      updateAlarm(alarm);
    } else {
      addAlarm(alarm);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  // -- Repeat sub-modal helpers
  const openRepeatModal = () => {
    setRepeatDraft([...formDays]);
    setRepeatModal(true);
  };
  const toggleRepeatDay = (i: number) =>
    setRepeatDraft(d => d.map((v, idx) => idx === i ? !v : v));
  const confirmRepeat = () => { setFormDays(repeatDraft); setRepeatModal(false); };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg2 }]} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg2 }]} edges={['top']}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <BurgerMenu navigation={navigation} />
        <Text style={[styles.topBarTitle, { color: theme.text }]}>Alarms</Text>
        <AnimIconBtn onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={26} color={BLUE} />
        </AnimIconBtn>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg2 }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* -- NEXT ALARM Banner ----------------------------------- */}
        <View style={styles.nextAlarmBanner}>
          <View style={styles.nextAlarmLeft}>
            <Ionicons name="alarm-outline" size={28} color="#fff" />
          </View>
          <View style={styles.nextAlarmBody}>
            <Text style={styles.nextAlarmLabel}>NEXT ALARM</Text>
            <Text style={styles.nextAlarmTime}>
              {nextAlarm
                ? `${padTime(nextAlarm.hour, nextAlarm.minute)} ${nextAlarm.period}  �  ${nextAlarm.label}`
                : 'No active alarms'}
            </Text>
            <Text style={styles.nextAlarmSub}>
              {nextAlarm
                ? `Alarm in ${timeUntil(nextAlarm.hour, nextAlarm.minute, nextAlarm.period)}`
                : 'Enable an alarm to see it here'}
            </Text>
          </View>
        </View>

        {/* -- YOUR ALARMS header ---------------------------------- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR ALARMS</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{activeCount} Active</Text>
          </View>
        </View>

        {/* -- Empty state ----------------------------------------- */}
        {alarms.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="alarm-outline" size={42} color="#ccc" />
            <Text style={styles.emptyText}>No alarms yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
              <Text style={styles.emptyBtnText}>+ Add Alarm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* -- Alarm List ------------------------------------------ */}
        {alarms.map((alarm, idx) => (
          <View key={alarm.id}>
            <TouchableOpacity
              style={[styles.alarmRow, { backgroundColor: theme.card }]}
              onPress={() => openEdit(alarm)}
              onLongPress={() => confirmDelete(alarm.id, alarm.label)}
              delayLongPress={500}
              activeOpacity={0.85}
            >
              {/* Left: time + label */}
              <View style={styles.alarmLeft}>
                <View style={styles.alarmTimeRow}>
                  <Text style={[styles.alarmTime, { color: theme.text }, !alarm.active && styles.dimText]}>
                    {padTime(alarm.hour, alarm.minute)}
                  </Text>
                  <Text style={[styles.alarmPeriod, { color: theme.textSub }, !alarm.active && styles.dimText]}>
                    {alarm.period}
                  </Text>
                  {alarm.label.length > 0 && (
                    <Text
                      style={[styles.alarmLabel, { color: theme.textSub }, !alarm.active && styles.dimText]}
                      numberOfLines={1}
                    >
                      {alarm.label}
                    </Text>
                  )}
                </View>
                <Text style={[styles.alarmSub, { color: theme.textDim }, !alarm.active && styles.dimText]}>
                  {getRepeatLabel(alarm.days)}
                  {alarm.active
                    ? `  �  Alarm in ${timeUntil(alarm.hour, alarm.minute, alarm.period)}`
                    : '  �  Off'}
                </Text>
              </View>

              {/* Right: toggle + menu */}
              <View style={styles.alarmRight}>
                <Switch
                  value={alarm.active}
                  onValueChange={() => toggleAlarm(alarm.id)}
                  trackColor={{ false: '#E0E0E0', true: '#B8D4F5' }}
                  thumbColor={alarm.active ? BLUE : '#f0f0f0'}
                />
                <TouchableOpacity
                  style={styles.menuBtn}
                  onPress={() => openAlarmMenu(alarm)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#BBB" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Divider (not after last item) */}
            {idx < alarms.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          </View>
        ))}

        {/* -- Sleep Tip ------------------------------------------- */}
        <View style={[styles.sleepTipCard, { backgroundColor: theme.dark ? '#1A2A3A' : '#EBF4FF' }]}>
          <View style={styles.sleepTipIcon}>
            <Ionicons name="moon-outline" size={22} color={BLUE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sleepTipTitle, { color: theme.text }]}>Sleep Tip</Text>
            <Text style={[styles.sleepTipText, { color: theme.textSub }]}>
              Try to maintain a consistent sleep schedule. Going to bed and waking up at the same
              time each day improves sleep quality.
            </Text>
          </View>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ------------------------------------------------------------
          ADD / EDIT ALARM MODAL
      ------------------------------------------------------------ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.editSafe, { backgroundColor: theme.bg2 }]} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={[styles.editHeader, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.editHeaderBtn}>
              <Ionicons name="close" size={24} color={theme.textSub} />
            </TouchableOpacity>
            <Text style={[styles.editHeaderTitle, { color: theme.text }]}>
              {editingId ? 'Edit Alarm' : 'New Alarm'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.editHeaderBtn}>
              <Ionicons name="checkmark" size={26} color={BLUE} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* -- Drum-roll time picker ----------------------- */}
            <View style={[styles.pickerContainer, { backgroundColor: theme.bg }]}>
              <WheelCol
                key={`h-${modalKey}`}
                items={HOURS_LIST}
                selectedIndex={formHourIdx}
                onSelect={setFormHourIdx}
                width={90}
              />
              <WheelCol
                key={`m-${modalKey}`}
                items={MINUTES_LIST}
                selectedIndex={formMinuteIdx}
                onSelect={setFormMinuteIdx}
                width={90}
              />
              <WheelCol
                key={`p-${modalKey}`}
                items={PERIODS_LIST}
                selectedIndex={formPeriodIdx}
                onSelect={setFormPeriodIdx}
                width={80}
              />
            </View>

            {/* -- Settings panel ----------------------------- */}
            <View style={[styles.settingsPanel, { backgroundColor: theme.card }]}>
              <SettingRow
                label="Repeat"
                value={getRepeatLabel(formDays)}
                onPress={openRepeatModal}
              />
              <View style={styles.settingDivider} />

              <SettingRow
                label="Skip Public Holidays"
                isSwitch
                switchVal={formSkipHolidays}
                onSwitch={setFormSkipHolidays}
              />
              <View style={styles.settingDivider} />

              <SettingRow
                label="Alarm Sound"
                value={formSound}
                onPress={() => setSoundModal(true)}
              />
              <View style={styles.settingDivider} />

              <SettingRow
                label="Label"
                value={formLabel || 'None'}
                onPress={() => { setTempLabel(formLabel); setLabelModal(true); }}
              />
              <View style={styles.settingDivider} />

              <SettingRow
                label="Snooze"
                value={`${formSnooze} minutes`}
                onPress={() => setSnoozeModal(true)}
              />
              <View style={styles.settingDivider} />

              <SettingRow
                label="Vibrate while Ringing"
                isSwitch
                switchVal={formVibrate}
                onSwitch={setFormVibrate}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ------------------------------------------------------------
          REPEAT MODAL
      ------------------------------------------------------------ */}
      <Modal
        visible={repeatModal}
        animationType="slide"
        transparent
        onRequestClose={() => setRepeatModal(false)}
      >
        <Pressable style={styles.subOverlay} onPress={() => setRepeatModal(false)} />
        <View style={styles.subSheet}>
          <Text style={styles.subTitle}>Repeat</Text>
          {DAY_NAMES.map((day, i) => (
            <TouchableOpacity
              key={day}
              style={styles.checkRow}
              onPress={() => toggleRepeatDay(i)}
            >
              <Text style={styles.checkLabel}>{day}</Text>
              <View
                style={[
                  styles.checkbox,
                  repeatDraft[i] && styles.checkboxChecked,
                ]}
              >
                {repeatDraft[i] && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.subActions}>
            <TouchableOpacity onPress={() => setRepeatModal(false)} style={styles.subActionBtn}>
              <Text style={styles.subActionCancel}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.subActionDivider} />
            <TouchableOpacity onPress={confirmRepeat} style={styles.subActionBtn}>
              <Text style={styles.subActionDone}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------
          SNOOZE MODAL
      ------------------------------------------------------------ */}
      <Modal
        visible={snoozeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setSnoozeModal(false)}
      >
        <Pressable style={styles.subOverlay} onPress={() => setSnoozeModal(false)} />
        <View style={styles.subSheet}>
          <Text style={styles.subTitle}>Snooze</Text>
          {SNOOZE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={styles.checkRow}
              onPress={() => { setFormSnooze(opt); setSnoozeModal(false); }}
            >
              <Text style={styles.checkLabel}>{opt} minutes</Text>
              <View
                style={[
                  styles.radioOuter,
                  formSnooze === opt && styles.radioOuterSelected,
                ]}
              >
                {formSnooze === opt && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setSnoozeModal(false)}
            style={[styles.subActions, { justifyContent: 'center' }]}
          >
            <Text style={styles.subActionCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ------------------------------------------------------------
          ALARM SOUND MODAL
      ------------------------------------------------------------ */}
      <Modal
        visible={soundModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSoundModal(false)}
      >
        <SafeAreaView style={[styles.editSafe, { backgroundColor: theme.bg2 }]} edges={['top', 'bottom']}>
          <View style={[styles.editHeader, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setSoundModal(false)} style={styles.editHeaderBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.textSub} />
            </TouchableOpacity>
            <Text style={[styles.editHeaderTitle, { color: theme.text }]}>Alarm Sound</Text>
            <View style={styles.editHeaderBtn} />
          </View>

          <ScrollView>
            {/* -- Your (custom) sounds -- */}
            <Text style={[styles.soundSection, { color: theme.textDim }]}>Your sounds</Text>
            <View style={[styles.settingsPanel, { backgroundColor: theme.card }]}>
              <TouchableOpacity style={styles.checkRow} onPress={pickCustomSound}>
                <Text style={[styles.checkLabel, { color: theme.text }]}>Add from device�</Text>
                <Ionicons name="add" size={22} color={BLUE} />
              </TouchableOpacity>
              {customSounds.map((cs, i) => (
                <View key={cs.uri}>
                  <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />
                  <TouchableOpacity
                    style={styles.checkRow}
                    onPress={() => previewSound(cs.label)}
                    onLongPress={() => Alert.alert(cs.label, undefined, [
                      { text: 'Use this sound', onPress: () => { setFormSound(cs.label); setSoundModal(false); stopPreview(); } },
                      { text: 'Remove', style: 'destructive', onPress: () => setCustomSounds(prev => prev.filter((_, j) => j !== i)) },
                      { text: 'Cancel', style: 'cancel' },
                    ])}
                  >
                    <Text style={[styles.checkLabel, { color: theme.text }]} numberOfLines={1}>{cs.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {previewingSound === cs.label
                        ? <Ionicons name="stop-circle" size={22} color={BLUE} onPress={stopPreview} />
                        : <Ionicons name="play-circle-outline" size={22} color={theme.textDim} />}
                      <View style={[styles.radioOuter, formSound === cs.label && styles.radioOuterSelected]}>
                        {formSound === cs.label && <View style={styles.radioInner} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
              {customSounds.length === 0 && (
                <Text style={[{ fontSize: 12, color: theme.textDim, marginHorizontal: 16, marginBottom: 12 }]}>No custom sounds yet. Tap "Add from device�" to pick an audio file.</Text>
              )}
            </View>

            {/* -- Built-in sounds -- */}
            <Text style={[styles.soundSection, { color: theme.textDim }]}>Ringtones</Text>
            <View style={[styles.settingsPanel, { backgroundColor: theme.card }]}>
              {BUILT_IN_SOUNDS.map((s, i) => (
                <View key={s.label}>
                  <TouchableOpacity
                    style={styles.checkRow}
                    onPress={() => {
                      setFormSound(s.label);
                      setSoundModal(false);
                      stopPreview();
                    }}
                    onLongPress={() => previewSound(s.label)}
                  >
                    <Text style={[styles.checkLabel, { color: theme.text }]}>{s.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {s.file !== null && (
                        previewingSound === s.label
                          ? <Ionicons name="stop-circle" size={22} color={BLUE} onPress={stopPreview} />
                          : <Ionicons name="play-circle-outline" size={22} color={theme.textDim} />
                      )}
                      <View style={[styles.radioOuter, formSound === s.label && styles.radioOuterSelected]}>
                        {formSound === s.label && <View style={styles.radioInner} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                  {i < BUILT_IN_SOUNDS.length - 1 && <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />}
                </View>
              ))}
            </View>
            <Text style={[{ fontSize: 11, color: theme.textDim, marginHorizontal: 24, marginBottom: 8 }]}>Hold any ringtone to preview it. Tap to select.</Text>
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ------------------------------------------------------------
          LABEL MODAL
      ------------------------------------------------------------ */}
      <Modal
        visible={labelModal}
        animationType="fade"
        transparent
        onRequestClose={() => setLabelModal(false)}
      >
        <Pressable style={styles.subOverlay} onPress={() => setLabelModal(false)} />
        <View style={[styles.labelSheet, { backgroundColor: theme.card }]}>
          <Text style={[styles.subTitle, { color: theme.text }]}>Label</Text>
          <TextInput
            style={[styles.labelInput, { color: theme.text, backgroundColor: theme.bg2, borderColor: theme.border }]}
            value={tempLabel}
            onChangeText={setTempLabel}
            placeholder="e.g. Morning Workout"
            placeholderTextColor={theme.textDim}
            autoFocus
            maxLength={40}
          />
          <View style={styles.subActions}>
            <TouchableOpacity onPress={() => setLabelModal(false)} style={styles.subActionBtn}>
              <Text style={styles.subActionCancel}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.subActionDivider} />
            <TouchableOpacity
              onPress={() => { setFormLabel(tempLabel.trim()); setLabelModal(false); }}
              style={styles.subActionBtn}
            >
              <Text style={styles.subActionDone}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ------------------------------------------------------------------