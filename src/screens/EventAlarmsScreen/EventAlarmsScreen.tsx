import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEvents, AppEvent } from '@/context/EventStore';
import { useTheme } from '@/context/ThemeContext';
import { BurgerMenu } from '@/components/BurgerMenu';
import { OrganizerSwitch, OrganizerSection } from '@/components/OrganizerSwitch';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { calS, styles } from './styles';
import { AppBackground, ScreenSkeleton } from '@/components/ui';
import { EventActionSheet } from '@/components/events';
import { canScheduleEventReminders, eventOccursOnDate, eventStart, formatEventSchedule, nextUpcomingEvent } from '@/utils/eventDate';


function parseTime(timeStr: string): { time: string; period: 'AM' | 'PM' } {
  const parts = timeStr.trim().split(' ');
  const period: 'AM' | 'PM' = (parts[1] || '').toUpperCase() === 'PM' ? 'PM' : 'AM';
  return { time: parts[0] || '--:--', period };
}

interface EventAlarmsScreenProps {
  navigation: any;
  organizerSection?: OrganizerSection;
  onOrganizerSectionChange?: (value: OrganizerSection) => void;
}

export default function EventAlarmsScreen({
  navigation,
  organizerSection,
  onOrganizerSectionChange,
}: EventAlarmsScreenProps) {
  const { theme, isDark } = useTheme();
  const { events, isLoading, toggleAlarmActive, removeEvent } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [menuEvent, setMenuEvent] = useState<AppEvent | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<AppEvent | null>(null);
  const [manageVisible, setManageVisible] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 700); };

  const activeCount = events.filter(event => event.alarmActive && canScheduleEventReminders(event)).length;
  const nextEvent = nextUpcomingEvent(events);
  const orderedEvents = [...events].sort((left, right) => {
    const leftTime = eventStart(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = eventStart(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const now = Date.now();
    const leftPast = leftTime < now;
    const rightPast = rightTime < now;
    if (leftPast !== rightPast) return leftPast ? 1 : -1;
    return leftPast ? rightTime - leftTime : leftTime - rightTime;
  });

  if (isLoading) {
    return <ScreenSkeleton variant="list" />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top']}>
      <AppBackground />
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: 'transparent', borderBottomColor: 'transparent' }]}>
        <BurgerMenu navigation={navigation} />
        <Text style={[styles.topBarTitle, { color: theme.text }]}>Events</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { setViewMode(v => v === 'list' ? 'calendar' : 'list'); setSelectedDay(null); }}>
            <Ionicons name={viewMode === 'list' ? 'calendar-outline' : 'list-outline'} size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation?.navigate('CreateEvent')}>
            <Ionicons name="add-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {organizerSection && onOrganizerSectionChange ? (
        <OrganizerSwitch value={organizerSection} onChange={onOrganizerSectionChange} />
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textDim} />}
      >
        {viewMode === 'calendar' ? (
          // -- CALENDAR VIEW --
          <CalendarView
            events={events}
            theme={theme}
            isDark={isDark}
            calDate={calDate}
            setCalDate={setCalDate}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            navigation={navigation}
          />
        ) : (
          <>
        {/* Stat Cards */}
        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>ACTIVE ALARMS</Text>
            <Text style={[styles.statValueBlue, { color: theme.text }]}>{activeCount}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>NEXT EVENT</Text>
            <Text style={[styles.statValueDark, { color: theme.text }]} numberOfLines={1}>
              {nextEvent ? nextEvent.title : 'None'}
            </Text>
          </View>
        </View>

        {/* EVENT ALARMS header */}
        <View style={styles.sectionHeader}>
          <View style={styles.blueDot} />
          <Text style={[styles.sectionTitle, { color: theme.textDim }]}>EVENT ALARMS</Text>
          {events.length > 0 && (
            <TouchableOpacity style={styles.manageAllBtn} onPress={() => setManageVisible(true)}>
              <Text style={styles.manageAllText}>Manage All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Empty state */}
        {events.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={theme.textDim} />
            <Text style={[styles.emptyTitle, { color: theme.textDim }]}>No events yet</Text>
            <Text style={[styles.emptySub, { color: theme.textDim }]}>Create an event to see it here</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation?.navigate('CreateEvent')}
            >
              <Text style={styles.emptyAddText}>+ New Event</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Event Alarm Cards */}
        {orderedEvents.map(event => {
          const { time, period } = event.allDay ? { time: 'ALL DAY', period: '' as const } : parseTime(event.startTime);
          const recurrence = event.recurrence ?? 'none';
          const repeat = recurrence === 'none' ? 'ONCE' : recurrence.toUpperCase();
          const notificationChips = event.reminders;
          const canSchedule = canScheduleEventReminders(event);

          return (
            <TouchableOpacity
              key={event.id}
              style={[styles.alarmCard, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}
              onPress={() => navigation?.navigate('EventDetail', { event })}
              activeOpacity={0.82}
            >
              <View style={styles.alarmLeftBorder} />
              <View style={styles.alarmCardBody}>
                {/* Time + Toggle */}
                <View style={styles.alarmTopRow}>
                  <View style={styles.alarmTimeBlock}>
                    <Text style={[styles.alarmTime, { color: theme.text }, !event.alarmActive && styles.alarmTimeInactive]}>
                      {time}
                    </Text>
                    <Text style={[styles.alarmPeriod, { color: theme.textSub }, !event.alarmActive && styles.alarmTimeInactive]}>
                      {' '}{period}
                    </Text>
                  </View>
                  <View style={styles.alarmTopActions}>
                    <Switch
                      testID={`event-reminder-toggle-${event.id}`}
                      value={event.alarmActive}
                      onValueChange={() => toggleAlarmActive(event.id)}
                      disabled={!canSchedule && !event.alarmActive}
                      trackColor={{ false: theme.divider, true: theme.accent.soft }}
                      thumbColor={event.alarmActive ? theme.accent.base : '#f0f0f0'}
                      style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`More actions for ${event.title}`}
                      onPress={() => setMenuEvent(event)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color={theme.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Event Name + Meta */}
                <Text style={[styles.alarmTitle, { color: theme.text }, !event.alarmActive && styles.alarmTitleInactive]}>
                  {event.title}
                </Text>

                <View style={styles.alarmEventRow}>
                  <Ionicons name="calendar-outline" size={12} color={theme.textDim} />
                  <Text style={[styles.alarmEventText, { color: theme.textDim }]}>
                    {formatEventSchedule(event)}
                  </Text>
                </View>

                {/* Meta row */}
                <View style={styles.alarmMetaRow}>
                  {event.location ? (
                    <>
                      <Ionicons name="location-outline" size={12} color={BLUE} />
                      <Text style={styles.alarmMetaBlue} numberOfLines={1}>{event.location}</Text>
                      <Text style={[styles.alarmMetaDot, { color: theme.textDim }]}>·</Text>
                    </>
                  ) : null}
                  <View style={[styles.repeatBadge, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                    <Text style={[styles.repeatBadgeText, { color: theme.textSub }]}>{repeat}</Text>
                  </View>
                </View>

                {/* Category badge + notification chips */}
                <View style={styles.alarmBottomRow}>
                  <View style={styles.chipsRow}>
                    <View style={[styles.categoryChip, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF' }]}>
                      <Text style={styles.categoryChipText}>{event.category}</Text>
                    </View>
                    {notificationChips.slice(0, 2).map((chip, i) => (
                      <View key={i} style={[styles.chip, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                        <Ionicons name="alarm-outline" size={11} color={theme.textDim} />
                        <Text style={[styles.chipText, { color: theme.textSub }]}>{chip}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.priorityBadge, {
                    backgroundColor:
                      event.priority === 'High' ? '#FDECEA' :
                      event.priority === 'Medium' ? '#FEF9E7' : '#E9F7EF',
                  }]}>
                    <Text style={[styles.priorityBadgeText, {
                      color:
                        event.priority === 'High' ? '#E05252' :
                        event.priority === 'Medium' ? '#E09C52' : '#52B788',
                    }]}>
                      {event.priority}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>

      <EventActionSheet
        visible={Boolean(menuEvent)}
        title={menuEvent?.title ?? 'Event actions'}
        message="Choose what you want to do with this event."
        onClose={() => setMenuEvent(null)}
        actions={menuEvent ? [
          {
            label: 'Edit event',
            description: 'Change date, time, details, and reminders',
            icon: 'create-outline',
            tone: 'accent',
            onPress: () => {
              const event = menuEvent;
              setMenuEvent(null);
              navigation?.navigate('CreateEvent', { event });
            },
          },
          {
            label: menuEvent.alarmActive ? 'Turn reminders off' : 'Turn reminders on',
            description: canScheduleEventReminders(menuEvent)
              ? `${menuEvent.reminders.length} reminder${menuEvent.reminders.length === 1 ? '' : 's'} configured`
              : menuEvent.alarmActive
                ? 'This reminder time has passed; turn it off or edit the event'
                : 'Choose a future reminder time in Edit event',
            icon: menuEvent.alarmActive ? 'notifications-off-outline' : 'notifications-outline',
            disabled: !canScheduleEventReminders(menuEvent) && !menuEvent.alarmActive,
            onPress: () => {
              toggleAlarmActive(menuEvent.id);
              setMenuEvent(null);
            },
          },
          {
            label: 'Delete event',
            description: 'Permanently remove this event and its reminders',
            icon: 'trash-outline',
            tone: 'danger',
            onPress: () => {
              setDeleteEvent(menuEvent);
              setMenuEvent(null);
            },
          },
        ] : []}
      />

      <EventActionSheet
        visible={Boolean(deleteEvent)}
        title="Delete event?"
        message={deleteEvent ? `“${deleteEvent.title}” and its scheduled reminders will be permanently removed.` : undefined}
        closeLabel="Keep event"
        onClose={() => setDeleteEvent(null)}
        actions={deleteEvent ? [{
          label: 'Delete permanently',
          icon: 'trash-outline',
          tone: 'danger',
          onPress: () => {
            removeEvent(deleteEvent.id);
            setDeleteEvent(null);
          },
        }] : []}
      />

      <EventActionSheet
        visible={manageVisible}
        title="Manage event reminders"
        message="This changes notification reminders for all events that have at least one reminder time."
        onClose={() => setManageVisible(false)}
        actions={[
          {
            label: 'Turn all reminders on',
            description: 'Events without reminder times are left unchanged',
            icon: 'notifications-outline',
            tone: 'accent',
            onPress: () => {
              events.forEach(event => {
                if (!event.alarmActive && canScheduleEventReminders(event)) toggleAlarmActive(event.id);
              });
              setManageVisible(false);
            },
          },
          {
            label: 'Turn all reminders off',
            icon: 'notifications-off-outline',
            onPress: () => {
              events.forEach(event => {
                if (event.alarmActive) toggleAlarmActive(event.id);
              });
              setManageVisible(false);
            },
          },
        ]}
      />

    </SafeAreaView>
  );
}

// -- CALENDAR VIEW COMPONENT --------------------------------------------------
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function CalendarView({ events, theme, isDark, calDate, setCalDate, selectedDay, setSelectedDay, navigation }: any) {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const dayEvents: Record<number, AppEvent[]> = {};
  events.forEach((e: AppEvent) => {
    for (let day = 1; day <= daysInMonth; day += 1) {
      if (!eventOccursOnDate(e, new Date(year, month, day))) continue;
      if (!dayEvents[day]) dayEvents[day] = [];
      dayEvents[day].push(e);
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents: AppEvent[] = selectedDay ? (dayEvents[selectedDay] ?? []) : [];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {/* Month navigation */}
      <View style={calS.monthRow}>
        <TouchableOpacity onPress={() => setCalDate(new Date(year, month - 1, 1))} style={calS.navBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[calS.monthTitle, { color: theme.text }]}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={() => setCalDate(new Date(year, month + 1, 1))} style={calS.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Day name headers */}
      <View style={calS.dayNamesRow}>
        {DAY_NAMES.map(d => (
          <Text key={d} style={[calS.dayName, { color: theme.textDim }]}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={calS.grid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`empty-${idx}`} style={calS.cell} />;
          const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
          const isSelected = selectedDay === day;
          const hasDots = (dayEvents[day] ?? []).length > 0;
          return (
            <TouchableOpacity
              key={day}
              style={[calS.cell, isSelected && { backgroundColor: BLUE + '22', borderRadius: 10 }]}
              onPress={() => setSelectedDay(isSelected ? null : day)}
            >
              <Text style={[
                calS.dayNum,
                { color: theme.text },
                isToday && calS.todayNum,
                isSelected && { color: BLUE, fontWeight: '800' },
              ]}>{day}</Text>
              {hasDots && (
                <View style={calS.dotsRow}>
                  {(dayEvents[day] ?? []).slice(0, 3).map((_, i) => (
                    <View key={i} style={[calS.dot, { backgroundColor: BLUE }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day events */}
      {selectedDay !== null && (
        <View style={{ marginTop: 16 }}>
          <Text style={[calS.dayEventsTitle, { color: theme.textDim }]}>
            {MONTH_NAMES[month]} {selectedDay}
          </Text>
          {selectedEvents.length === 0 && (
            <Text style={{ color: theme.textDim, fontSize: 14, paddingVertical: 10 }}>No events this day</Text>
          )}
          {selectedEvents.map(ev => (
            <TouchableOpacity
              key={ev.id}
              style={[calS.eventRow, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation?.navigate('EventDetail', { event: ev })}
            >
              <View style={calS.eventDot} />
              <View style={{ flex: 1 }}>
                <Text style={[calS.eventRowTitle, { color: theme.text }]} numberOfLines={1}>{ev.title}</Text>
                <Text style={[calS.eventRowTime, { color: theme.textDim }]}>{ev.allDay ? 'All day' : ev.startTime}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ height: 40 }} />
    </View>
  );
}
