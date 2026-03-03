import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEvents, AppEvent } from '../context/EventStore';
import { useTheme } from '../context/ThemeContext';

const BLUE = '#4A90D9';

// ─── parse stored time string  "08:00 AM" → wheel indices ────────────────────
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function parseStoredTime(t: string): { hIdx: number; mIdx: number; pIdx: number } {
  const parts = (t || '').trim().split(' ');
  const [hStr, mStr] = (parts[0] || '8:00').split(':');
  const h = Math.max(1, Math.min(12, parseInt(hStr) || 8));
  const m = Math.max(0, Math.min(59, parseInt(mStr) || 0));
  const p = (parts[1] || '').toUpperCase() === 'PM' ? 1 : 0;
  return { hIdx: h - 1, mIdx: m, pIdx: p };
}
function parseStoredDate(d: string): { y: number; mo: number; day: number } {
  const parts = (d || '').replace(',', '').split(' ');
  const mo = MONTH_ABBR.indexOf(parts[0]);
  const day = parseInt(parts[1]) || new Date().getDate();
  const y = parseInt(parts[2]) || new Date().getFullYear();
  return { y, mo: mo < 0 ? new Date().getMonth() : mo, day };
}

// ─── Categories ──────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  'Work', 'Personal', 'Health', 'Education', 'Finance',
  'Social', 'Shopping', 'Travel', 'Family', 'Fitness',
  'Meeting', 'Birthday', 'Anniversary', 'Holiday', 'Other',
];

const PRIORITIES = ['Low', 'Medium', 'High'] as const;
type Priority = typeof PRIORITIES[number];
const PRIORITY_COLORS: Record<Priority, string> = {
  Low: '#52B788', Medium: '#E09C52', High: '#E05252',
};

type Period = 'AM' | 'PM';

// ─── Wheel Picker (drum-roll) ─────────────────────────────────────────────────
const ITEM_H = 56;
const HOURS_LIST   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS_LIST = ['AM', 'PM'];

interface WheelColProps {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  width?: number;
  wheelKey?: string;
}

