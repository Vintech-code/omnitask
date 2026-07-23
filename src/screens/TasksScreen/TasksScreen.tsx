import { fontFamily } from '@/theme/typography';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppBackground } from '@/components/ui';
import { BurgerMenu } from '@/components/BurgerMenu';
import { OrganizerSection, OrganizerSwitch } from '@/components/OrganizerSwitch';
import {
  CanvasNotesWorkspace,
  StandardNotesWorkspace,
} from '@/components/notes';
import { useTheme } from '@/context/ThemeContext';
import EventAlarmsScreen from '@/screens/EventAlarmsScreen';

export default function TasksScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const [section, setSection] = useState<OrganizerSection>('notes');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const requested = route?.params?.section;
    if (requested === 'notes' || requested === 'canvas' || requested === 'events') setSection(requested);
  }, [route?.params?.section]);

  useEffect(() => {
    setSearchOpen(false);
    setQuery('');
  }, [section]);

  if (section === 'events') {
    return (
      <EventAlarmsScreen
        navigation={navigation}
        organizerSection={section}
        onOrganizerSectionChange={setSection}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBackground />
      <View style={styles.header}>
        <BurgerMenu navigation={navigation} />
        {searchOpen ? <View style={[styles.headerSearch, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <Ionicons name="search-outline" size={19} color={theme.accent.base} />
          <TextInput autoFocus value={query} onChangeText={setQuery} placeholder={section === 'notes' ? 'Search notes' : 'Search canvas boards'} placeholderTextColor={theme.content.muted} style={[styles.searchInput, { color: theme.content.primary }]} />
          {query ? <TouchableOpacity accessibilityLabel="Clear search" style={styles.headerAction} onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color={theme.content.muted} /></TouchableOpacity> : null}
        </View> : <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.content.primary }]}>
            {section === 'notes' ? 'Notes' : 'Canvas'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.content.secondary }]}>
            {section === 'notes'
              ? 'Capture ideas, documents, and checklists'
              : 'Sketch, organize, and connect your ideas'}
          </Text>
        </View>}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={searchOpen ? 'Close search' : `Search ${section}`} style={[styles.headerAction, searchOpen && { backgroundColor: theme.accent.soft }]} onPress={() => { setSearchOpen(value => !value); if (searchOpen) setQuery(''); }}><Ionicons name={searchOpen ? 'close' : 'search-outline'} size={22} color={searchOpen ? theme.accent.base : theme.content.primary} /></TouchableOpacity>
      </View>
      <OrganizerSwitch value={section} onChange={setSection} />
      {section === 'notes' ? (
        <StandardNotesWorkspace
          initialNoteId={route?.params?.noteId}
          openRequest={route?.params?.noteRequest}
          createType={route?.params?.createType}
          createRequest={route?.params?.createRequest}
          query={query}
        />
      ) : <CanvasNotesWorkspace query={query} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { minHeight: 72, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  headerSearch: { flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, paddingLeft: 14, paddingRight: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 14, fontFamily: fontFamily.medium },
  headerAction: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, lineHeight: 32, fontFamily: fontFamily.extrabold, letterSpacing: -0.4 },
  subtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, fontFamily: fontFamily.medium },
});
