import { fontFamily } from '@/theme/typography';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import { exportCanvas, printCanvas, saveCanvasFile, shareCanvasFile, type CanvasExportFormat, type CanvasExportOptions } from '@/services/CanvasDocumentService';
import type { InfiniteCanvasNote } from '@/types/note';

const FORMATS: Array<{ value: CanvasExportFormat; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'pdf', label: 'PDF', icon: 'document-text-outline' }, { value: 'png', label: 'PNG', icon: 'image-outline' },
  { value: 'jpeg', label: 'JPEG', icon: 'images-outline' }, { value: 'markdown', label: 'Markdown', icon: 'logo-markdown' },
  { value: 'text', label: 'Plain text', icon: 'text-outline' }, { value: 'omnitask', label: 'OmniTask file', icon: 'layers-outline' },
];

export function CanvasExportSheet({ visible, note, captureTarget, onCaptureModeChange, onClose }: { visible: boolean; note: InfiniteCanvasNote; captureTarget?: unknown; onCaptureModeChange?: (active: boolean) => void; onClose: () => void }) {
  const { theme } = useTheme();
  const [format, setFormat] = useState<CanvasExportFormat>('pdf');
  const [quality, setQuality] = useState<CanvasExportOptions['quality']>('high');
  const [paperSize, setPaperSize] = useState<CanvasExportOptions['paperSize']>('A4');
  const [orientation, setOrientation] = useState<CanvasExportOptions['orientation']>('portrait');
  const [includeBackground, setIncludeBackground] = useState(true); const [includeGrid, setIncludeGrid] = useState(note.gridEnabled); const [includeTitle, setIncludeTitle] = useState(true); const [includeDate, setIncludeDate] = useState(true);
  const [busy, setBusy] = useState<'save' | 'share' | 'print' | null>(null);
  const options: CanvasExportOptions = { format, quality, paperSize, orientation, includeBackground, includeGrid, includeTitle, includeDate };
  const run = async (mode: 'save' | 'share' | 'print') => {
    if (busy) return; setBusy(mode);
    try {
      if (mode === 'print') await printCanvas(note, options);
      else {
        const isImage = format === 'png' || format === 'jpeg';
        if (isImage) { onCaptureModeChange?.(true); await new Promise(resolve => setTimeout(resolve, 80)); }
        const uri = await exportCanvas(note, options, captureTarget);
        if (mode === 'save') {
          await saveCanvasFile(uri, format, note.title);
          Alert.alert('Export saved', `The ${format.toUpperCase()} file was saved to the folder you selected.`);
        } else await shareCanvasFile(uri, format);
      }
    } catch (error) { Alert.alert(mode === 'print' ? 'Unable to print' : mode === 'save' ? 'Unable to save export' : 'Unable to share', error instanceof Error ? error.message : 'Please try again.'); }
    finally { onCaptureModeChange?.(false); setBusy(null); }
  };
  const segmented = <T extends string>(values: readonly T[], value: T, setValue: (next: T) => void) => <View style={[styles.segment, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>{values.map(item => <TouchableOpacity key={item} style={[styles.segmentItem, value === item && { backgroundColor: theme.accent.soft }]} onPress={() => setValue(item)}><Text style={{ color: value === item ? theme.accent.base : theme.content.secondary, fontSize: 12, fontFamily: fontFamily.extrabold }}>{item}</Text></TouchableOpacity>)}</View>;
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={[styles.safe, { backgroundColor: theme.background.base }]}><View style={styles.header}><View><Text style={[styles.title, { color: theme.content.primary }]}>Export canvas</Text><Text style={[styles.subtitle, { color: theme.content.secondary }]}>Create a shareable copy. Your board stays editable.</Text></View><TouchableOpacity style={styles.close} onPress={onClose}><Ionicons name="close" size={24} color={theme.content.primary} /></TouchableOpacity></View><ScrollView contentContainerStyle={styles.content}>
    <Text style={[styles.label, { color: theme.content.muted }]}>FORMAT</Text><View style={styles.formatGrid}>{FORMATS.map(item => <TouchableOpacity key={item.value} style={[styles.format, { borderColor: format === item.value ? theme.accent.base : theme.glass.border, backgroundColor: format === item.value ? theme.accent.soft : theme.glass.secondary }]} onPress={() => setFormat(item.value)}><Ionicons name={item.icon} size={22} color={format === item.value ? theme.accent.base : theme.content.primary} /><Text style={{ color: theme.content.primary, fontSize: 12, fontFamily: fontFamily.extrabold }}>{item.label}</Text></TouchableOpacity>)}</View>
    {(format === 'png' || format === 'jpeg') ? <><Text style={[styles.label, { color: theme.content.muted }]}>QUALITY</Text>{segmented(['standard', 'high', 'ultra'] as const, quality, setQuality)}</> : null}
    {format === 'pdf' ? <><Text style={[styles.label, { color: theme.content.muted }]}>PAPER</Text>{segmented(['A4', 'Letter', 'Legal'] as const, paperSize, setPaperSize)}<Text style={[styles.label, { color: theme.content.muted }]}>ORIENTATION</Text>{segmented(['portrait', 'landscape'] as const, orientation, setOrientation)}</> : null}
    {(format === 'pdf' || format === 'png' || format === 'jpeg') ? <View style={[styles.optionGroup, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>{[[includeBackground, setIncludeBackground, 'Include background'], [includeGrid, setIncludeGrid, 'Include grid'], [includeTitle, setIncludeTitle, 'Include title'], [includeDate, setIncludeDate, 'Include date']].map(([value, setter, label]) => <View key={label as string} style={styles.option}><Text style={{ color: theme.content.primary, fontSize: 14 }}>{label as string}</Text><Switch value={value as boolean} onValueChange={setter as (value: boolean) => void} trackColor={{ true: theme.accent.soft }} thumbColor={value ? theme.accent.base : theme.content.muted} /></View>)}</View> : null}
  </ScrollView><View style={[styles.footer, { borderTopColor: theme.divider }]}>{format === 'pdf' ? <TouchableOpacity disabled={Boolean(busy)} style={[styles.compact, { borderColor: theme.glass.border }]} onPress={() => void run('print')}><Ionicons name="print-outline" size={20} color={theme.content.primary} /></TouchableOpacity> : null}<TouchableOpacity disabled={Boolean(busy)} style={[styles.secondary, { borderColor: theme.glass.border }]} onPress={() => void run('share')}>{busy === 'share' ? <ActivityIndicator color={theme.content.primary} /> : <Ionicons name="share-outline" size={19} color={theme.content.primary} />}<Text style={{ color: theme.content.primary, fontFamily: fontFamily.extrabold }}>Share</Text></TouchableOpacity><TouchableOpacity disabled={Boolean(busy)} style={[styles.primary, { backgroundColor: theme.accent.base }]} onPress={() => void run('save')}>{busy === 'save' ? <ActivityIndicator color="#FFF" /> : <Ionicons name="download-outline" size={20} color="#FFF" />}<Text style={styles.primaryText}>{busy === 'save' ? 'Saving…' : `Save ${format.toUpperCase()}`}</Text></TouchableOpacity></View></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { minHeight: 76, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }, title: { fontSize: 24, fontFamily: fontFamily.black }, subtitle: { marginTop: 2, fontSize: 12 }, close: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, content: { paddingHorizontal: 20, paddingBottom: 30 }, label: { marginTop: 20, marginBottom: 8, fontSize: 10, fontFamily: fontFamily.black, letterSpacing: 1 }, formatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, format: { width: '31%', minHeight: 72, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 5 }, segment: { minHeight: 46, borderRadius: 16, borderWidth: 1, flexDirection: 'row', padding: 3 }, segmentItem: { flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, optionGroup: { marginTop: 20, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16 }, option: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, footer: { minHeight: 72, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 8 }, compact: { width: 48, minHeight: 52, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, secondary: { minHeight: 52, borderRadius: 26, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, primary: { flex: 1, minHeight: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, primaryText: { color: '#FFF', fontFamily: fontFamily.black } });
