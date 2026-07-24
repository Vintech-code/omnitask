import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageResizeMode,
  type StyleProp,
  type ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { OmniLoader } from '@/components/ui/OmniLoader';
import { AppText as Text } from '@/components/ui/AppText';
import { useAttachments } from '@/context/AttachmentContext';
import { useTheme } from '@/context/ThemeContext';

export function AttachmentImage({
  attachmentId,
  fallbackUri,
  remoteUri,
  style,
  resizeMode = 'cover',
  showStatus = false,
}: {
  attachmentId?: string;
  fallbackUri?: string;
  remoteUri?: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  showStatus?: boolean;
}) {
  const { theme } = useTheme();
  const { find, retry, cancel, uriFor } = useAttachments();
  const attachment = find(attachmentId);
  const preferred = uriFor(attachmentId) ?? fallbackUri ?? remoteUri;
  const [sourceUri, setSourceUri] = useState(preferred);

  React.useEffect(() => setSourceUri(preferred), [preferred]);

  if (!sourceUri) {
    return <View style={[style, styles.missing, { backgroundColor: theme.glass.secondary }]}><Ionicons name="image-outline" size={24} color={theme.content.muted} /></View>;
  }

  return (
    <View style={style}>
      <Image
        accessible
        accessibilityLabel="Attachment image"
        source={{ uri: sourceUri }}
        resizeMode={resizeMode}
        style={StyleSheet.absoluteFill}
        onError={() => {
          const remote = attachment?.remoteUrl ?? remoteUri;
          if (remote && remote !== sourceUri) setSourceUri(remote);
        }}
      />
      {showStatus && attachment && attachment.uploadState !== 'uploaded' ? (
        <View style={[styles.status, { backgroundColor: theme.dark ? 'rgba(16,26,27,0.82)' : 'rgba(255,255,255,0.88)' }]}>
          {attachment.uploadState === 'uploading' || attachment.uploadState === 'pending'
            ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel attachment upload" onPress={() => void cancel(attachment.id)} style={styles.retry}><OmniLoader size="small" accessibilityLabel="Uploading attachment" /><Text style={[styles.statusText, { color: theme.content.secondary }]}>Cancel</Text></TouchableOpacity>
            : <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry attachment upload" onPress={() => void retry(attachment.id)} style={styles.retry}><Ionicons name="refresh" size={15} color={theme.semantic.danger} /><Text style={[styles.statusText, { color: theme.semantic.danger }]}>Retry</Text></TouchableOpacity>}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { alignItems: 'center', justifyContent: 'center' },
  status: { position: 'absolute', left: 6, right: 6, bottom: 6, minHeight: 30, borderRadius: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  retry: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statusText: { fontSize: 10 },
});