function WheelCol({ items, selectedIndex, onSelect, width = 80, wheelKey }: WheelColProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { theme } = useTheme();
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [wheelKey]);

  const handleEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const c = Math.max(0, Math.min(items.length - 1, i));
    onSelect(c);
  };

  return (
    <View style={{ width, height: ITEM_H * 5, overflow: 'hidden' }}>
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
          const isSel = dist === 0;
          const isAdj = dist === 1;
          return (
            <TouchableOpacity
              key={i}
              style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => { onSelect(i); scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true }); }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: isSel ? 36 : isAdj ? 28 : 22,
                fontWeight: isSel ? '700' : '400',
                color: isSel ? theme.text : isAdj ? theme.textSub : theme.border,
              }}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_SHORTS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDateLabel(y: number, m: number, d: number) {
  return `${MONTH_NAMES[m].slice(0, 3)} ${d}, ${y}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateEventScreen({ navigation, route }: any) {
  const { addEvent, updateEvent } = useEvents();
  const { theme, isDark } = useTheme();
  const editEvent: AppEvent | undefined = route?.params?.event;

  const now = new Date();

  // ── parse existing event if editing
  const initStart  = editEvent ? parseStoredTime(editEvent.startTime) : { hIdx: 7, mIdx: 0, pIdx: 0 };
  const initEnd    = editEvent?.endTime ? parseStoredTime(editEvent.endTime) : { hIdx: 8, mIdx: 0, pIdx: 1 };
  const initDate   = editEvent ? parseStoredDate(editEvent.startDate) : { y: now.getFullYear(), mo: now.getMonth(), day: now.getDate() };

  // — Title / Desc —
  const [title, setTitle]             = useState(editEvent?.title || '');
  const [description, setDescription] = useState(editEvent?.description || '');

  // — Start time —
  const [startHourIdx,   setStartHourIdx]   = useState(initStart.hIdx);
  const [startMinuteIdx, setStartMinuteIdx] = useState(initStart.mIdx);
  const [startPeriodIdx, setStartPeriodIdx] = useState(initStart.pIdx);

  // — End time —
  const [hasEnd, setHasEnd]           = useState(!!editEvent?.endTime);
  const [endHourIdx,   setEndHourIdx]   = useState(initEnd.hIdx);
  const [endMinuteIdx, setEndMinuteIdx] = useState(initEnd.mIdx);
  const [endPeriodIdx, setEndPeriodIdx] = useState(initEnd.pIdx);

  // — Date —
  const [selYear,  setSelYear]  = useState(initDate.y);
  const [selMonth, setSelMonth] = useState(initDate.mo);
  const [selDay,   setSelDay]   = useState(initDate.day);

  // — Location —
  const [location, setLocation] = useState(editEvent?.location || '');

  // — Category —
  const [categories, setCategories]   = useState<string[]>(DEFAULT_CATEGORIES);
  const [category, setCategory]       = useState(editEvent?.category || 'Work');
  const [customCatInput, setCustomCatInput] = useState('');

  // — Priority / reminders —
  const [priority, setPriority]   = useState<Priority>((editEvent?.priority as Priority) || 'Medium');
  const [reminders, setReminders] = useState<string[]>(editEvent?.reminders || ['15 minutes before']);

  // ── Modal visibility ────────────────────────────────────────────────────────
  const [timeTarget,    setTimeTarget]    = useState<'start' | 'end' | null>(null);
  const [timeModalKey,  setTimeModalKey]  = useState(0);
  const [tempHourIdx,   setTempHourIdx]   = useState(0);
  const [tempMinuteIdx, setTempMinuteIdx] = useState(0);
  const [tempPeriodIdx, setTempPeriodIdx] = useState(0);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calYear,  setCalYear]  = useState(selYear);
  const [calMonth, setCalMonth] = useState(selMonth);
  const [calSel,   setCalSel]   = useState<number | null>(selDay);

  const [mapModalVisible,  setMapModalVisible]  = useState(false);
  const [categoryModal,    setCategoryModal]    = useState(false);
  const [addCatMode,       setAddCatMode]       = useState(false);

  // ── Open time picker ────────────────────────────────────────────────────────
  const openTimePicker = (target: 'start' | 'end') => {
    setTimeTarget(target);
    if (target === 'start') {
      setTempHourIdx(startHourIdx);
      setTempMinuteIdx(startMinuteIdx);
      setTempPeriodIdx(startPeriodIdx);
    } else {
      setTempHourIdx(endHourIdx);
      setTempMinuteIdx(endMinuteIdx);
      setTempPeriodIdx(endPeriodIdx);
    }
    setTimeModalKey(k => k + 1);
  };

  const confirmTime = () => {
    if (timeTarget === 'start') {
      setStartHourIdx(tempHourIdx);
      setStartMinuteIdx(tempMinuteIdx);
      setStartPeriodIdx(tempPeriodIdx);
    } else {
      setEndHourIdx(tempHourIdx);
      setEndMinuteIdx(tempMinuteIdx);
      setEndPeriodIdx(tempPeriodIdx);
    }
    setTimeTarget(null);
  };

  const fmtTime = (hIdx: number, mIdx: number, pIdx: number) =>
    `${HOURS_LIST[hIdx]}:${MINUTES_LIST[mIdx]} ${PERIODS_LIST[pIdx]}`;

  // ── Open calendar ───────────────────────────────────────────────────────────
  const openCalendar = () => {
    setCalYear(selYear);
    setCalMonth(selMonth);
    setCalSel(selDay);
    setCalendarVisible(true);
  };
  const confirmCalendar = () => {
    if (calSel) { setSelYear(calYear); setSelMonth(calMonth); setSelDay(calSel); }
    setCalendarVisible(false);
  };
  const calPrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setCalSel(null);
  };
  const calNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setCalSel(null);
  };

  // ── Render calendar grid ────────────────────────────────────────────────────
  const renderCalendarGrid = () => {
    const totalDays = daysInMonth(calYear, calMonth);
    const startWd   = firstWeekday(calYear, calMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWd; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  };

  // ── Category ────────────────────────────────────────────────────────────────
  const addCustomCategory = () => {
    const c = customCatInput.trim();
    if (!c) return;
    if (!categories.includes(c)) setCategories(prev => [...prev, c]);
    setCategory(c);
    setCustomCatInput('');
    setAddCatMode(false);
    setCategoryModal(false);
  };

  // ── Map Picker ──────────────────────────────────────────────────────────────
  const openGoogleMaps = () => {
    const query = encodeURIComponent(location || 'Philippines');
    Linking.openURL(`https://maps.google.com/maps?q=${query}`).catch(() =>
      Alert.alert('Google Maps not available', 'Please type your location manually.')
    );
    setMapModalVisible(false);
  };
  const openWaze = () => {
    const query = encodeURIComponent(location || 'Philippines');
    Linking.openURL(`https://waze.com/ul?q=${query}`).catch(() =>
      Alert.alert('Waze not available', 'Please type your location manually.')
    );
    setMapModalVisible(false);
  };

  // ── Reminders ───────────────────────────────────────────────────────────────
  const removeReminder = (r: string) => setReminders(p => p.filter(x => x !== r));
  const addReminder = () =>
    Alert.alert('Add Reminder', 'Choose a notification time', [
      { text: '5 minutes before',  onPress: () => setReminders(p => [...p, '5 minutes before']) },
      { text: '15 minutes before', onPress: () => setReminders(p => [...p, '15 minutes before']) },
      { text: '30 minutes before', onPress: () => setReminders(p => [...p, '30 minutes before']) },
      { text: '1 hour before',     onPress: () => setReminders(p => [...p, '1 hour before']) },
      { text: '1 day before',      onPress: () => setReminders(p => [...p, '1 day before']) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Missing Title', 'Please enter an event title.'); return; }
    const event: AppEvent = {
      id: editEvent?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      startTime: fmtTime(startHourIdx, startMinuteIdx, startPeriodIdx),
      startDate: formatDateLabel(selYear, selMonth, selDay),
      endTime:   hasEnd ? fmtTime(endHourIdx, endMinuteIdx, endPeriodIdx) : '',
      location:  location.trim(),
      category,
      priority,
      reminders,
      alarmActive: editEvent?.alarmActive ?? true,
    };
    if (editEvent) {
      updateEvent(event);
      Alert.alert('Event Updated!', `"${event.title}" has been updated.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } else {
      addEvent(event);
      Alert.alert('Event Created!', `"${event.title}" has been synced to your calendar.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    }
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg2 }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerSide}>
          <Text style={[s.cancelText, { color: theme.textSub }]}>Cancel</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: theme.text }]}>{editEvent ? 'Edit Event' : 'New Event'}</Text>
          <Text style={s.autosaved}>Auto-saved</Text>
        </View>
        <TouchableOpacity style={s.headerSide} onPress={() => Alert.alert('Drafts', 'Your drafts will appear here.')}>
          <Text style={s.draftsText}>Drafts</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <TextInput
          style={[s.titleInput, { color: theme.text, borderBottomColor: theme.border }]}
          placeholder="Event Title (e.g. Project Sync)"
          placeholderTextColor={theme.textDim}
          value={title}
          onChangeText={setTitle}
          autoFocus
          maxLength={80}
        />

        {/* Description */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: theme.textDim }]}>DESCRIPTION & AGENDA</Text>
          <TextInput
            style={[s.descInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder={"What's the goal? Add notes, links, or agenda items..."}
            placeholderTextColor={theme.textDim}
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        {/* ─── Timing ─── */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <Ionicons name="time-outline" size={15} color={BLUE} />
            <Text style={[s.sectionLabelInline, { color: theme.text }]}>TIMING</Text>
          </View>

          <View style={[s.timingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Start */}
            <Text style={[s.blockLabel, { color: theme.textDim }]}>START</Text>
            <View style={s.timePickerRow}>
              {/* Time touch */}
              <TouchableOpacity style={[s.timeDisplay, { backgroundColor: isDark ? '#1A2A3A' : '#F2F8FF', borderColor: isDark ? '#2A4A6A' : '#C5DDF5' }]} onPress={() => openTimePicker('start')}>
                <Text style={[s.timeDisplayText, { color: theme.text }]}>
                  {fmtTime(startHourIdx, startMinuteIdx, startPeriodIdx)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={BLUE} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
              {/* Date touch */}
              <TouchableOpacity style={[s.dateDisplay, { backgroundColor: theme.bg2, borderColor: theme.border }]} onPress={openCalendar}>
                <Ionicons name="calendar-outline" size={15} color={theme.textDim} style={{ marginRight: 6 }} />
                <Text style={[s.dateDisplayText, { color: theme.textSub }]}>
                  {formatDateLabel(selYear, selMonth, selDay)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[s.timingDivider, { backgroundColor: theme.border }]} />

            {/* End */}
            <View style={s.endLabelRow}>
              <Text style={[s.blockLabel, { color: theme.textDim }]}>END  (OPTIONAL)</Text>
              {hasEnd && (
                <TouchableOpacity onPress={() => setHasEnd(false)}>
                  <Ionicons name="close-circle-outline" size={16} color={theme.textDim} />
                </TouchableOpacity>
              )}
            </View>
            {hasEnd ? (
              <TouchableOpacity style={[s.timeDisplay, { backgroundColor: isDark ? '#1A2A3A' : '#F2F8FF', borderColor: isDark ? '#2A4A6A' : '#C5DDF5' }]} onPress={() => openTimePicker('end')}>
                <Text style={[s.timeDisplayText, { color: theme.text }]}>
                  {fmtTime(endHourIdx, endMinuteIdx, endPeriodIdx)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={BLUE} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.addEndBtn} onPress={() => setHasEnd(true)}>
                <Ionicons name="add" size={14} color={theme.textDim} />
                <Text style={[s.addEndText, { color: theme.textDim }]}>Add End Time</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Location ─── */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <Ionicons name="location-outline" size={15} color={theme.textDim} />
            <Text style={[s.sectionLabelInline, { color: theme.text }]}>LOCATION & VENUE</Text>
            <Text style={s.optionalBadge}>optional</Text>
          </View>

          <View style={[s.locationBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="location-outline" size={16} color={theme.textDim} style={{ marginRight: 8 }} />
            <TextInput
              style={[s.locationText, { color: theme.text }]}
              placeholder="Enter address or place name"
              placeholderTextColor={theme.textDim}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={s.mapBtnRow}>
            <TouchableOpacity style={s.mapBtn} onPress={() => setMapModalVisible(true)}>
              <Ionicons name="map-outline" size={15} color={BLUE} />
              <Text style={s.mapBtnText}>Open Map</Text>
            </TouchableOpacity>
            <Text style={s.mapHint}>or just type above</Text>
          </View>
        </View>

        {/* ─── Category & Priority ─── */}
        <View style={s.section}>
          <View style={s.catPriorityRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.fieldLabel, { color: theme.textDim }]}>Event Category</Text>
              <TouchableOpacity style={[s.categoryDropdown, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF', borderColor: BLUE }]} onPress={() => { setAddCatMode(false); setCategoryModal(true); }}>
                <Text style={s.categoryDropdownText}>{category}</Text>
                <Ionicons name="chevron-down" size={14} color={BLUE} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1.3 }}>
              <Text style={[s.fieldLabel, { color: theme.textDim }]}>Priority Level</Text>
              <View style={s.priorityPills}>
                {PRIORITIES.map(p => {
                  const active = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[s.priorityPill, { backgroundColor: active ? PRIORITY_COLORS[p] : theme.card, borderColor: active ? PRIORITY_COLORS[p] : theme.border }]}
                      onPress={() => setPriority(p)}
                    >
                      <Text style={[s.priorityPillText, { color: active ? '#fff' : theme.textSub }]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* ─── Reminders ─── */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <Ionicons name="notifications-outline" size={15} color={theme.textSub} />
            <Text style={[s.sectionLabelInline, { color: theme.text, flex: 1 }]}>REMINDERS & ALERTS</Text>
            <View style={[s.activeCountBadge, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF' }]}>
              <Text style={s.activeCountText}>{reminders.length} Active</Text>
            </View>
          </View>
          {reminders.map((r, i) => (
            <View key={i} style={[s.reminderRow, { borderBottomColor: theme.border }]}>
              <Ionicons name="time-outline" size={16} color="#6B9FD6" style={{ marginRight: 10 }} />
              <Text style={[s.reminderText, { color: theme.textSub }]}>{r}</Text>
              <TouchableOpacity onPress={() => removeReminder(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={s.addRowBtn} onPress={addReminder}>
            <Ionicons name="add" size={15} color={BLUE} />
            <Text style={s.addRowBtnText}>Add Custom Notification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TouchableOpacity style={s.createBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={s.createBtnText}>Create & Sync Event</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════════
          TIME PICKER MODAL (drum-roll)
      ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={timeTarget !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setTimeTarget(null)}
      >
        <Pressable style={s.overlay} onPress={() => setTimeTarget(null)} />
        <View style={[s.bottomSheet, { backgroundColor: theme.bg }]}>
          {/* Handle */}
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />

          <View style={[s.sheetHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setTimeTarget(null)}>
              <Text style={[s.sheetCancel, { color: theme.textDim }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.text }]}>
              {timeTarget === 'start' ? 'Start Time' : 'End Time'}
            </Text>
            <TouchableOpacity onPress={confirmTime}>
              <Text style={s.sheetDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={s.wheelRow}>
            <WheelCol
              wheelKey={`h-${timeModalKey}`}
              items={HOURS_LIST}
              selectedIndex={tempHourIdx}
              onSelect={setTempHourIdx}
              width={90}
            />
            <WheelCol
              wheelKey={`m-${timeModalKey}`}
              items={MINUTES_LIST}
              selectedIndex={tempMinuteIdx}
              onSelect={setTempMinuteIdx}
              width={90}
            />
            <WheelCol
              wheelKey={`p-${timeModalKey}`}
              items={PERIODS_LIST}
              selectedIndex={tempPeriodIdx}
              onSelect={setTempPeriodIdx}
              width={80}
            />
          </View>
          <View style={{ height: 24 }} />
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          CALENDAR MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={calendarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable style={s.overlay} onPress={() => setCalendarVisible(false)} />
        <View style={[s.calSheet, { backgroundColor: theme.bg }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />

          <View style={[s.sheetHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setCalendarVisible(false)}>
              <Text style={[s.sheetCancel, { color: theme.textDim }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.text }]}>Select Date</Text>
            <TouchableOpacity onPress={confirmCalendar}>
              <Text style={s.sheetDone}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Month navigation */}
          <View style={s.calNavRow}>
            <TouchableOpacity onPress={calPrevMonth} style={s.calNavBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.textSub} />
            </TouchableOpacity>
            <Text style={[s.calMonthTitle, { color: theme.text }]}>{MONTH_NAMES[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={calNextMonth} style={s.calNavBtn}>
              <Ionicons name="chevron-forward" size={22} color={theme.textSub} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={s.calDayHeaders}>
            {DAY_SHORTS.map(d => (
              <Text key={d} style={[s.calDayHeader, { color: theme.textDim }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          {renderCalendarGrid().map((row, ri) => (
            <View key={ri} style={s.calRow}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={s.calCell} />;
                const isToday =
                  day === now.getDate() &&
                  calMonth === now.getMonth() &&
                  calYear === now.getFullYear();
                const isSel = day === calSel;
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[
                      s.calCell,
                      isToday && s.calCellToday,
                      isSel && s.calCellSelected,
                    ]}
                    onPress={() => setCalSel(day)}
                  >
                    <Text style={[
                      s.calCellText,
                      { color: theme.text },
                      isToday && !isSel && s.calCellTodayText,
                      isSel && s.calCellSelectedText,
                    ]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={{ height: 20 }} />
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          MAP PICKER MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMapModalVisible(false)}
      >
        <Pressable style={s.overlay} onPress={() => setMapModalVisible(false)} />
        <View style={[s.mapSheet, { backgroundColor: theme.bg }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
          <Text style={[s.sheetTitle2, { color: theme.text }]}>Open Map</Text>
          <Text style={[s.mapSubtext, { color: theme.textDim }]}>
            {location.trim()
              ? `Searching for: "${location}"`
              : 'Type an address above, then open a map.'}
          </Text>

          <TouchableOpacity style={[s.mapOptionBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={openGoogleMaps}>
            <View style={s.mapOptionIcon}>
              <Ionicons name="navigate-circle-outline" size={26} color="#4285F4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.mapOptionTitle, { color: theme.text }]}>Google Maps</Text>
              <Text style={[s.mapOptionSub, { color: theme.textDim }]}>Open in Google Maps</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
          </TouchableOpacity>

          <TouchableOpacity style={[s.mapOptionBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={openWaze}>
            <View style={[s.mapOptionIcon, { backgroundColor: isDark ? '#1A2A3A' : '#EDF5FF' }]}>
              <Ionicons name="car-outline" size={24} color="#33CCFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.mapOptionTitle, { color: theme.text }]}>Waze</Text>
              <Text style={[s.mapOptionSub, { color: theme.textDim }]}>Navigate with Waze</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
          </TouchableOpacity>

          <TouchableOpacity style={s.mapCancelBtn} onPress={() => setMapModalVisible(false)}>
            <Text style={[s.mapCancelText, { color: theme.textDim }]}>Cancel, type manually</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          CATEGORY PICKER MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={categoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryModal(false)}
      >
        <Pressable style={s.overlay} onPress={() => setCategoryModal(false)} />
        <View style={[s.catSheet, { backgroundColor: theme.bg }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
          <View style={[s.sheetHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setCategoryModal(false)}>
              <Text style={[s.sheetCancel, { color: theme.textDim }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.text }]}>Event Category</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {categories.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.catRow, { borderBottomColor: theme.border }]}
                onPress={() => { setCategory(c); setCategoryModal(false); }}
              >
                <Text style={[s.catRowText, { color: theme.textSub }, c === category && { color: BLUE, fontWeight: '700' }]}>{c}</Text>
                {c === category && <Ionicons name="checkmark" size={18} color={BLUE} />}
              </TouchableOpacity>
            ))}

            {/* Add custom */}
            {addCatMode ? (
              <View style={[s.addCatRow, { borderBottomColor: theme.border }]}>
                <TextInput
                  style={[s.addCatInput, { backgroundColor: theme.bg2, borderColor: theme.border, color: theme.text }]}
                  placeholder="New category name"
                  placeholderTextColor={theme.textDim}
                  value={customCatInput}
                  onChangeText={setCustomCatInput}
                  autoFocus
                  maxLength={30}
                />
                <TouchableOpacity style={s.addCatConfirmBtn} onPress={addCustomCategory}>
                  <Text style={s.addCatConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[s.catRow, { borderBottomColor: theme.border }]} onPress={() => setAddCatMode(true)}>
                <Ionicons name="add-circle-outline" size={18} color={BLUE} style={{ marginRight: 10 }} />
                <Text style={[s.catRowText, { color: BLUE }]}>Add Custom Category</Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerSide: { width: 60 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  autosaved: { fontSize: 11, color: '#52B788', fontWeight: '500', marginTop: 1 },
  cancelText: { fontSize: 15, fontWeight: '500' },
  draftsText: { fontSize: 15, color: BLUE, fontWeight: '700', textAlign: 'right' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  titleInput: {
    fontSize: 22, fontWeight: '700',
    borderBottomWidth: 2,
    paddingBottom: 12, marginBottom: 20,
  },

  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionLabelInline: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginLeft: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  optionalBadge: { marginLeft: 8, fontSize: 10, color: '#bbb', fontWeight: '600', fontStyle: 'italic' },

  descInput: {
    borderRadius: 12, borderWidth: 1,
    padding: 14, fontSize: 14, minHeight: 90, lineHeight: 20,
  },

  // Timing
  timingCard: {
    borderRadius: 14, borderWidth: 1, padding: 16,
  },
  blockLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  timePickerRow: { gap: 10, marginBottom: 4 },
  timeDisplay: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    alignSelf: 'flex-start',
  },
  timeDisplayText: { fontSize: 26, fontWeight: '700' },
  dateDisplay: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 11,
    alignSelf: 'flex-start',
  },
  dateDisplayText: { fontSize: 14, fontWeight: '500' },
  timingDivider: { height: 1, marginVertical: 14 },
  endLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  addEndBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addEndText: { fontSize: 14, fontWeight: '500' },

  // Location
  locationBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  locationText: { flex: 1, fontSize: 14 },
  mapBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: BLUE, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#EBF4FF',
  },
  mapBtnText: { fontSize: 13, color: BLUE, fontWeight: '600' },
  mapHint: { fontSize: 12, color: '#BBB', fontStyle: 'italic' },

  // Category + Priority
  catPriorityRow: { flexDirection: 'row', gap: 14 },
  categoryDropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  categoryDropdownText: { fontSize: 14, fontWeight: '700', color: BLUE, flex: 1, marginRight: 4 },
  priorityPills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  priorityPill: {
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1,
  },
  priorityPillText: { fontSize: 12, fontWeight: '600' },

  // Reminders
  activeCountBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  activeCountText: { fontSize: 11, color: BLUE, fontWeight: '700' },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  reminderText: { flex: 1, fontSize: 14, fontWeight: '500' },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12 },
  addRowBtnText: { fontSize: 14, color: BLUE, fontWeight: '600' },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1,
  },
  createBtn: {
    backgroundColor: BLUE, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // Shared overlay / sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sheetCancel: { fontSize: 15, fontWeight: '500', width: 60 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  sheetDone: { fontSize: 15, color: BLUE, fontWeight: '700', width: 60, textAlign: 'right' },

  // Time picker sheet
  bottomSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  wheelRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 4, paddingVertical: 8,
  },

  // Calendar sheet
  calSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 14,
  },
  calNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 14,
  },
  calNavBtn: { padding: 4 },
  calMonthTitle: { fontSize: 18, fontWeight: '700' },
  calDayHeaders: { flexDirection: 'row', marginBottom: 4 },
  calDayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  calRow: { flexDirection: 'row', marginBottom: 2 },
  calCell: {
    flex: 1, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  calCellToday: { borderWidth: 1.5, borderColor: BLUE },
  calCellSelected: { backgroundColor: BLUE },
  calCellText: { fontSize: 15, fontWeight: '500' },
  calCellTodayText: { color: BLUE, fontWeight: '700' },
  calCellSelectedText: { color: '#fff', fontWeight: '700' },

  // Map sheet
  mapSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingBottom: 32,
  },
  sheetTitle2: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginVertical: 10 },
  mapSubtext: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  mapOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1,
  },
  mapOptionIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center',
  },
  mapOptionTitle: { fontSize: 15, fontWeight: '700' },
  mapOptionSub: { fontSize: 12, marginTop: 2 },
  mapCancelBtn: { alignItems: 'center', paddingVertical: 14 },
  mapCancelText: { fontSize: 14, fontWeight: '500' },

  // Category sheet
  catSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  catRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: 1,
  },
  catRowText: { fontSize: 15, fontWeight: '500' },
  addCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  addCatInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14,
  },
  addCatConfirmBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  addCatConfirmText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});