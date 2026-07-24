import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppAlert as Alert } from '@/components/ui/AppDialog';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { OmniLoader } from '@/components/ui/OmniLoader';
import { useTheme } from '@/context/ThemeContext';
import {
  addCanvasComment,
  createCanvasInvite,
  createCanvasVersion,
  removeCanvasCollaborator,
  resolveCanvasComment,
  restoreCanvasVersion,
  subscribeCanvasCollaborationDetails,
  transferCanvasOwnership,
  updateCanvasCollaboratorRole,
  type CanvasPresence,
} from '@/services/CanvasCollaborationService';
import type {
  CanvasCollaborationActivity,
  CanvasCollaborationComment,
  CanvasCollaborationMember,
  CanvasCollaborationRole,
  CanvasCollaborationVersion,
} from '@/types/note';
import { fontFamily } from '@/theme/typography';

type Tab = 'people' | 'comments' | 'history' | 'activity';
type InviteRole = Exclude<CanvasCollaborationRole, 'owner'>;

interface Props {
  boardId: string;
  currentUserId: string;
  ownerId: string;
  members: CanvasCollaborationMember[];
  online: CanvasPresence[];
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onLeaveOrStop: () => void;
}

const activityLabel: Record<CanvasCollaborationActivity['type'], string> = {
  'board-created': 'started collaboration',
  'member-joined': 'joined the board',
  'member-removed': 'removed a collaborator',
  'member-left': 'left the board',
  'role-changed': 'changed a collaborator role',
  'ownership-transferred': 'transferred ownership',
  'invite-created': 'created an invite',
  'version-created': 'created a restore point',
  'version-restored': 'restored a board version',
  'comment-added': 'added a comment',
  'comment-resolved': 'updated a comment',
  'sharing-stopped': 'stopped sharing',
};

