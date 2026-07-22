import { fontFamily } from '@/theme/typography';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  useEffect(() => {
    const requested = route?.params?.section;
    if (requested === 'notes' || requested === 'canvas' || requested === 'events') setSection(requested);
  }, [route?.params?.section]);

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
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.content.primary }]}>
            {section === 'notes' ? 'Notes' : 'Canvas'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.content.secondary }]}>
            {section === 'notes'
              ? 'Capture ideas, documents, and checklists'
              : 'Sketch, organize, and connect your ideas'}
          </Text>
        </View>
      </View>
      <OrganizerSwitch value={section} onChange={setSection} />
      {section === 'notes' ? (
        <StandardNotesWorkspace
          initialNoteId={route?.params?.noteId}
          openRequest={route?.params?.noteRequest}
          createType={route?.params?.createType}
          createRequest={route?.params?.createRequest}
        />
      ) : <CanvasNotesWorkspace />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { minHeight: 72, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: fontFamily.extrabold, letterSpacing: -0.4 },
  subtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, fontFamily: fontFamily.medium },
});
