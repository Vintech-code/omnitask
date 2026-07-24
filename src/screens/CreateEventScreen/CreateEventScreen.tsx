import { fontFamily } from '@/theme/typography';
import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, Pressable } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEvents, AppEvent } from '@/context/EventStore';
import { useTheme } from '@/context/ThemeContext';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { fr, s } from './styles';
import { AppBackground, WheelPickerColumn } from '@/components/ui';
import { EventActionSheet, EventLocationPicker } from '@/components/events';
import { COMMON_TIME_ZONES, parseEventDateTime, reminderMinutes, systemTimeZone } from '@/utils/eventDate';


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

const PRIORITIES = ['Low', 'Medium', 'High'] as const;
type Priority = typeof PRIORITIES[number];
const PRIORITY_COLORS: Record<Priority, string> = {
  Low: '#52B788', Medium: '#E09C52', High: '#E05252',
};

type Period = 'AM' | 'PM';

const HOURS_LIST   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS_LIST = ['AM', 'PM'];

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
      ? <Text style={[fr.label, { color: theme.content.primary }]}>{children}</Text>
      : children;
  return (
    <View style={[fr.row, { borderBottomColor: theme.glass.border }]}>
      <View style={fr.iconWrap}>
        <Ionicons name={icon} size={17} color={BLUE} />
      </View>
      <View style={fr.labelWrap}>
        <Text style={[fr.label, { color: theme.content.muted }]}>{label}</Text>
      </View>
      <View style={fr.valueWrap}>{valueNode}</View>
    </View>
  );
}
// --- Main ---------------------------------------------------------------------
export default function CreateEventScreen({ navigation, route }: any) {
  const { addEvent, updateEvent, categories, addCategory } = useEvents();
  const { theme } = useTheme();
  const editEvent: AppEvent | undefined = route?.params?.event;
  const now = new Date();

  const initStart = editEvent ? parseStoredTime(editEvent.startTime) : { hIdx: 7, mIdx: 0, pIdx: 0 };
  const initEnd   = editEvent?.endTime ? parseStoredTime(editEvent.endTime) : { hIdx: 8, mIdx: 0, pIdx: 0 };
  const initDate  = editEvent ? parseStoredDate(editEvent.startDate) : { y: now.getFullYear(), mo: now.getMonth(), day: now.getDate() };
  const initEndDate = editEvent?.endDate ? parseStoredDate(editEvent.endDate) : initDate;

  const [title, setTitle]           = useState(editEvent?.title || '');
  const [description, setDescription] = useState(editEvent?.description || '');
  const [allDay, setAllDay] = useState(editEvent?.allDay ?? false);
  const [startHourIdx, setStartHourIdx]   = useState(initStart.hIdx);
  const [startMinuteIdx, setStartMinuteIdx] = useState(initStart.mIdx);
  const [startPeriodIdx, setStartPeriodIdx] = useState(initStart.pIdx);
  const [hasEnd, setHasEnd] = useState(Boolean(editEvent?.endTime || editEvent?.endDate));
  const [endHourIdx, setEndHourIdx]     = useState(initEnd.hIdx);
  const [endMinuteIdx, setEndMinuteIdx]   = useState(initEnd.mIdx);
  const [endPeriodIdx, setEndPeriodIdx]   = useState(initEnd.pIdx);
  const [selYear, setSelYear]   = useState(initDate.y);
  const [selMonth, setSelMonth] = useState(initDate.mo);
  const [selDay, setSelDay]     = useState(initDate.day);
  const [endYear, setEndYear] = useState(initEndDate.y);
  const [endMonth, setEndMonth] = useState(initEndDate.mo);
  const [endDay, setEndDay] = useState(initEndDate.day);
  const [timeZone, setTimeZone] = useState(editEvent?.timeZone || systemTimeZone());
  const [location, setLocation] = useState(editEvent?.location || '');
  const [latitude, setLatitude] = useState<number | undefined>(editEvent?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(editEvent?.longitude);
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
  const [dateTarget, setDateTarget] = useState<'start' | 'end'>('start');
  const [calYear, setCalYear]   = useState(selYear);
  const [calMonth, setCalMonth] = useState(selMonth);
  const [calSel, setCalSel]     = useState<number | null>(selDay);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [categoryModal, setCategoryModal]       = useState(false);
  const [timeZoneModal, setTimeZoneModal] = useState(false);
  const [addCatMode, setAddCatMode]             = useState(false);
  const [reminderPickerVisible, setReminderPickerVisible] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const formScrollRef = useRef<ScrollView>(null);

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

  const openCalendar = (target: 'start' | 'end') => {
    setDateTarget(target);
    if (target === 'start') {
      setCalYear(selYear); setCalMonth(selMonth); setCalSel(selDay);
    } else {
      setCalYear(endYear); setCalMonth(endMonth); setCalSel(endDay);
    }
    setCalendarVisible(true);
  };
  const confirmCalendar = () => {
    if (calSel) {
      if (dateTarget === 'start') {
        setSelYear(calYear); setSelMonth(calMonth); setSelDay(calSel);
        const startValue = new Date(calYear, calMonth, calSel).getTime();
        const endValue = new Date(endYear, endMonth, endDay).getTime();
        if (endValue < startValue) {
          setEndYear(calYear); setEndMonth(calMonth); setEndDay(calSel);
        }
      } else {
        setEndYear(calYear); setEndMonth(calMonth); setEndDay(calSel);
      }
    }
    setCalendarVisible(false);
  };
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
    addCategory(c);
    setCategory(c); setCustomCatInput(''); setAddCatMode(false); setCategoryModal(false);
  };

  const removeReminder = (r: string) => setReminders(p => p.filter(x => x !== r));
  const addReminder = () => setReminderPickerVisible(true);

  const selectReminder = (label: string) => {
    setReminders(previous => [...new Set([...previous, label])]);
    setReminderPickerVisible(false);
  };

  const showValidation = (message: string) => {
    setValidationMessage(message);
    requestAnimationFrame(() => formScrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const handleSave = () => {
    if (!title.trim()) {
      showValidation('Enter an event title before saving.');
      return;
    }
    const startDateLabel = formatDateLabel(selYear, selMonth, selDay);
    const endDateLabel = formatDateLabel(endYear, endMonth, endDay);
    const startDateTime = parseEventDateTime(startDateLabel, allDay ? '12:00 AM' : fmtTime(startHourIdx, startMinuteIdx, startPeriodIdx), timeZone);
    const endDateTime = parseEventDateTime(endDateLabel, allDay ? '11:59 PM' : fmtTime(endHourIdx, endMinuteIdx, endPeriodIdx), timeZone);
    if (hasEnd && (!startDateTime || !endDateTime || endDateTime.getTime() < startDateTime.getTime() || (!allDay && endDateTime.getTime() === startDateTime.getTime()))) {
      showValidation(allDay ? 'End date cannot be earlier than start date.' : 'End date and time must be later than the start.');
      return;
    }
    if (recurrence === 'none' && reminders.length > 0) {
      const reminderBase = parseEventDateTime(startDateLabel, allDay ? '09:00 AM' : fmtTime(startHourIdx, startMinuteIdx, startPeriodIdx), timeZone);
      const hasPastReminder = reminders.some(label => {
        const minutes = reminderMinutes(label);
        return minutes === null || !reminderBase || reminderBase.getTime() - minutes * 60_000 <= Date.now();
      });
      if (hasPastReminder) {
        showValidation('A reminder time has already passed. Choose a later event time or remove that reminder.');
        return;
      }
    }
    setValidationMessage(null);
    const event: AppEvent = {
      id: editEvent?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      startTime: fmtTime(startHourIdx, startMinuteIdx, startPeriodIdx),
      startDate: startDateLabel,
      endTime: hasEnd && !allDay ? fmtTime(endHourIdx, endMinuteIdx, endPeriodIdx) : '',
      endDate: hasEnd ? endDateLabel : startDateLabel,
      allDay,
      timeZone,
      location: location.trim(),
      latitude,
      longitude,
      category, priority, reminders, recurrence,
      alarmActive: reminders.length > 0 ? (editEvent?.alarmActive ?? true) : false,
    };
    if (editEvent) {
      updateEvent(event);
      navigation.goBack();
    } else {
      addEvent(event);
      navigation.goBack();
    }
  };

  const cardBg = theme.glass.solid;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <AppBackground />
      {/* -- Header -- */}
      <View style={[s.header, { backgroundColor: 'transparent', borderBottomColor: 'transparent' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Text style={[s.cancelTxt, { color: theme.content.secondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.content.primary }]}>{editEvent ? 'Edit Event' : 'New Event'}</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        ref={formScrollRef}
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* -- Title -- */}
        <View style={[s.titleCard, { backgroundColor: cardBg, borderColor: theme.glass.border }]}>
          <TextInput
            testID="event-title-input"
            style={[s.titleInput, { color: theme.content.primary }]}
            placeholder="Event title"
            placeholderTextColor={theme.content.muted}
            value={title}
            onChangeText={value => {
              setTitle(value);
              if (validationMessage) setValidationMessage(null);
            }}
            autoFocus
            maxLength={80}
            returnKeyType="next"
          />
          <TextInput
            style={[s.descInput, { color: theme.content.primary, borderTopColor: theme.glass.border }]}
            placeholder="Notes, agenda, links…"
            placeholderTextColor={theme.content.muted}
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={400}
            textAlignVertical="top"
          />
        </View>
        {validationMessage ? (
          <View style={[s.validationBanner, { backgroundColor: `${theme.semantic.danger}12`, borderColor: `${theme.semantic.danger}38` }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.semantic.danger} />
            <Text style={[s.validationText, { color: theme.semantic.danger }]}>{validationMessage}</Text>
          </View>
        ) : null}

        {/* -- Timing card -- */}
        <View style={[s.card, { backgroundColor: cardBg, borderColor: theme.glass.border }]}>
          <View style={[s.timeRow, { borderBottomColor: theme.glass.border }]}>
            <View style={s.timeRowLeft}>
              <Ionicons name="sunny-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>All day</Text>
            </View>
            <Switch
              testID="event-all-day-switch"
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ false: theme.glass.border, true: theme.accent.soft }}
              thumbColor={allDay ? BLUE : theme.content.muted}
            />
          </View>

          <TouchableOpacity testID="event-start-date" style={[s.timeRow, { borderBottomColor: theme.glass.border }]} onPress={() => openCalendar('start')}>
            <View style={s.timeRowLeft}>
              <Ionicons name="calendar-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>Start date</Text>
            </View>
            <View style={s.timeRowRight}>
              <Text style={[s.timeValue, { color: theme.content.primary }]}>{formatDateLabel(selYear, selMonth, selDay)}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.content.muted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {!allDay ? (
            <TouchableOpacity testID="event-start-time" style={[s.timeRow, { borderBottomColor: theme.glass.border }]} onPress={() => openTimePicker('start')}>
              <View style={s.timeRowLeft}>
                <Ionicons name="time-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
                <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>Start time</Text>
              </View>
              <View style={s.timeRowRight}>
                <Text style={[s.timeValue, { color: theme.content.primary }]}>{fmtTime(startHourIdx, startMinuteIdx, startPeriodIdx)}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.content.muted} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          ) : null}

          {hasEnd ? (
            <>
              <TouchableOpacity testID="event-end-date" style={[s.timeRow, { borderBottomColor: theme.glass.border }]} onPress={() => openCalendar('end')}>
                <View style={s.timeRowLeft}>
                  <Ionicons name="calendar-outline" size={17} color={theme.content.muted} style={{ marginRight: 10 }} />
                  <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>End date</Text>
                </View>
                <View style={s.timeRowRight}>
                  <Text style={[s.timeValue, { color: theme.content.primary }]}>{formatDateLabel(endYear, endMonth, endDay)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.content.muted} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
              {!allDay ? (
                <TouchableOpacity testID="event-end-time" style={[s.timeRow, { borderBottomColor: 'transparent' }]} onPress={() => openTimePicker('end')}>
                  <View style={s.timeRowLeft}>
                    <Ionicons name="time-outline" size={17} color={theme.content.muted} style={{ marginRight: 10 }} />
                    <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>End time</Text>
                  </View>
                  <View style={s.timeRowRight}>
                    <Text style={[s.timeValue, { color: theme.content.primary }]}>{fmtTime(endHourIdx, endMinuteIdx, endPeriodIdx)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.content.muted} style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity testID="event-remove-end" style={[s.timeRow, { borderBottomColor: 'transparent' }]} onPress={() => setHasEnd(false)}>
                <View style={s.timeRowLeft}>
                  <Ionicons name="close-circle-outline" size={17} color={theme.content.muted} style={{ marginRight: 10 }} />
                  <Text style={[s.addEndTxt, { color: theme.content.muted }]}>Remove end</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity testID="event-add-end" style={[s.timeRow, { borderBottomColor: 'transparent' }]} onPress={() => setHasEnd(true)}>
              <View style={s.timeRowLeft}>
                <Ionicons name="add-circle-outline" size={17} color={theme.content.muted} style={{ marginRight: 10 }} />
                <Text style={[s.addEndTxt, { color: theme.content.muted }]}>Add end date{allDay ? '' : ' and time'}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* -- Details card -- */}
        <View style={[s.card, { backgroundColor: cardBg, borderColor: theme.glass.border }]}>
          <TouchableOpacity testID="event-location-picker" style={[s.timeRow, { borderBottomColor: theme.glass.border }]} onPress={() => setLocationPickerVisible(true)}>
            <View style={s.timeRowLeft}>
              <Ionicons name="location-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>Location</Text>
            </View>
            <View style={s.timeRowRight}>
              <Text numberOfLines={1} style={[s.timeValue, { color: location ? theme.content.primary : theme.content.muted, maxWidth: 170 }]}>
                {location || 'Choose on map'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.content.muted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity testID="event-time-zone" style={[s.timeRow, { borderBottomColor: theme.glass.border }]} onPress={() => setTimeZoneModal(true)}>
            <View style={s.timeRowLeft}>
              <Ionicons name="globe-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>Time zone</Text>
            </View>
            <View style={s.timeRowRight}>
              <Text numberOfLines={1} style={[s.timeValue, { color: theme.content.primary, maxWidth: 170 }]}>{timeZone}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.content.muted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* Category */}
          <TouchableOpacity style={[s.timeRow, { borderBottomColor: theme.glass.border }]} onPress={() => { setAddCatMode(false); setCategoryModal(true); }}>
            <View style={s.timeRowLeft}>
              <Ionicons name="pricetag-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>Category</Text>
            </View>
            <View style={s.timeRowRight}>
              <Text style={[s.timeValue, { color: theme.content.primary }]}>{category}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.content.muted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* Priority */}
          <View style={[s.timeRow, { borderBottomColor: theme.glass.border }]}>
            <View style={s.timeRowLeft}>
              <Ionicons name="flag-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>Priority</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {PRIORITIES.map(p => {
                const active = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[s.pill, { backgroundColor: active ? PRIORITY_COLORS[p] : theme.background.top, borderColor: active ? PRIORITY_COLORS[p] : theme.glass.border }]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[s.pillTxt, { color: active ? '#fff' : theme.content.secondary }]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Recurrence */}
          <View style={[s.timeRow, { borderBottomColor: 'transparent' }]}>
            <View style={s.timeRowLeft}>
              <Ionicons name="repeat-outline" size={17} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={[s.timeRowLabel, { color: theme.content.muted }]}>Repeat</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['none', 'daily', 'weekly', 'monthly'] as const).map(r => {
                const active = recurrence === r;
                const label = r === 'none' ? 'Once' : r.charAt(0).toUpperCase() + r.slice(1);
                return (
                  <TouchableOpacity
                    testID={`event-recurrence-${r}`}
                    key={r}
                    style={[s.pill, { backgroundColor: active ? BLUE : theme.background.top, borderColor: active ? BLUE : theme.glass.border }]}
                    onPress={() => setRecurrence(r)}
                  >
                    <Text style={[s.pillTxt, { color: active ? '#fff' : theme.content.secondary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* -- Reminders card -- */}
        <View style={[s.card, { backgroundColor: cardBg, borderColor: theme.glass.border }]}>
          <View style={[s.cardHeaderRow, { borderBottomColor: theme.glass.border }]}>
            <Ionicons name="notifications-outline" size={15} color={BLUE} />
            <Text style={[s.cardHeaderTxt, { color: theme.content.primary }]}>Reminders</Text>
            <TouchableOpacity testID="event-add-reminder" style={s.addRemBtn} onPress={addReminder}>
              <Ionicons name="add" size={14} color={BLUE} />
              <Text style={s.addRemTxt}>Add</Text>
            </TouchableOpacity>
          </View>
          {reminders.length === 0 ? (
            <Text style={[s.emptyRemTxt, { color: theme.content.muted }]}>No reminders</Text>
          ) : (
            reminders.map((r, i) => (
              <View key={i} style={[s.remRow, { borderBottomColor: theme.glass.border }, i === reminders.length - 1 && { borderBottomWidth: 0 }]}>
                <Ionicons name="time-outline" size={15} color={theme.content.muted} style={{ marginRight: 10 }} />
                <Text style={[s.remTxt, { color: theme.content.secondary }]}>{r}</Text>
                <TouchableOpacity testID={`event-remove-reminder-${i}`} onPress={() => removeReminder(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={17} color={theme.content.muted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* -- Save button -- */}
      <View style={[s.footer, { backgroundColor: theme.glass.solid, borderTopColor: theme.glass.border }]}>
        <TouchableOpacity testID="event-save" style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={s.saveBtnTxt}>{editEvent ? 'Update Event' : 'Create Event'}</Text>
        </TouchableOpacity>
      </View>

      {/* -- TIME PICKER MODAL -- */}
      <Modal visible={timeTarget !== null} animationType="slide" transparent onRequestClose={() => setTimeTarget(null)}>
        <Pressable style={s.overlay} onPress={() => setTimeTarget(null)} />
        <View style={[s.sheet, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.glass.border }]} />
          <View style={[s.sheetHead, { borderBottomColor: theme.glass.border }]}>
            <TouchableOpacity onPress={() => setTimeTarget(null)}>
              <Text style={[s.sheetCancel, { color: theme.content.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.content.primary }]}>{timeTarget === 'start' ? 'Start Time' : 'End Time'}</Text>
            <TouchableOpacity onPress={confirmTime}>
              <Text style={[s.sheetDone, { color: BLUE }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={s.wheelRow}>
            <WheelPickerColumn resetKey={`h-${timeModalKey}`} items={HOURS_LIST} selectedIndex={tempHourIdx} onSelect={setTempHourIdx} width={88} itemHeight={52} selectedFontSize={32} adjacentFontSize={24} distantFontSize={18} />
            <WheelPickerColumn resetKey={`m-${timeModalKey}`} items={MINUTES_LIST} selectedIndex={tempMinuteIdx} onSelect={setTempMinuteIdx} width={88} itemHeight={52} selectedFontSize={32} adjacentFontSize={24} distantFontSize={18} />
            <WheelPickerColumn resetKey={`p-${timeModalKey}`} items={PERIODS_LIST} selectedIndex={tempPeriodIdx} onSelect={setTempPeriodIdx} width={76} itemHeight={52} selectedFontSize={32} adjacentFontSize={24} distantFontSize={18} />
          </View>
          <View style={{ height: 20 }} />
        </View>
      </Modal>

      {/* -- CALENDAR MODAL -- */}
      <Modal visible={calendarVisible} animationType="slide" transparent onRequestClose={() => setCalendarVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setCalendarVisible(false)} />
        <View style={[s.calSheet, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.glass.border }]} />
          <View style={[s.sheetHead, { borderBottomColor: theme.glass.border }]}>
            <TouchableOpacity onPress={() => setCalendarVisible(false)}>
              <Text style={[s.sheetCancel, { color: theme.content.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.content.primary }]}>{dateTarget === 'start' ? 'Start Date' : 'End Date'}</Text>
            <TouchableOpacity onPress={confirmCalendar}>
              <Text style={[s.sheetDone, { color: BLUE }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={s.calNav}>
            <TouchableOpacity onPress={calPrev} style={s.calNavBtn}><Ionicons name="chevron-back" size={20} color={theme.content.secondary} /></TouchableOpacity>
            <Text style={[s.calMonthTitle, { color: theme.content.primary }]}>{MONTH_NAMES[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={calNext} style={s.calNavBtn}><Ionicons name="chevron-forward" size={20} color={theme.content.secondary} /></TouchableOpacity>
          </View>
          <View style={s.calDayRow}>
            {DAY_SHORTS.map(d => <Text key={d} style={[s.calDayHdr, { color: theme.content.muted }]}>{d}</Text>)}
          </View>
          {renderCalGrid().map((row, ri) => (
            <View key={ri} style={s.calRow}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={s.calCell} />;
                const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
                const isSel = day === calSel;
                return (
                  <TouchableOpacity testID={`calendar-day-${day}`} key={ci} style={[s.calCell, isToday && s.calToday, isSel && s.calSel]} onPress={() => setCalSel(day)}>
                    <Text style={[s.calCellTxt, { color: theme.content.primary }, isToday && !isSel && { color: BLUE, fontFamily: fontFamily.bold }, isSel && { color: '#fff', fontFamily: fontFamily.bold }]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={{ height: 16 }} />
        </View>
      </Modal>

      <EventLocationPicker
        visible={locationPickerVisible}
        initialLabel={location}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onCancel={() => setLocationPickerVisible(false)}
        onClear={() => {
          setLocation('');
          setLatitude(undefined);
          setLongitude(undefined);
          setLocationPickerVisible(false);
        }}
        onSelect={selection => {
          setLocation(selection.label);
          setLatitude(selection.latitude);
          setLongitude(selection.longitude);
          setLocationPickerVisible(false);
        }}
      />

      <Modal visible={timeZoneModal} animationType="slide" transparent onRequestClose={() => setTimeZoneModal(false)}>
        <Pressable style={s.overlay} onPress={() => setTimeZoneModal(false)} />
        <View style={[s.catSheet, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.glass.border }]} />
          <View style={[s.sheetHead, { borderBottomColor: theme.glass.border }]}>
            <TouchableOpacity onPress={() => setTimeZoneModal(false)}>
              <Text style={[s.sheetCancel, { color: theme.content.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.content.primary }]}>Time Zone</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            {COMMON_TIME_ZONES.map(zone => (
              <TouchableOpacity
                testID={`time-zone-${zone}`}
                key={zone}
                style={[s.catRow, { borderBottomColor: theme.glass.border }]}
                onPress={() => { setTimeZone(zone); setTimeZoneModal(false); }}
              >
                <Text style={[s.catTxt, { color: zone === timeZone ? BLUE : theme.content.primary }, zone === timeZone && { fontFamily: fontFamily.bold }]}>{zone}</Text>
                {zone === timeZone ? <Ionicons name="checkmark" size={18} color={BLUE} /> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* -- CATEGORY MODAL -- */}
      <Modal visible={categoryModal} animationType="slide" transparent onRequestClose={() => setCategoryModal(false)}>
        <Pressable style={s.overlay} onPress={() => setCategoryModal(false)} />
        <View style={[s.catSheet, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <View style={[s.sheetHandle, { backgroundColor: theme.glass.border }]} />
          <View style={[s.sheetHead, { borderBottomColor: theme.glass.border }]}>
            <TouchableOpacity onPress={() => setCategoryModal(false)}>
              <Text style={[s.sheetCancel, { color: theme.content.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.sheetTitle, { color: theme.content.primary }]}>Category</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {categories.map(c => (
              <TouchableOpacity key={c} style={[s.catRow, { borderBottomColor: theme.glass.border }]} onPress={() => { setCategory(c); setCategoryModal(false); }}>
                <Text style={[s.catTxt, { color: c === category ? BLUE : theme.content.primary }, c === category && { fontFamily: fontFamily.bold }]}>{c}</Text>
                {c === category && <Ionicons name="checkmark" size={18} color={BLUE} />}
              </TouchableOpacity>
            ))}
            {addCatMode ? (
              <View style={[s.catRow, { borderBottomColor: theme.glass.border, gap: 8 }]}>
                <TextInput
                  style={[s.catAddInput, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border, color: theme.content.primary, flex: 1 }]}
                  placeholder="New category"
                  placeholderTextColor={theme.content.muted}
                  value={customCatInput}
                  onChangeText={setCustomCatInput}
                  autoFocus maxLength={30}
                />
                <TouchableOpacity style={s.catAddBtn} onPress={addCustomCategory}>
                  <Text style={{ fontSize: 13, color: '#fff', fontFamily: fontFamily.bold }}>Add</Text>
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

      <EventActionSheet
        visible={reminderPickerVisible}
        title="Add reminder"
        message="Choose when OmniTask should notify you before this event."
        onClose={() => setReminderPickerVisible(false)}
        actions={[
          ['5 minutes before', '5 minutes before'],
          ['15 minutes before', '15 minutes before'],
          ['30 minutes before', '30 minutes before'],
          ['1 hour before', '1 hour before'],
          ['1 day before', '1 day before'],
        ].map(([label, value]) => ({
          label,
          icon: 'time-outline' as const,
          tone: 'accent' as const,
          disabled: reminders.includes(value),
          description: reminders.includes(value) ? 'Already added' : undefined,
          onPress: () => selectReminder(value),
        }))}
      />

    </SafeAreaView>
  );
}