const formatTime = (value: number) => new Date(value).toLocaleString([], {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function CanvasCollaborationPanel({
  boardId,
  currentUserId,
  ownerId,
  members,
  online,
  disabled,
  onBusyChange,
  onLeaveOrStop,
}: Props) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>('people');
  const [inviteRole, setInviteRole] = useState<InviteRole>('editor');
  const [comments, setComments] = useState<CanvasCollaborationComment[]>([]);
  const [versions, setVersions] = useState<CanvasCollaborationVersion[]>([]);
  const [activity, setActivity] = useState<CanvasCollaborationActivity[]>([]);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [replyTo, setReplyTo] = useState<CanvasCollaborationComment | null>(null);
  const [busy, setBusy] = useState(false);
  const currentMember = members.find(member => member.uid === currentUserId);
  const isOwner = ownerId === currentUserId;
  const canEdit = currentMember?.role === 'owner' || currentMember?.role === 'editor' || isOwner;
  const canComment = currentMember?.role !== 'viewer';

  const run = async (action: () => Promise<void>, errorTitle: string) => {
    if (busy || disabled) return;
    setBusy(true);
    onBusyChange(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(errorTitle, error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };

  useEffect(() => subscribeCanvasCollaborationDetails(boardId, value => {
    setDetailsError(null);
    setComments(value.comments);
    setVersions(value.versions);
    setActivity(value.activity);
  }, setDetailsError), [boardId]);

  const mentionIds = useMemo(() => {
    const tokens = [...commentBody.matchAll(/@([\p{L}\p{N}_.-]+)/gu)]
      .map(match => match[1].toLowerCase());
    return members
      .filter(member => tokens.some(token => member.name.toLowerCase().replace(/\s+/g, '') === token))
      .map(member => member.uid);
  }, [commentBody, members]);

  const shareInvite = () => run(async () => {
    const code = await createCanvasInvite(boardId, inviteRole);
    await Share.share({ message: code });
  }, 'Could not share invite');

  const memberActions = (member: CanvasCollaborationMember) => {
    if (!isOwner || member.uid === currentUserId) return;
    Alert.alert(member.name, 'Choose their access or transfer ownership.', [
      ...(['editor', 'commenter', 'viewer'] as const).map(role => ({
        text: role === member.role ? `${role} (current)` : role,
        onPress: () => void run(
          () => updateCanvasCollaboratorRole(boardId, member.uid, role),
          'Could not change role',
        ),
      })),
      {
        text: 'Transfer ownership',
        onPress: () => Alert.alert(
          `Make ${member.name} the owner?`,
          'You will become an editor. Only the new owner can manage access or stop sharing.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Transfer',
              onPress: () => void run(
                () => transferCanvasOwnership(boardId, member.uid),
                'Could not transfer ownership',
              ),
            },
          ],
        ),
      },
      {
        text: 'Remove member',
        style: 'destructive',
        onPress: () => Alert.alert(`Remove ${member.name}?`, 'They will immediately lose access.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => void run(
              () => removeCanvasCollaborator(boardId, member.uid),
              'Could not remove collaborator',
            ),
          },
        ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitComment = () => run(async () => {
    await addCanvasComment(boardId, commentBody, {
      ...(replyTo ? { parentId: replyTo.id } : {}),
      mentions: mentionIds,
    });
    setCommentBody('');
    setReplyTo(null);
  }, 'Could not add comment');

  return (
    <>
      <View style={[styles.tabs, { backgroundColor: theme.glass.secondary }]}>
        {(['people', 'comments', 'history', 'activity'] as const).map(value => (
          <TouchableOpacity
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            style={[styles.tab, tab === value && { backgroundColor: theme.accent.soft }]}
            onPress={() => setTab(value)}
          >
            <Text style={[styles.tabText, { color: tab === value ? theme.accent.base : theme.content.secondary }]}>
              {value === 'comments' && comments.length ? `Comments ${comments.length}` : value[0].toUpperCase() + value.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled">
        {detailsError && tab !== 'people' ? (
          <View style={[styles.inlineError, { backgroundColor: theme.accent.warmSoft }]}>
            <Text style={[styles.inlineErrorText, { color: theme.content.secondary }]}>
              Collaboration details are unavailable. Close this panel and try again.
            </Text>
          </View>
        ) : null}
        {tab === 'people' ? (
          <>
            {members.map(member => {
              const isOnline = online.some(item => item.uid === member.uid);
              return (
                <TouchableOpacity
                  key={member.uid}
                  disabled={!isOwner || member.uid === currentUserId}
                  accessibilityLabel={`${member.name}, ${member.role}`}
                  style={[styles.row, { borderBottomColor: theme.divider }]}
                  onPress={() => memberActions(member)}
                >
                  <View style={[styles.avatar, { backgroundColor: isOnline ? theme.accent.soft : theme.glass.secondary }]}>
                    <Text style={[styles.avatarText, { color: isOnline ? theme.accent.base : theme.content.secondary }]}>
                      {member.name.trim().charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.content.primary }]}>
                      {member.name}{member.uid === currentUserId ? ' (you)' : ''}
                    </Text>
                    <Text style={[styles.rowMeta, { color: theme.content.secondary }]}>
                      {member.role} · {isOnline ? 'online' : 'offline'}
                    </Text>
                  </View>
                  {isOwner && member.uid !== currentUserId ? <Ionicons name="chevron-forward" size={18} color={theme.content.muted} /> : null}
                </TouchableOpacity>
              );
            })}
            {isOwner ? (
              <>
                <Text style={[styles.label, { color: theme.content.secondary }]}>New invite access</Text>
                <View style={[styles.rolePicker, { backgroundColor: theme.glass.secondary }]}>
                  {(['editor', 'commenter', 'viewer'] as const).map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleOption, inviteRole === role && { backgroundColor: theme.accent.soft }]}
                      onPress={() => setInviteRole(role)}
                    >
                      <Text style={[styles.roleText, { color: inviteRole === role ? theme.accent.base : theme.content.secondary }]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  disabled={busy || disabled}
                  style={[styles.primary, { backgroundColor: theme.accent.base, opacity: busy || disabled ? 0.55 : 1 }]}
                  onPress={() => void shareInvite()}
                >
                  {busy ? <OmniLoader size="small" /> : <Ionicons name="share-outline" size={19} color={theme.iconTile.foreground} />}
                  <Text style={[styles.primaryText, { color: theme.iconTile.foreground }]}>Share code only</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity style={styles.danger} disabled={busy || disabled} onPress={onLeaveOrStop}>
              <Text style={[styles.dangerText, { color: theme.semantic.danger }]}>
                {isOwner ? 'Stop sharing this canvas' : 'Leave shared canvas'}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        {tab === 'comments' ? (
          <>
            {comments.map(comment => (
              <View key={comment.id} style={[styles.comment, comment.parentId && styles.reply, { borderBottomColor: theme.divider }]}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.rowTitle, { color: theme.content.primary }]}>{comment.authorName}</Text>
                  <Text style={[styles.rowMeta, { color: theme.content.muted }]}>{formatTime(comment.createdAt)}</Text>
                </View>
                <Text style={[styles.commentBody, Boolean(comment.resolvedAt) && styles.resolved, { color: theme.content.secondary }]}>{comment.body}</Text>
                <View style={styles.commentActions}>
                  {canComment ? <TouchableOpacity onPress={() => setReplyTo(comment)}><Text style={[styles.textAction, { color: theme.accent.base }]}>Reply</Text></TouchableOpacity> : null}
                  {(comment.authorId === currentUserId || canEdit) ? (
                    <TouchableOpacity onPress={() => void run(
                      () => resolveCanvasComment(boardId, comment.id, !comment.resolvedAt),
                      'Could not update comment',
                    )}>
                      <Text style={[styles.textAction, { color: theme.accent.base }]}>{comment.resolvedAt ? 'Reopen' : 'Resolve'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
            {comments.length === 0 ? <Text style={[styles.empty, { color: theme.content.secondary }]}>No comments yet.</Text> : null}
            {canComment ? (
              <View style={styles.composer}>
                {replyTo ? (
                  <TouchableOpacity style={styles.replying} onPress={() => setReplyTo(null)}>
                    <Text style={[styles.rowMeta, { color: theme.content.secondary }]}>Replying to {replyTo.authorName}</Text>
                    <Ionicons name="close" size={18} color={theme.content.muted} />
                  </TouchableOpacity>
                ) : null}
                <TextInput
                  multiline
                  maxLength={2000}
                  value={commentBody}
                  onChangeText={setCommentBody}
                  placeholder="Comment or @mention a member"
                  placeholderTextColor={theme.content.muted}
                  style={[styles.input, { color: theme.content.primary, backgroundColor: theme.glass.secondary }]}
                />
                <TouchableOpacity
                  disabled={!commentBody.trim() || busy}
                  style={[styles.send, { backgroundColor: theme.accent.base, opacity: !commentBody.trim() || busy ? 0.5 : 1 }]}
                  onPress={() => void submitComment()}
                >
                  <Ionicons name="send" size={18} color={theme.iconTile.foreground} />
                </TouchableOpacity>
              </View>
            ) : <Text style={[styles.empty, { color: theme.content.secondary }]}>Viewers can read comments but cannot reply.</Text>}
          </>
        ) : null}

        {tab === 'history' ? (
          <>
            {canEdit ? (
              <TouchableOpacity
                disabled={busy}
                style={[styles.primary, { backgroundColor: theme.accent.base, opacity: busy ? 0.55 : 1 }]}
                onPress={() => void run(() => createCanvasVersion(boardId).then(() => undefined), 'Could not create restore point')}
              >
                <Ionicons name="bookmark-outline" size={19} color={theme.iconTile.foreground} />
                <Text style={[styles.primaryText, { color: theme.iconTile.foreground }]}>Create restore point</Text>
              </TouchableOpacity>
            ) : null}
            {versions.map(version => (
              <View key={version.id} style={[styles.row, { borderBottomColor: theme.divider }]}>
                <Ionicons name="time-outline" size={22} color={theme.accent.base} />
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: theme.content.primary }]}>{version.label}</Text>
                  <Text style={[styles.rowMeta, { color: theme.content.secondary }]}>
                    {version.createdByName} · {version.objectCount} objects · {formatTime(version.createdAt)}
                  </Text>
                </View>
                {canEdit ? (
                  <TouchableOpacity
                    style={styles.compactAction}
                    onPress={() => Alert.alert('Restore this version?', 'Current board content will be replaced. A new restore point is recommended first.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Restore',
                        onPress: () => void run(
                          () => restoreCanvasVersion(boardId, version.id),
                          'Could not restore version',
                        ),
                      },
                    ])}
                  >
                    <Text style={[styles.textAction, { color: theme.accent.base }]}>Restore</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {versions.length === 0 ? <Text style={[styles.empty, { color: theme.content.secondary }]}>No restore points yet.</Text> : null}
          </>
        ) : null}

        {tab === 'activity' ? (
          <>
            {activity.map(item => (
              <View key={item.id} style={[styles.activity, { borderBottomColor: theme.divider }]}>
                <View style={[styles.activityDot, { backgroundColor: theme.accent.base }]} />
                <View style={styles.rowCopy}>
                  <Text style={[styles.commentBody, { color: theme.content.primary }]}>
                    <Text style={styles.activityActor}>{item.actorName}</Text> {activityLabel[item.type]}
                    {item.targetName ? `: ${item.targetName}` : ''}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.content.muted }]}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
            ))}
            {activity.length === 0 ? <Text style={[styles.empty, { color: theme.content.secondary }]}>Activity will appear here.</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { height: 44, borderRadius: 15, padding: 3, marginTop: 8, flexDirection: 'row' },
  tab: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  tabText: { fontSize: 10, fontFamily: fontFamily.bold, textAlign: 'center' },
  content: { maxHeight: 500 },
  contentInner: { paddingBottom: 8 },
  row: { minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: fontFamily.extrabold },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: fontFamily.extrabold },
  rowMeta: { marginTop: 2, fontSize: 11, lineHeight: 15, fontFamily: fontFamily.medium },
  label: { marginTop: 13, marginBottom: 6, fontSize: 11, fontFamily: fontFamily.bold },
  rolePicker: { height: 42, borderRadius: 14, padding: 3, flexDirection: 'row' },
  roleOption: { flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  roleText: { fontSize: 11, fontFamily: fontFamily.bold, textTransform: 'capitalize' },
  primary: { minHeight: 46, borderRadius: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 13, fontFamily: fontFamily.extrabold },
  danger: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  dangerText: { fontSize: 12, fontFamily: fontFamily.bold },
  comment: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  reply: { marginLeft: 18 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  commentBody: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium },
  resolved: { textDecorationLine: 'line-through', opacity: 0.6 },
  commentActions: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 18 },
  textAction: { fontSize: 11, fontFamily: fontFamily.extrabold },
  empty: { paddingVertical: 26, textAlign: 'center', fontSize: 12, fontFamily: fontFamily.medium },
  composer: { paddingTop: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  replying: { position: 'absolute', left: 0, right: 0, top: -24, flexDirection: 'row', justifyContent: 'space-between' },
  input: { flex: 1, minHeight: 46, maxHeight: 100, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: fontFamily.medium },
  send: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  compactAction: { minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  activity: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityActor: { fontFamily: fontFamily.extrabold },
  inlineError: { minHeight: 44, borderRadius: 14, marginTop: 8, paddingHorizontal: 12, justifyContent: 'center' },
  inlineErrorText: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily.medium },
});
