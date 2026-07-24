import React, { memo, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AttachmentImage } from '@/components/attachments';
import { AppText as Text } from '@/components/ui/AppText';
import { fontFamily } from '@/theme/typography';
import { OMNITASK_PALETTE } from '@/theme/colors';
import type { CanvasObject, CanvasPoint } from '@/types/note';
import type { CanvasReferenceItem } from '@/utils/canvasReferences';

export interface CanvasReferenceAppearance {
  surface: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  accentSoft: string;
  danger: string;
}

interface CanvasObjectViewProps {
  object: CanvasObject;
  selected: boolean;
  pan: CanvasPoint;
  zoom: number;
  enabled: boolean;
  cleanExport: boolean;
  referenceItem: CanvasReferenceItem | null;
  referenceAppearance: CanvasReferenceAppearance;
  onToggleReference: () => void;
  onSelect: () => void;
  onMove: (delta: CanvasPoint) => void;
  onMoveEnd: () => void;
}

export const CanvasObjectView = memo(function CanvasObjectView({
  object,
  selected,
  enabled,
  cleanExport,
  pan,
  zoom,
  referenceItem,
  referenceAppearance,
  onToggleReference,
  onSelect,
  onMove,
  onMoveEnd,
}: CanvasObjectViewProps) {
  const live = useRef({ enabled, zoom, onSelect, onMove, onMoveEnd });
  live.current = { enabled, zoom, onSelect, onMove, onMoveEnd };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => live.current.enabled,
    onMoveShouldSetPanResponder: () => live.current.enabled,
    onPanResponderGrant: () => live.current.onSelect(),
    onPanResponderMove: (_, gesture) =>
      live.current.onMove({ x: gesture.dx / live.current.zoom, y: gesture.dy / live.current.zoom }),
    onPanResponderRelease: () => live.current.onMoveEnd(),
    onPanResponderTerminate: () => live.current.onMoveEnd(),
    onPanResponderTerminationRequest: () => false,
  }), []);

  if (object.type === 'drawing' || object.type === 'connector') return null;

  const frame = {
    position: 'absolute' as const,
    left: pan.x + object.position.x * zoom,
    top: pan.y + object.position.y * zoom - ((object.type === 'line' || object.type === 'arrow') ? 17 : 0),
    width: object.size.width * zoom,
    height: (object.type === 'line' || object.type === 'arrow') ? 44 : Math.max(32, object.size.height * zoom),
    zIndex: object.layer,
    transform: [{ rotate: `${object.rotation}deg` }],
  };
  const border = selected && !cleanExport
    ? { borderColor: OMNITASK_PALETTE.actionBlue, borderWidth: 2 }
    : undefined;
  const commonText = {
    color: object.style.color,
    fontSize: (object.style.fontSize ?? 18) * zoom,
    fontFamily: object.style.bold ? fontFamily.extrabold : fontFamily.medium,
    fontStyle: object.style.italic ? 'italic' as const : 'normal' as const,
    textDecorationLine: object.style.underline ? 'underline' as const : 'none' as const,
  };

  return (
    <View accessibilityLabel={`${object.type} canvas object`} {...responder.panHandlers} style={[frame, styles.objectFrame, border]}>
      {object.type === 'image' && (object.attachmentId || object.imageUri || object.attachmentRemoteUrl) ? <AttachmentImage attachmentId={object.attachmentId} fallbackUri={object.imageUri} remoteUri={object.attachmentRemoteUrl} style={styles.fill} resizeMode="contain" showStatus /> : null}
      {object.type === 'text' ? <Text style={commonText}>{object.content}</Text> : null}
      {object.type === 'sticky' ? <View style={[styles.fill, styles.sticky, { backgroundColor: cleanExport ? 'transparent' : object.style.backgroundColor }]}><Text style={commonText}>{object.content}</Text></View> : null}
      {object.type === 'rectangle' ? <View style={[styles.fill, styles.shape, { borderColor: object.style.color, backgroundColor: cleanExport ? 'transparent' : object.style.backgroundColor }]} /> : null}
      {object.type === 'circle' ? <View style={[styles.fill, styles.shape, { borderRadius: 999, borderColor: object.style.color, backgroundColor: cleanExport ? 'transparent' : object.style.backgroundColor }]} /> : null}
      {(object.type === 'line' || object.type === 'arrow') ? <View style={[styles.horizontalLine, { backgroundColor: object.style.color, height: Math.max(2, (object.style.strokeWidth ?? 3) * zoom) }]}>{object.type === 'arrow' ? <View style={[styles.arrowHead, { borderLeftColor: object.style.color }]} /> : null}</View> : null}
      {object.type === 'reference' ? <View style={[styles.fill, styles.referenceCard, { backgroundColor: referenceAppearance.surface, borderColor: referenceAppearance.border }]}>
        <View style={styles.referenceHeading}>
          <View style={[styles.referenceIcon, { backgroundColor: referenceAppearance.accentSoft }]}><MaterialCommunityIcons name={object.reference?.kind === 'task' ? 'checkbox-marked-outline' : object.reference?.kind === 'event' ? 'calendar-outline' : 'note-text-outline'} size={17 * zoom} color={referenceItem ? referenceAppearance.accent : referenceAppearance.danger} /></View>
          <Text style={[styles.referenceKind, { color: referenceItem ? referenceAppearance.accent : referenceAppearance.danger, fontSize: 10 * zoom }]}>{referenceItem ? referenceItem.kind : 'Missing item'}</Text>
          {referenceItem?.kind === 'task' ? <TouchableOpacity accessibilityLabel={referenceItem.completed ? 'Mark task incomplete' : 'Mark task complete'} style={styles.referenceToggle} onPress={onToggleReference}><MaterialCommunityIcons name={referenceItem.completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={23 * zoom} color={referenceItem.completed ? referenceAppearance.accent : referenceAppearance.secondary} /></TouchableOpacity> : null}
        </View>
        <Text numberOfLines={2} style={[styles.referenceTitle, { color: referenceAppearance.primary, fontSize: 16 * zoom, textDecorationLine: referenceItem?.completed ? 'line-through' : 'none' }]}>{referenceItem?.title ?? object.content ?? 'Linked item was deleted'}</Text>
        <Text numberOfLines={2} style={[styles.referenceSubtitle, { color: referenceAppearance.secondary, fontSize: 11 * zoom }]}>{referenceItem?.subtitle ?? 'Remove this card or link the item again.'}</Text>
      </View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  objectFrame: { padding: 2, borderRadius: 8 },
  fill: { width: '100%', height: '100%' },
  sticky: { borderRadius: 12, padding: 12 },
  shape: { borderWidth: 3 },
  horizontalLine: { width: '100%', position: 'absolute', top: 21, borderRadius: 99 },
  arrowHead: { position: 'absolute', right: -1, top: -7, width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderLeftWidth: 14, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  referenceCard: { borderWidth: 1, borderRadius: 16, padding: 12, overflow: 'hidden' },
  referenceHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  referenceIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  referenceKind: { flex: 1, textTransform: 'uppercase', fontFamily: fontFamily.extrabold, letterSpacing: 0.5 },
  referenceToggle: { minWidth: 44, minHeight: 44, margin: -10, alignItems: 'center', justifyContent: 'center' },
  referenceTitle: { fontFamily: fontFamily.extrabold, lineHeight: 20 },
  referenceSubtitle: { marginTop: 4, fontFamily: fontFamily.medium, lineHeight: 15 },
});
