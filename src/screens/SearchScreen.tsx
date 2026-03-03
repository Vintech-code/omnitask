import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTaskStore } from '../context/TaskStore';
import { useEvents } from '../context/EventStore';
import { useAlarmStore } from '../context/AlarmStore';

const BLUE = '#4A90D9';

type ResultType = 'note' | 'event' | 'alarm';
interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  payload: any;
}

export default function SearchScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { notes } = useTaskStore();
  const { events } = useEvents();
  const { alarms } = useAlarmStore();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ResultType | 'all'>('all');

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];

    if (filter === 'all' || filter === 'note') {
      notes.forEach(n => {
        if (n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) {
          out.push({
            id: `note-${n.id}`, type: 'note',
            title: n.title || 'Untitled',
            subtitle: n.body.slice(0, 60) || n.date,
            icon: 'document-text-outline',
            color: '#52B788',
            payload: n,
          });
        }
      });
    }

    if (filter === 'all' || filter === 'event') {
      events.forEach(e => {
        if (
          e.title.toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        ) {
          out.push({
            id: `event-${e.id}`, type: 'event',
            title: e.title,
            subtitle: `${e.startDate} · ${e.startTime}${e.location ? ' · ' + e.location : ''}`,
            icon: 'calendar-outline',
            color: BLUE,
            payload: e,
          });
        }
      });
    }

    if (filter === 'all' || filter === 'alarm') {
      alarms.forEach(a => {
        if (a.label.toLowerCase().includes(q) || a.sound.toLowerCase().includes(q)) {
          const time = `${String(a.hour).padStart(2, '0')}:${String(a.minute).padStart(2, '0')} ${a.period}`;
          out.push({
            id: `alarm-${a.id}`, type: 'alarm',
            title: a.label || 'Alarm',
            subtitle: `${time} · ${a.sound}`,
            icon: 'alarm-outline',
            color: '#E09C52',
            payload: a,
          });
        }
      });
    }

    return out;
  }, [query, filter, notes, events, alarms]);

  const handlePress = (r: SearchResult) => {
    if (r.type === 'event') {
      navigation.navigate('EventDetail', { event: r.payload });
    } else if (r.type === 'alarm') {
      navigation.navigate('Alarm');
    } else {
      navigation.navigate('Main', { screen: 'Tasks' });
    }
  };

  const filterBtns: { label: string; val: ResultType | 'all'; icon: string; color: string }[] = [
    { label: 'All',    val: 'all',   icon: 'grid-outline',          color: BLUE    },
    { label: 'Notes',  val: 'note',  icon: 'document-text-outline', color: '#52B788' },
    { label: 'Events', val: 'event', icon: 'calendar-outline',      color: BLUE    },
    { label: 'Alarms', val: 'alarm', icon: 'alarm-outline',         color: '#E09C52' },
  ];

  // Group by type for "all" view
  const grouped = useMemo(() => {
    const groups: { type: ResultType; label: string; icon: string; color: string; items: SearchResult[] }[] = [
      { type: 'note',  label: 'Notes',  icon: 'document-text-outline', color: '#52B788', items: [] },
      { type: 'event', label: 'Events', icon: 'calendar-outline',      color: BLUE,      items: [] },
      { type: 'alarm', label: 'Alarms', icon: 'alarm-outline',         color: '#E09C52', items: [] },
    ];
    results.forEach(r => {
      const g = groups.find(g => g.type === r.type);
      if (g) g.items.push(r);
    });
    return groups.filter(g => g.items.length > 0);
  }, [results]);

  const highlight = (text: string, color: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return <Text style={[sr.resultTitle, { color: theme.text }]}>{text}</Text>;
    const idx = text.toLowerCase().indexOf(q);
    if (idx < 0) return <Text style={[sr.resultTitle, { color: theme.text }]}>{text}</Text>;
    return (
      <Text style={[sr.resultTitle, { color: theme.text }]}>
        {text.slice(0, idx)}
        <Text style={{ backgroundColor: `${color}28`, color, fontWeight: '800' }}>{text.slice(idx, idx + q.length)}</Text>
        {text.slice(idx + q.length)}
      </Text>
    );
  };

  const TIPS = [
    { icon: 'document-text-outline', color: '#52B788', text: 'Search your notes and tasks' },
    { icon: 'calendar-outline',      color: BLUE,      text: 'Find upcoming events by name, location or category' },
    { icon: 'alarm-outline',         color: '#E09C52', text: 'Look up alarms by label or time' },
  ];

  return (
    <SafeAreaView style={[sr.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[sr.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={sr.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={[sr.searchBox, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={17} color={theme.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={[sr.searchInput, { color: theme.text }]}
            placeholder="Search notes, events, alarms…"
            placeholderTextColor={theme.textDim}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={[sr.filtersRow, { borderBottomColor: theme.border }]}
      >
        {filterBtns.map(f => {
          const active = filter === f.val;
          return (
            <TouchableOpacity
              key={f.val}
              style={[sr.filterChip, { backgroundColor: active ? f.color : theme.bg2, borderColor: active ? f.color : theme.border }]}
              onPress={() => setFilter(f.val)}
            >
              <Ionicons name={f.icon as any} size={13} color={active ? '#fff' : theme.textDim} />
              <Text style={[sr.filterChipText, { color: active ? '#fff' : theme.textSub }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Empty: no query yet */}
        {query.trim().length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 40 }}>
            <Text style={[sr.emptyHeading, { color: theme.textDim }]}>What are you looking for?</Text>
            {TIPS.map(tip => (
              <View key={tip.text} style={[sr.tipRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[sr.tipIcon, { backgroundColor: `${tip.color}18` }]}>
                  <Ionicons name={tip.icon as any} size={20} color={tip.color} />
                </View>
                <Text style={[sr.tipText, { color: theme.textSub }]}>{tip.text}</Text>
              </View>
            ))}
          </View>

        /* No results */
        ) : results.length === 0 ? (
          <View style={sr.noResultsWrap}>
            <View style={[sr.noResultsIcon, { backgroundColor: theme.bg2 }]}>
              <Ionicons name="search-outline" size={36} color={theme.textDim} />
            </View>
            <Text style={[sr.noResultsTitle, { color: theme.text }]}>No results</Text>
            <Text style={[sr.noResultsSub, { color: theme.textDim }]}>
              Nothing matched <Text style={{ fontWeight: '700' }}>"{query}"</Text>. Try a different keyword.
            </Text>
          </View>

        /* Results */
        ) : filter !== 'all' ? (
          // Single-type list
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 40 }}>
            <Text style={[sr.countTxt, { color: theme.textDim }]}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </Text>
            {results.map(r => <ResultCard key={r.id} r={r} theme={theme} onPress={handlePress} highlight={highlight} />)}
          </View>
        ) : (
          // Grouped by type
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 40 }}>
            {grouped.map(group => (
              <View key={group.type} style={{ marginBottom: 20 }}>
                <View style={sr.sectionHead}>
                  <View style={[sr.sectionIconWrap, { backgroundColor: `${group.color}18` }]}>
                    <Ionicons name={group.icon as any} size={14} color={group.color} />
                  </View>
                  <Text style={[sr.sectionLabel, { color: group.color }]}>{group.label.toUpperCase()}</Text>
                  <View style={[sr.sectionCount, { backgroundColor: `${group.color}18` }]}>
                    <Text style={[sr.sectionCountText, { color: group.color }]}>{group.items.length}</Text>
                  </View>
                </View>
                {group.items.map(r => <ResultCard key={r.id} r={r} theme={theme} onPress={handlePress} highlight={highlight} />)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({ r, theme, onPress, highlight }: {
  r: SearchResult;
  theme: any;
  onPress: (r: SearchResult) => void;
  highlight: (text: string, color: string) => React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[sr.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => onPress(r)}
      activeOpacity={0.75}
    >
      <View style={[sr.resultIconWrap, { backgroundColor: `${r.color}18` }]}>
        <Ionicons name={r.icon as any} size={22} color={r.color} />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        {highlight(r.title, r.color)}
        <Text style={[sr.resultSub, { color: theme.textDim }]} numberOfLines={2}>{r.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textDim} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  backBtn: { padding: 6 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  filtersRow: {
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  // Empty / tips
  emptyHeading: { fontSize: 14, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
  tipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10,
  },
  tipIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },

  // No results
  noResultsWrap: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 12 },
  noResultsIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noResultsTitle: { fontSize: 18, fontWeight: '800' },
  noResultsSub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },

  // Results header
  countTxt: { fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Section headers (grouped view)
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  sectionCount: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 2 },
  sectionCountText: { fontSize: 11, fontWeight: '800' },

  // Result card
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  resultIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  resultSub: { fontSize: 12, lineHeight: 17 },
});
