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
import { useEvents, AppEvent } from '@/context/EventStore';
import { useTheme } from '@/context/ThemeContext';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { fr, s } from './styles';


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

const DEFAULT_CATEGORIES = [
  'Work','Personal','Health','Education','Finance',
  'Social','Shopping','Travel','Family','Fitness',
  'Meeting','Birthday','Anniversary','Holiday','Other',
];

const PRIORITIES = ['Low', 'Medium', 'High'] as const;
type Priority = typeof PRIORITIES[number];
const PRIORITY_COLORS: Record<Priority, string> = {
  Low: '#52B788', Medium: '#E09C52', High: '#E05252',
};

type Period = 'AM' | 'PM';

const ITEM_H = 52;
const HOURS_LIST   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS_LIST = ['AM', 'PM'];

interface WheelColProps {
  items: string[]; selectedIndex: number; onSelect: (i: number) => void;
  width?: number; wheelKey?: string;
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
    onSelect(Math.max(0, Math.min(items.length - 1, i)));
  };

  return (
    <View style={{ width, height: ITEM_H * 5, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{
        position: 'absolute', left: 0, right: 0,
        top: ITEM_H * 2, height: ITEM_H,
        backgroundColor: 'rgba(74,144,217,0.10)',
        borderTopWidth: 1, borderBottomWidth: 1, borderColor: BLUE,
      }} />
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
                fontSize: isSel ? 32 : isAdj ? 24 : 18,
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

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_SHORTS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function firstWeekday(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function formatDateLabel(y: number, m: number, d: number) {
  return `${MONTH_NAMES[m].slice(0, 3)} ${d}, ${y}`;
}

// --- Row-style form field -----------------------------------------------------
function FormRow({ icon, label, children, theme }: any) {
  const valueNode =
    typeof children === 'string' || typeof children === 'number'
      ? <Text style={[fr.label, { color: theme.text }]}>{children}</Text>
      : children;
  return (
    <View style={[fr.row, { borderBottomColor: theme.border }]}>
      <View style={fr.iconWrap}>
        <Ionicons name={icon} size={17} color={BLUE} />
      </View>
      <View style={fr.labelWrap}>
        <Text style={[fr.label, { color: theme.textDim }]}>{label}</Text>
      </View>
      <View style={fr.valueWrap}>{valueNode}</View>
    </View>
  );
}
// --- Main ---------------------------------------------------------------------
export default function CreateEventScreen({ navigation, route }: any) {
  const { addEvent, updateEvent } = useEvents();
  const { theme, isDark } = useTheme();
  const editEvent: AppEvent | undefined = route?.params?.event;
  const now = new Date();

  const initStart = editEvent ? parseStoredTime(editEvent.startTime) : { hIdx: 7, mIdx: 0, pIdx: 0 };
  const initEnd   = editEvent?.endTime ? parseStoredTime(editEvent.endTime) : { hIdx: 8, mIdx: 0, pIdx: 1 };
  const initDate  = editEvent ? parseStoredDate(editEvent.startDate) : { y: now.getFullYear(), mo: now.getMonth(), day: now.getDate() };

  const [title, setTitle]           = useState(editEvent?.title || '');
  const [description, setDescription] = useState(editEvent?.description || '');
  const [startHourIdx, setStartHourIdx]   = useState(initStart.hIdx);
  const [startMinuteIdx, setStartMinuteIdx] = useState(initStart.mIdx);
  const [startPeriodIdx, setStartPeriodIdx] = useState(initStart.pIdx);
  const [hasEnd, setHasEnd]         = useState(!!editEvent?.endTime);
  const [endHourIdx, setEndHourIdx]     = useState(initEnd.hIdx);
  const [endMinuteIdx, setEndMinuteIdx]   = useState(initEnd.mIdx);
  const [endPeriodIdx, setEndPeriodIdx]   = useState(initEnd.pIdx);
  const [selYear, setSelYear]   = useState(initDate.y);
  const [selMonth, setSelMonth] = useState(initDate.mo);
  const [selDay, setSelDay]     = useState(initDate.day);
  const [location, setLocation] = useState(editEvent?.location || '');
  const [categories, setCategories]     = useState<string[]>(DEFAULT_CATEGORIES);
  const [category, setCategory]         = useState(editEvent?.category || 'Work');
  const [customCatInput, setCustomCatInput] = useState('');
  const [priority, setPriority]     = useState<Priority>((editEvent?.priority as Priority) || 'Medium');
  const [reminders, setReminders]   = useState<string[]>(editEvent?.reminders || ['15 minutes before']);
  const [recurrence, setRecurrence] = useState<AppEvent['recurrence']>(editEvent?.recurrence || 'none');

  const [timeTarget, setTimeTarget]   = useState<'start' | 'end' | null>(null);
  const [timeModalKey, setTimeModalKey] = useState(0);
  const [tempHourIdx, setTempHourIdx]   = useState(0);
  const [tempMinuteIdx, setTempMinuteIdx] = useState(0);
  const [tempPeriodIdx, setTempPeriodIdx] = useState(0);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calYear, setCalYear]   = useState(selYear);
  const [calMonth, setCalMonth] = useState(selMonth);
  const [calSel, setCalSel]     = useState<number | null>(selDay);
  const [mapModalVisible, setMapModalVisible]   = useState(false);
  const [categoryModal, setCategoryModal]       = useState(false);
  const [addCatMode, setAddCatMode]             = useState(false);

  const fmtTime = (hIdx: number, mIdx: number, pIdx: number) =>
    `${HOURS_LIST[hIdx]}:${MINUTES_LIST[mIdx]} ${PERIODS_LIST[pIdx]}`;

  const openTimePicker = (target: 'start' | 'end') => {
    setTimeTarget(target);
    if (target === 'start') { setTempHourIdx(startHourIdx); setTempMinuteIdx(startMinuteIdx); setTempPeriodIdx(startPeriodIdx); }
    else { setTempHourIdx(endHourIdx); setTempMinuteIdx(endMinuteIdx); setTempPeriodIdx(endPeriodIdx); }
    setTimeModalKey(k => k + 1);
  };
  const confirmTime = () => {
    if (timeTarget === 'start') { setStartHourIdx(tempHourIdx); setStartMinuteIdx(tempMinuteIdx); setStartPeriodIdx(tempPeriodIdx); }
    else { setEndHourIdx(tempHourIdx); setEndMinuteIdx(tempMinuteIdx); setEndPeriodIdx(tempPeriodIdx); }
    setTimeTarget(null);
  };

  const openCalendar = () => { setCalYear(selYear); setCalMonth(selMonth); setCalSel(selDay); setCalendarVisible(true); };
  const confirmCalendar = () => { if (calSel) { setSelYear(calYear); setSelMonth(calMonth); setSelDay(calSel); } setCalendarVisible(false); };
  const calPrev = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); setCalSel(null); };
  const calNext = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); setCalSel(null); };

  const renderCalGrid = () => {
    const total = daysInMonth(calYear, calMonth);
    const start = firstWeekday(calYear, calMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  };

  const addCustomCategory = () => {
    const c = customCatInput.trim();
    if (!c) return;
    if (!categories.includes(c)) setCategories(prev => [...prev, c]);
    setCategory(c); setCustomCatInput(''); setAddCatMode(false); setCategoryModal(false);
  };

  const openMaps = () => {
    const q = encodeURIComponent(location || 'map');
    Linking.openURL(`https://maps.google.com/maps?q=${q}`).catch(() => Alert.alert('Maps not available'));
    setMapModalVisible(false);
  };
  const openWaze = () => {
    const q = encodeURIComponent(location || 'map');
    Linking.openURL(`https://waze.com/ul?q=${q}`).catch(() => Alert.alert('Waze not available'));
    setMapModalVisible(false);
  };

  const removeReminder = (r: string) => setReminders(p => p.filter(x => x !== r));
  const addReminder = () =>
    Alert.alert('Add Reminder', 'Choose a notification time', [
      { text: '5 min before',  onPress: () => setReminders(p => [...new Set([...p, '5 minutes before'])]) },
      { text: '15 min before', onPress: () => setReminders(p => [...new Set([...p, '15 minutes before'])]) },
      { text: '30 min before', onPress: () => setReminders(p => [...new Set([...p, '30 minutes before'])]) },
      { text: '1 hour before', onPress: () => setReminders(p => [...new Set([...p, '1 hour before'])]) },
      { text: '1 day before',  onPress: () => setReminders(p => [...new Set([...p, '1 day before'])]) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Missing Title', 'Please enter an event title.'); return; }
    const event: AppEvent = {
      id: editEvent?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      startTime: fmtTime(startHourIdx, startMinuteIdx, startPeriodIdx),
      startDate: formatDateLabel(selYear, selMonth, selDay),
      endTime: hasEnd ? fmtTime(endHourIdx, endMinuteIdx, endPeriodIdx) : '',
      location: location.trim(),
      category, priority, reminders, recurrence,
      alarmActive: editEvent?.alarmActive ?? true,
    };
    if (editEvent) {
      updateEvent(event);
      navigation.goBack();
    } else {
      addEvent(event);
      navigation.goBack();
    }
  };

  const cardBg = isDark ? theme.card : '#fff';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg2 }]} edges={['top']}>
      {/* -- Header -- */}
      <View style={[s.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Text style={[s.cancelTxt, { color: theme.textSub }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>{editEvent ? 'Edit Event' : 'New Event'}</Text>
        <TouchableOpacity onPress={handleSave} style={s.headerBtn}>
          <Text style={[s.saveTxt, { color: BLUE }]}>{editEvent ? 'Update' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* -- Title -- */}
        <View style={[s.titleCard, { backgroundColor: cardBg, borderColor: theme.border }]}>
          <TextInput
            style={[s.titleInput, { color: theme.text }]}
            placeholder="Event title"
            placeholderTextColor={theme.textDim}
            value={title}
            onChangeText={setTitle}
            autoFocus
            maxLength={80}
            returnKeyType="next"
          />
          <TextInput
            style={[s.descInput, { color: theme.text, borderTopColor: theme.border }]}
            placeholder="Notes, agenda, links�"
            placeholderTextColor={theme.textDim}
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={400}
            textAlignVertical="top"
          />
        </View>

        {/* -- Timing card -- */}
        <View style={[s.card, { backgroundColor: cardBg, borderColor: theme.border }]}>
          {/* Start row */}
          <TouchableOpacity style={[s.timeRow, { borderBottomColor: theme.border }]} onPress={() => openTimePicker('start')}>
            <View style={s.timeRowLeft}>
              <Ionicons name="time-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.textDim }]}>Start</Text>
            </View>
            <View style={s.timeRowRight}>
              <Text style={[s.timeValue, { color: theme.text }]}>{fmtTime(startHourIdx, startMinuteIdx, startPeriodIdx)}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textDim} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* Date row */}
          <TouchableOpacity style={[s.timeRow, { borderBottomColor: theme.border }]} onPress={openCalendar}>
            <View style={s.timeRowLeft}>
              <Ionicons name="calendar-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.textDim }]}>Date</Text>
            </View>
            <View style={s.timeRowRight}>
              <Text style={[s.timeValue, { color: theme.text }]}>{formatDateLabel(selYear, selMonth, selDay)}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textDim} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* End time row */}
          {hasEnd ? (
            <TouchableOpacity style={[s.timeRow, { borderBottomColor: 'transparent' }]} onPress={() => openTimePicker('end')}>
              <View style={s.timeRowLeft}>
                <Ionicons name="time-outline" size={17} color={theme.textDim} style={{ marginRight: 10 }} />
                <Text style={[s.timeRowLabel, { color: theme.textDim }]}>End</Text>
              </View>
              <View style={s.timeRowRight}>
                <Text style={[s.timeValue, { color: theme.text }]}>{fmtTime(endHourIdx, endMinuteIdx, endPeriodIdx)}</Text>
                <TouchableOpacity onPress={() => setHasEnd(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={theme.textDim} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.timeRow, { borderBottomColor: 'transparent' }]} onPress={() => setHasEnd(true)}>
              <View style={s.timeRowLeft}>
                <Ionicons name="add-circle-outline" size={17} color={theme.textDim} style={{ marginRight: 10 }} />
                <Text style={[s.addEndTxt, { color: theme.textDim }]}>Add end time</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* -- Details card -- */}
        <View style={[s.card, { backgroundColor: cardBg, borderColor: theme.border }]}>
          {/* Location */}
          <View style={[s.timeRow, { borderBottomColor: theme.border }]}>
            <View style={s.timeRowLeft}>
              <Ionicons name="location-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.textDim }]}>Location</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <TextInput
                style={[s.inlineInput, { color: theme.text }]}
                placeholder="Add location"
                placeholderTextColor={theme.textDim}
                value={location}
                onChangeText={setLocation}
                returnKeyType="done"
              />
              {location.length > 0 && (
                <TouchableOpacity onPress={() => setMapModalVisible(true)}>
                  <Ionicons name="map-outline" size={17} color={BLUE} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category */}
          <TouchableOpacity style={[s.timeRow, { borderBottomColor: theme.border }]} onPress={() => { setAddCatMode(false); setCategoryModal(true); }}>
            <View style={s.timeRowLeft}>
              <Ionicons name="pricetag-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.textDim }]}>Category</Text>
            </View>
            <View style={s.timeRowRight}>
              <Text style={[s.timeValue, { color: theme.text }]}>{category}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textDim} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* Priority */}
          <View style={[s.timeRow, { borderBottomColor: theme.border }]}>
            <View style={s.timeRowLeft}>
              <Ionicons name="flag-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.textDim }]}>Priority</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {PRIORITIES.map(p => {
                const active = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[s.pill, { backgroundColor: active ? PRIORITY_COLORS[p] : theme.bg2, borderColor: active ? PRIORITY_COLORS[p] : theme.border }]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[s.pillTxt, { color: active ? '#fff' : theme.textSub }]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Recurrence */}
          <View style={[s.timeRow, { borderBottomColor: 'transparent' }]}>
            <View style={s.timeRowLeft}>
              <Ionicons name="repeat-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.textDim }]}>Repeat</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['none', 'daily', 'weekly', 'monthly'] as const).map(r => {
                const active = recurrence === r;
                const label = r === 'none' ? 'Once' : r.charAt(0).toUpperCase() + r.slice(1);
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.pill, { backgroundColor: active ? BLUE : theme.bg2, borderColor: active ? BLUE : theme.border }]}
                    onPress={() => setRecurrence(r)}
                  >
                    <Text style={[s.pillTxt, { color: active ? '#fff' : theme.textSub }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* -- Reminders card -- */}
        <View style={[s.card, { backgroundColor: cardBg, borderColor: theme.border }]}>
          <View style={[s.cardHeaderRow, { borderBottomColor: theme.border }]}>
            <Ionicons name="notifications-outline" size={15} color={BLUE} />
            <Text style={[s.cardHeaderTxt, { color: theme.text }]}>Reminders</Text>
            <TouchableOpacity style={s.addRemBtn} onPress={addReminder}>
              <Ionicons name="add" size={14} color={BLUE} />
              <Text style={s.addRemTxt}>Add</Text>
            </TouchableOpacity>
          </View>
          {reminders.length === 0 ? (
            <Text style={[s.emptyRemTxt, { color: theme.textDim }]}>No reminders</Text>
          ) : (
            reminders.map((r, i) => (
              <View key={i} style={[s.remRow, { borderBottomColor: theme.border }, i === reminders.length - 1 && { borderBottomWidth: 0 }]}>
                <Ionicons name="time-outline" size={15} color={theme.textDim} style={{ marginRight: 10 }} />
                <Text style={[s.remTxt, { color: theme.textSub }]}>{r}</Text>
                <TouchableOpacity onPress={() => removeReminder(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={17} color={theme.textDim} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* -- Save button -- */}
      <View style={[s.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={s.saveBtnTxt}>{editEvent ? 'Update Event' : 'Create Event'}</Text>
        </TouchableOpacity>
      </View>

      {/* -- TIME PICKER MODAL -- */}
      <Modal visible={timeTarget !== null} animationType="slide" transparent onRequestClose={() => setTimeTarget(null)}>
        <Pressable style={s.overlay} onPress={() => setTimeTarget(null)} />
        <View style={[s.sheet, { backgroundColor: theme.bg }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
          <View style={[s.sheetHead, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setTimeTarget(null)}>
              <Text style={[s.sheetCancel, { color: theme.textDim }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.text }]}>{timeTarget === 'start' ? 'Start Time' : 'End Time'}</Text>
            <TouchableOpacity onPress={confirmTime}>
              <Text style={[s.sheetDone, { color: BLUE }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={s.wheelRow}>
            <WheelCol wheelKey={`h-${timeModalKey}`} items={HOURS_LIST}   selectedIndex={tempHourIdx}   onSelect={setTempHourIdx}   width={88} />
            <WheelCol wheelKey={`m-${timeModalKey}`} items={MINUTES_LIST} selectedIndex={tempMinuteIdx} onSelect={setTempMinuteIdx} width={88} />
            <WheelCol wheelKey={`p-${timeModalKey}`} items={PERIODS_LIST} selectedIndex={tempPeriodIdx} onSelect={setTempPeriodIdx} width={76} />
          </View>
          <View style={{ height: 20 }} />
        </View>
      </Modal>

      {/* -- CALENDAR MODAL -- */}
      <Modal visible={calendarVisible} animationType="slide" transparent onRequestClose={() => setCalendarVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setCalendarVisible(false)} />
        <View style={[s.calSheet, { backgroundColor: theme.bg }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
          <View style={[s.sheetHead, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setCalendarVisible(false)}>
              <Text style={[s.sheetCancel, { color: theme.textDim }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.text }]}>Select Date</Text>
            <TouchableOpacity onPress={confirmCalendar}>
              <Text style={[s.sheetDone, { color: BLUE }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={s.calNav}>
            <TouchableOpacity onPress={calPrev} style={s.calNavBtn}><Ionicons name="chevron-back" size={20} color={theme.textSub} /></TouchableOpacity>
            <Text style={[s.calMonthTitle, { color: theme.text }]}>{MONTH_NAMES[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={calNext} style={s.calNavBtn}><Ionicons name="chevron-forward" size={20} color={theme.textSub} /></TouchableOpacity>
          </View>
          <View style={s.calDayRow}>
            {DAY_SHORTS.map(d => <Text key={d} style={[s.calDayHdr, { color: theme.textDim }]}>{d}</Text>)}
          </View>
          {renderCalGrid().map((row, ri) => (
            <View key={ri} style={s.calRow}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={s.calCell} />;
                const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
                const isSel = day === calSel;
                return (
                  <TouchableOpacity key={ci} style={[s.calCell, isToday && s.calToday, isSel && s.calSel]} onPress={() => setCalSel(day)}>
                    <Text style={[s.calCellTxt, { color: theme.text }, isToday && !isSel && { color: BLUE, fontWeight: '700' }, isSel && { color: '#fff', fontWeight: '700' }]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={{ height: 16 }} />
        </View>
      </Modal>

      {/* -- MAP MODAL -- */}
      <Modal visible={mapModalVisible} animationType="slide" transparent onRequestClose={() => setMapModalVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setMapModalVisible(false)} />
        <View style={[s.mapSheet, { backgroundColor: theme.bg }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
          <Text style={[s.mapTitle, { color: theme.text }]}>Open in Maps</Text>
          {location ? <Text style={[s.mapSub, { color: theme.textDim }]}>"{location}"</Text> : null}
          <TouchableOpacity style={[s.mapBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={openMaps}>
            <Ionicons name="navigate-circle-outline" size={24} color="#4285F4" />
            <Text style={[s.mapBtnTxt, { color: theme.text }]}>Google Maps</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.textDim} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.mapBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={openWaze}>
            <Ionicons name="car-outline" size={24} color="#33CCFF" />
            <Text style={[s.mapBtnTxt, { color: theme.text }]}>Waze</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.textDim} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMapModalVisible(false)} style={s.mapCancel}>
            <Text style={[{ fontSize: 14, fontWeight: '500' }, { color: theme.textDim }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* -- CATEGORY MODAL -- */}
      <Modal visible={categoryModal} animationType="slide" transparent onRequestClose={() => setCategoryModal(false)}>
        <Pressable style={s.overlay} onPress={() => setCategoryModal(false)} />
        <View style={[s.catSheet, { backgroundColor: theme.bg }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
          <View style={[s.sheetHead, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setCategoryModal(false)}>
              <Text style={[s.sheetCancel, { color: theme.textDim }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.text }]}>Category</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {categories.map(c => (
              <TouchableOpacity key={c} style={[s.catRow, { borderBottomColor: theme.border }]} onPress={() => { setCategory(c); setCategoryModal(false); }}>
                <Text style={[s.catTxt, { color: c === category ? BLUE : theme.text }, c === category && { fontWeight: '700' }]}>{c}</Text>
                {c === category && <Ionicons name="checkmark" size={18} color={BLUE} />}
              </TouchableOpacity>
            ))}
            {addCatMode ? (
              <View style={[s.catRow, { borderBottomColor: theme.border, gap: 8 }]}>
                <TextInput
                  style={[s.catAddInput, { backgroundColor: theme.bg2, borderColor: theme.border, color: theme.text, flex: 1 }]}
                  placeholder="New category"
                  placeholderTextColor={theme.textDim}
                  value={customCatInput}
                  onChangeText={setCustomCatInput}
                  autoFocus maxLength={30}
                />
                <TouchableOpacity style={s.catAddBtn} onPress={addCustomCategory}>
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>Add</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[s.catRow, { borderBottomColor: 'transparent' }]} onPress={() => setAddCatMode(true)}>
                <Ionicons name="add-circle-outline" size={17} color={BLUE} style={{ marginRight: 8 }} />
                <Text style={[s.catTxt, { color: BLUE }]}>Add category</Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 12 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}