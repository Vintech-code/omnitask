import { fontFamily } from '@/theme/typography';
import { OMNITASK_PALETTE } from '@/theme/colors';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppAlert as Alert } from '@/components/ui/AppDialog';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { OmniLoader } from '@/components/ui/OmniLoader';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '@/context/ThemeContext';
import { useTaskStore } from '@/context/TaskStore';
import { useAttachments } from '@/context/AttachmentContext';
import { useEvents } from '@/context/EventStore';
import { useAuth } from '@/context/AuthContext';
import { CANVAS_DOCUMENT_VERSION, type CanvasCollaborationMember, type CanvasObject, type CanvasObjectType, type CanvasPoint, type InfiniteCanvasNote } from '@/types/note';
import { buildCanvasReferenceItems, resolveCanvasReference, type CanvasReferenceItem } from '@/utils/canvasReferences';
import {
  alignCanvasSelection,
  canvasObjectsIntersectRect,
  distributeCanvasSelection,
  duplicateCanvasSelection,
  expandCanvasGroupSelection,
  getCanvasSelectionBounds,
  groupCanvasSelection,
  scaleCanvasSelection,
  snapCanvasSelection,
  startPinchSession,
  translateCanvasSelection,
  ungroupCanvasSelection,
  updatePinchSession,
  buildSmoothStrokePath,
  type CanvasAlignment,
  type CanvasBounds,
  type CanvasDistribution,
  type PinchSession,
  type CanvasSnapGuide,
} from '@/utils/canvasMath';
import { createCanvasConnector, getCanvasConnectorGeometry, hasCanvasConnector, removeDanglingCanvasConnectors } from '@/utils/canvasConnectors';
import { CanvasObjectView, type CanvasReferenceAppearance } from './CanvasObjectView';
import { useCanvasViewportObjects } from '@/hooks/useCanvasViewportObjects';
import { CanvasExportSheet } from './CanvasExportSheet';
import { saveCanvasThumbnail } from '@/services/CanvasDocumentService';
import { recognizeHandwriting } from '@/services/HandwritingRecognitionService';
import {
  createCanvasCollaboration,
  canEditCanvas,
  leaveCanvasCollaboration,
  mergeCanvasObjects,
  saveCollaborativeCanvas,
  setCanvasPresence,
  stopCanvasCollaboration,
  subscribeCanvasCollaboration,
  updateCanvasPresenceCursor,
  type CanvasPresence,
} from '@/services/CanvasCollaborationService';
import { CanvasCollaborationPanel } from './CanvasCollaborationPanel';

type Tool = 'hand' | 'select' | 'pen' | 'highlighter' | 'eraser';
type Props = { note: InfiniteCanvasNote; onSave: (note: InfiniteCanvasNote) => void; onClose: () => void };

const COLORS = ['#171717', OMNITASK_PALETTE.actionBlue, '#C94F4A', '#587B8D', '#4F8F63', '#6C5DA8'];
const id = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const distance = (a: CanvasPoint, b: CanvasPoint) => Math.hypot(a.x - b.x, a.y - b.y);

function newObject(type: CanvasObjectType, layer: number): CanvasObject {
  const base = {
    id: id(), type, position: { x: 420, y: 520 }, size: { width: 190, height: 110 },
    rotation: 0, style: { color: '#171717', strokeWidth: 3 }, layer,
  } as CanvasObject;
  if (type === 'text') return { ...base, content: 'New text', size: { width: 210, height: 80 }, style: { ...base.style, fontSize: 22 } };
  if (type === 'sticky') return { ...base, content: 'Add an idea', size: { width: 180, height: 180 }, style: { ...base.style, backgroundColor: '#FFE59A', fontSize: 18 } };
  if (type === 'circle') return { ...base, size: { width: 140, height: 140 }, style: { ...base.style, backgroundColor: '#D6F1FF66' } };
  if (type === 'rectangle') return { ...base, style: { ...base.style, backgroundColor: '#D6F1FF66' } };
  if (type === 'line' || type === 'arrow') return { ...base, size: { width: 210, height: 10 } };
  return base;
}

export function CanvasNoteEditor({ note, onSave, onClose }: Props) {
  const { theme } = useTheme();
  const { notes, tasks, setTaskStatus } = useTaskStore();
  const { importImage } = useAttachments();
  const { events } = useEvents();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(note.title);
  const [objects, setObjects] = useState(note.objects);
  const [pan, setPan] = useState(note.canvasPosition);
  const [zoom, setZoom] = useState(note.zoomLevel);
  const [grid, setGrid] = useState(note.gridEnabled);
  const [snapEnabled, setSnapEnabled] = useState(note.snapEnabled ?? true);
  const [tool, setTool] = useState<Tool>('hand');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState(COLORS[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectionRect, setSelectionRect] = useState<CanvasBounds | null>(null);
  const [snapGuides, setSnapGuides] = useState<CanvasSnapGuide[]>([]);
  const [inspector, setInspector] = useState(false);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceKind, setReferenceKind] = useState<'task' | 'event' | 'note'>('task');
  const [recognizingHandwriting, setRecognizingHandwriting] = useState(false);
  const [handwritingOpen, setHandwritingOpen] = useState(false);
  const [handwritingText, setHandwritingText] = useState('');
  const [handwritingCandidates, setHandwritingCandidates] = useState<string[]>([]);
  const [history, setHistory] = useState<CanvasObject[][]>([]);
  const [future, setFuture] = useState<CanvasObject[][]>([]);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [exportOpen, setExportOpen] = useState(false);
  const [cleanExport, setCleanExport] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [collaborationId, setCollaborationId] = useState(note.collaborationId ?? null);
  const [collaborationOwnerId, setCollaborationOwnerId] = useState(note.collaborationOwnerId ?? null);
  const [collaborationMembers, setCollaborationMembers] = useState<CanvasCollaborationMember[]>([]);
  const [onlineCollaborators, setOnlineCollaborators] = useState<CanvasPresence[]>([]);
  const [collaborationBusy, setCollaborationBusy] = useState(false);
  const canvasCaptureRef = useRef<View>(null);
  const saveInFlight = useRef(false);
  const saveAcknowledgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const lastCollaborativeObjects = useRef(note.objects);
  const saveStateRef = useRef(saveState);
  const canvasSize = useRef({ width: 360, height: 560 });
  const [viewportSize, setViewportSize] = useState({ width: 360, height: 560 });
  const objectsRef = useRef(objects);
  const selectedIdsRef = useRef(selectedIds);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  objectsRef.current = objects;
  selectedIdsRef.current = selectedIds;
  panRef.current = pan;
  zoomRef.current = zoom;
  saveStateRef.current = saveState;
  const gestureStart = useRef({ pan, zoom, distance: 0, midpoint: { x: 0, y: 0 } });
  const pinch = useRef<PinchSession>({ active: false, startDistance: 0, startZoom: zoom, anchor: { x: 0, y: 0 } });
  const drawingId = useRef<string | null>(null);
  const latestDrawingPoint = useRef<CanvasPoint | null>(null);
  const lastPresenceCursorAt = useRef(0);
  const collaborationEndingRef = useRef(false);
  const moveSnapshot = useRef<CanvasObject[] | null>(null);
  const moveSelectionIds = useRef<string[]>([]);
  const moveChanged = useRef(false);
  const lassoStart = useRef<CanvasPoint | null>(null);
  const lassoRect = useRef<CanvasBounds | null>(null);
  const hydrated = useRef(false);
  const referenceItems = useMemo(() => buildCanvasReferenceItems(tasks, notes, events), [events, notes, tasks]);
  const referencePickerItems = useMemo(() => referenceItems.filter(item => item.kind === referenceKind && !item.legacy), [referenceItems, referenceKind]);
  const referenceAppearance = useMemo<CanvasReferenceAppearance>(() => ({
    surface: theme.glass.solid,
    border: theme.glass.border,
    primary: theme.content.primary,
    secondary: theme.content.secondary,
    accent: theme.accent.base,
    accentSoft: theme.accent.soft,
    danger: theme.semantic.danger,
  }), [theme]);
  const displayObjects = useCanvasViewportObjects(objects, viewportSize, pan, zoom, selectedIds);
  const currentCollaborationMember = collaborationMembers.find(member => member.uid === user?.id);
  const collaborationEditable = !collaborationId
    || collaborationOwnerId === user?.id
    || Boolean(currentCollaborationMember && canEditCanvas(currentCollaborationMember.role));

  const boardPoint = (x: number, y: number): CanvasPoint => ({ x: (x - panRef.current.x) / zoomRef.current, y: (y - panRef.current.y) / zoomRef.current });
  const acknowledgeSaved = () => {
    if (saveAcknowledgeTimer.current) clearTimeout(saveAcknowledgeTimer.current);
    saveAcknowledgeTimer.current = setTimeout(() => {
      if (mountedRef.current) setSaveState('saved');
      saveAcknowledgeTimer.current = null;
    }, 320);
  };
  const replace = (next: CanvasObject[], withHistory = true) => {
    if (withHistory) setHistory(items => [...items.slice(-39), objects]);
    setFuture([]);
    setObjects(next);
  };

  const currentDocument = (): InfiniteCanvasNote => ({ ...note, documentVersion: CANVAS_DOCUMENT_VERSION, title: title.trim() || 'Untitled board', objects, canvasPosition: pan, zoomLevel: zoom, gridEnabled: grid, snapEnabled, canvasTheme: theme.dark ? 'dark' : 'light', background: theme.dark ? '#151614' : '#F8F8F5', ...(collaborationId ? { collaborationId, collaborationOwnerId: collaborationOwnerId ?? undefined } : {}), updatedAt: Date.now() });
  const saveNow = () => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaveState('saving');
    const document = currentDocument();

    // Editable document persistence is the critical path and must never wait for
    // native view capture. Some Android devices can delay captureRef indefinitely.
    onSave(document);
    if (collaborationId && collaborationEditable) {
      void saveCollaborativeCanvas(collaborationId, document, lastCollaborativeObjects.current).then(() => {
        lastCollaborativeObjects.current = document.objects;
        saveInFlight.current = false;
        acknowledgeSaved();
      }).catch(error => {
        if (!mountedRef.current) return;
        saveInFlight.current = false;
        setSaveState('unsaved');
        Alert.alert('Shared canvas not synced', error instanceof Error ? error.message : 'Your local copy is safe. Try saving again.');
      });
    } else {
      saveInFlight.current = false;
      // Keep the acknowledgement visible long enough to be perceived; React would
      // otherwise batch "saving" and "saved" into one frame.
      acknowledgeSaved();
    }

    // Thumbnail generation is deliberately best-effort and runs after the board
    // is already safely stored. A capture failure cannot block or undo Save.
    if (canvasCaptureRef.current) {
      void saveCanvasThumbnail(note.id, canvasCaptureRef).then(thumbnailUri => {
        if (thumbnailUri) onSave({ ...document, thumbnailUri, updatedAt: document.updatedAt });
      });
    }
  };

  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    setSaveState('unsaved');
    const timeout = setTimeout(saveNow, 3000);
    return () => clearTimeout(timeout);
  }, [grid, objects, pan, snapEnabled, title, zoom]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveAcknowledgeTimer.current) clearTimeout(saveAcknowledgeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!collaborationEditable) {
      setTool('hand');
      setSelectedIds([]);
      setInspector(false);
      setArrangeOpen(false);
    }
  }, [collaborationEditable]);

  useEffect(() => {
    if (!collaborationId || !user) return;
    let removePresence: (() => Promise<void>) | null = null;
    void setCanvasPresence(collaborationId, user.name).then(remove => { removePresence = remove; }).catch(() => undefined);
    const unsubscribe = subscribeCanvasCollaboration(collaborationId, snapshot => {
      setCollaborationMembers(snapshot.members);
      setOnlineCollaborators(snapshot.online);
      const remote = snapshot.note;
      setCollaborationOwnerId(remote.collaborationOwnerId ?? null);
      const isOwnEcho = snapshot.lastEditorId === user.id;
      if (!isOwnEcho) {
        const hasLocalChanges = saveStateRef.current === 'unsaved' || saveStateRef.current === 'saving';
        const mergedObjects = hasLocalChanges
          ? mergeCanvasObjects(lastCollaborativeObjects.current, objectsRef.current, remote.objects)
          : remote.objects;
        lastCollaborativeObjects.current = remote.objects;
        setObjects(mergedObjects);
        if (!hasLocalChanges) {
          setTitle(remote.title);
          setPan(remote.canvasPosition);
          setZoom(remote.zoomLevel);
          setGrid(remote.gridEnabled);
          setSnapEnabled(remote.snapEnabled ?? true);
          setSaveState('saved');
          onSave({ ...remote, id: note.id, collaborationId, collaborationOwnerId: remote.collaborationOwnerId });
        }
      } else {
        lastCollaborativeObjects.current = remote.objects;
      }
    }, message => {
      if (!collaborationEndingRef.current) {
        Alert.alert('Collaboration connection', message);
      }
    });
    return () => {
      unsubscribe();
      if (removePresence) void removePresence();
    };
  }, [collaborationId, user?.id]);

  const startCollaboration = async () => {
    if (collaborationBusy || !user) return;
    setCollaborationBusy(true);
    collaborationEndingRef.current = false;
    try {
      const document = currentDocument();
      const result = await createCanvasCollaboration(document);
      setCollaborationId(result.boardId);
      setCollaborationOwnerId(user.id);
      lastCollaborativeObjects.current = document.objects;
      onSave({ ...document, collaborationId: result.boardId, collaborationOwnerId: user.id });
      Alert.alert('Collaboration is live', 'Your board is private to you and invited collaborators. Invite codes work for 3 days; joined collaborators keep access until they leave, are removed, or you stop sharing.');
    } catch (error) {
      Alert.alert('Could not start collaboration', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setCollaborationBusy(false);
    }
  };

  const detachCollaboration = (document: InfiniteCanvasNote) => {
    const { collaborationId: _collaborationId, collaborationOwnerId: _ownerId, ...local } = document;
    setCollaborationId(null);
    setCollaborationOwnerId(null);
    setCollaborationMembers([]);
    setOnlineCollaborators([]);
    onSave(local);
  };

  const leaveOrStopCollaboration = () => {
    if (!collaborationId || !user || collaborationBusy) return;
    const owner = collaborationOwnerId === user.id;
    Alert.alert(owner ? 'Stop collaboration?' : 'Leave shared canvas?', owner ? 'Collaborators will lose access. Your local board will remain editable.' : 'Your local copy will remain, but it will stop receiving live updates.', [
      { text: 'Cancel', style: 'cancel' },
      { text: owner ? 'Stop sharing' : 'Leave', style: 'destructive', onPress: async () => {
        const localDocument = currentDocument();
        collaborationEndingRef.current = true;
        setCollaborationBusy(true);
        setCollaborationOpen(false);
        try {
          if (owner) await stopCanvasCollaboration(collaborationId); else await leaveCanvasCollaboration(collaborationId);
          detachCollaboration(localDocument);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Try again.';
          const remoteAccessAlreadyGone = /do not have access|no longer available/i.test(message);
          if (remoteAccessAlreadyGone) {
            // Recover local boards left linked by an earlier partial stop. The
            // editable local copy is preserved while the dead remote link ends.
            detachCollaboration(localDocument);
            Alert.alert(
              owner ? 'Sharing stopped' : 'Shared canvas left',
              'The remote collaboration was already unavailable. Your local board remains editable.',
            );
          } else {
            collaborationEndingRef.current = false;
            setCollaborationOpen(true);
            Alert.alert(owner ? 'Could not stop sharing' : 'Could not leave canvas', message);
          }
        } finally {
          setCollaborationBusy(false);
        }
      } },
    ]);
  };

  const add = (type: CanvasObjectType) => {
    const template = newObject(type, Math.max(0, ...objects.map(item => item.layer)) + 1);
    const center = boardPoint(canvasSize.current.width / 2, canvasSize.current.height / 2);
    const object = { ...template, position: { x: center.x - template.size.width / 2, y: center.y - template.size.height / 2 } };
    replace([...objects, object]);
    setSelectedIds([object.id]);
    setMultiSelect(false);
    setTool('select');
    if (type === 'text' || type === 'sticky') setInspector(true);
  };

  const addReference = (item: CanvasReferenceItem) => {
    const center = boardPoint(canvasSize.current.width / 2, canvasSize.current.height / 2);
    const object: CanvasObject = {
      id: id(),
      type: 'reference',
      reference: { kind: item.kind, id: item.id, ...(item.parentId ? { parentId: item.parentId } : {}) },
      content: item.title,
      position: { x: center.x - 120, y: center.y - 62 },
      size: { width: 240, height: 124 },
      rotation: 0,
      style: { color: theme.content.primary },
      layer: Math.max(0, ...objects.map(value => value.layer)) + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    replace([...objects, object]);
    selectedIdsRef.current = [object.id];
    setSelectedIds([object.id]);
    setMultiSelect(false);
    setTool('select');
    setReferenceOpen(false);
  };

  const toggleReferenceTask = (item: CanvasReferenceItem | null) => {
    if (!item || item.kind !== 'task' || !item.taskId) return;
    void setTaskStatus(item.taskId, item.completed ? 'inbox' : 'completed');
  };

  const pickImage = async (camera = false) => {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', `Allow ${camera ? 'camera' : 'photo library'} access to attach an image.`); return; }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      const center = boardPoint(canvasSize.current.width / 2, canvasSize.current.height / 2);
      try {
        const attachment = await importImage({
          uri: asset.uri,
          purpose: 'canvas',
          parentId: note.id,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
        });
        const object = { ...newObject('image', Math.max(0, ...objects.map(item => item.layer)) + 1), attachmentId: attachment.id, imageUri: attachment.localUri, size: { width: 240, height: 180 }, position: { x: center.x - 120, y: center.y - 90 } };
        replace([...objects, object]); setSelectedIds([object.id]); setMultiSelect(false); setTool('select');
      } catch (error) {
        Alert.alert('Could not attach image', error instanceof Error ? error.message : 'Please try another image.');
      }
    }
  };

  const eraseAt = (point: CanvasPoint) => {
    const current = objectsRef.current;
    const next = current.filter(object => object.type !== 'drawing' || !object.points?.some(item => distance(item, point) < 24 / zoomRef.current));
    if (next.length !== current.length) {
      setHistory(items => [...items.slice(-39), current]);
      setFuture([]);
      setObjects(next);
    }
  };

  const beginPinch = (touches: ReadonlyArray<{ locationX: number; locationY: number }>) => {
    const session = startPinchSession(touches, zoomRef.current, panRef.current);
    if (!session) return false;
    pinch.current = session;
    return true;
  };

  const makeRect = (start: CanvasPoint, current: CanvasPoint): CanvasBounds => {
    const left = Math.min(start.x, current.x);
    const top = Math.min(start.y, current.y);
    const right = Math.max(start.x, current.x);
    const bottom = Math.max(start.y, current.y);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  };

  const commitLasso = (rect: CanvasBounds | null) => {
    if (!rect || (rect.width < 4 / zoomRef.current && rect.height < 4 / zoomRef.current)) {
      if (!multiSelect) setSelectedIds([]);
      return;
    }
    const hits = objectsRef.current
      .filter(object => !object.hidden && canvasObjectsIntersectRect(object, rect))
      .map(object => object.id);
    const next = expandCanvasGroupSelection(objectsRef.current, multiSelect ? [...selectedIdsRef.current, ...hits] : hits);
    selectedIdsRef.current = next;
    setSelectedIds(next);
  };

  const beginObjectMove = (object: CanvasObject) => {
    let next = selectedIdsRef.current;
    if (!next.includes(object.id)) {
      next = expandCanvasGroupSelection(objectsRef.current, multiSelect ? [...next, object.id] : [object.id]);
      selectedIdsRef.current = next;
      setSelectedIds(next);
    }
    moveSnapshot.current = objectsRef.current;
    moveSelectionIds.current = next;
    moveChanged.current = false;
  };

  const moveObjectSelection = (delta: CanvasPoint) => {
    if (!moveSnapshot.current) return;
    const snapped = snapEnabled
      ? snapCanvasSelection(moveSnapshot.current, moveSelectionIds.current, delta, { threshold: 8 / zoomRef.current, gridSize: 28, snapToGrid: grid })
      : { delta, guides: [] };
    moveChanged.current = Math.abs(snapped.delta.x) > 0.5 || Math.abs(snapped.delta.y) > 0.5;
    setSnapGuides(snapped.guides);
    setObjects(translateCanvasSelection(moveSnapshot.current, moveSelectionIds.current, snapped.delta));
  };

  const finishObjectMove = () => {
    if (moveSnapshot.current && moveChanged.current) {
      setHistory(items => [...items.slice(-39), moveSnapshot.current!]);
      setFuture([]);
    }
    moveSnapshot.current = null;
    moveSelectionIds.current = [];
    moveChanged.current = false;
    setSnapGuides([]);
  };

  const boardResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: event => tool === 'select' || tool === 'pen' || tool === 'highlighter' || tool === 'eraser' || event.nativeEvent.touches.length > 1,
    onStartShouldSetPanResponderCapture: event => event.nativeEvent.touches.length > 1,
    onMoveShouldSetPanResponder: () => tool === 'hand' || tool === 'select' || tool === 'pen' || tool === 'highlighter' || tool === 'eraser',
    onMoveShouldSetPanResponderCapture: event => event.nativeEvent.touches.length > 1,
    onPanResponderGrant: event => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        beginPinch(touches);
      } else if (tool === 'pen' || tool === 'highlighter') {
        const point = boardPoint(touches[0].locationX, touches[0].locationY);
        const current = objectsRef.current;
        const object: CanvasObject = { id: id(), type: 'drawing', position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, rotation: 0, points: [point], style: { color: tool === 'highlighter' ? '#FFD23F' : strokeColor, strokeWidth: tool === 'highlighter' ? Math.max(10, strokeWidth * 3) : strokeWidth, opacity: tool === 'highlighter' ? 0.45 : 1 }, layer: Math.max(0, ...current.map(item => item.layer)) + 1 };
        drawingId.current = object.id; setHistory(items => [...items.slice(-39), current]); setObjects([...current, object]); setFuture([]);
        latestDrawingPoint.current = point;
      } else if (tool === 'eraser') eraseAt(boardPoint(touches[0].locationX, touches[0].locationY));
      else if (tool === 'hand') gestureStart.current = { pan: panRef.current, zoom: zoomRef.current, distance: 0, midpoint: { x: 0, y: 0 } };
      else if (tool === 'select') {
        const start = boardPoint(touches[0].locationX, touches[0].locationY);
        lassoStart.current = start;
        lassoRect.current = makeRect(start, start);
        setSelectionRect(lassoRect.current);
      }
      setSnapGuides([]);
      if (tool !== 'select') setSelectedIds([]);
    },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      if (collaborationId && touches[0] && Date.now() - lastPresenceCursorAt.current >= 250) {
        lastPresenceCursorAt.current = Date.now();
        void updateCanvasPresenceCursor(
          collaborationId,
          boardPoint(touches[0].locationX, touches[0].locationY),
        ).catch(() => undefined);
      }
      if (touches.length >= 2) {
        if (!pinch.current.active && !beginPinch(touches)) return;
        const viewport = updatePinchSession(pinch.current, touches);
        if (!viewport) return;
        setZoom(viewport.zoom);
        setPan(viewport.pan);
      } else if ((tool === 'pen' || tool === 'highlighter') && drawingId.current) {
        const point = boardPoint(touches[0].locationX, touches[0].locationY);
        if (!latestDrawingPoint.current || distance(latestDrawingPoint.current, point) >= 2.5 / zoomRef.current) {
          latestDrawingPoint.current = point;
          setObjects(items => items.map(item => item.id === drawingId.current ? { ...item, points: [...(item.points ?? []), point] } : item));
        }
      } else if (tool === 'eraser') eraseAt(boardPoint(touches[0].locationX, touches[0].locationY));
      else if (tool === 'hand' && !pinch.current.active) setPan({ x: gestureStart.current.pan.x + gesture.dx, y: gestureStart.current.pan.y + gesture.dy });
      else if (tool === 'select' && !pinch.current.active && lassoStart.current) {
        const current = { x: lassoStart.current.x + gesture.dx / zoomRef.current, y: lassoStart.current.y + gesture.dy / zoomRef.current };
        lassoRect.current = makeRect(lassoStart.current, current);
        setSelectionRect(lassoRect.current);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (tool === 'hand' && !pinch.current.active) setPan({ x: gestureStart.current.pan.x + gesture.dx, y: gestureStart.current.pan.y + gesture.dy });
      if (tool === 'select' && !pinch.current.active) commitLasso(lassoRect.current);
      pinch.current.active = false;
      drawingId.current = null;
      latestDrawingPoint.current = null;
      lassoStart.current = null;
      lassoRect.current = null;
      setSelectionRect(null);
      setSnapGuides([]);
    },
    onPanResponderTerminate: () => {
      pinch.current.active = false;
      drawingId.current = null;
      latestDrawingPoint.current = null;
      lassoStart.current = null;
      lassoRect.current = null;
      setSelectionRect(null);
      setSnapGuides([]);
    },
    onPanResponderTerminationRequest: () => false,
  }), [collaborationId, multiSelect, snapEnabled, strokeColor, strokeWidth, tool]);

  const selectedObjects = objects.filter(item => selectedIds.includes(item.id));
  const selected = selectedObjects.length === 1 ? selectedObjects[0] : null;
  useEffect(() => {
    if (!inspector || !selected) return;
    setToolsOpen(false);
    const viewportHeight = canvasSize.current.height;
    const visibleBottom = viewportHeight * 0.48;
    const objectTop = panRef.current.y + selected.position.y * zoomRef.current;
    const objectBottom = objectTop + Math.max(32, selected.size.height * zoomRef.current);
    const desiredTop = Math.max(20, (visibleBottom - Math.min(objectBottom - objectTop, visibleBottom - 40)) / 2);
    if (objectBottom > visibleBottom - 12 || objectTop < 12) {
      setPan(current => ({ ...current, y: current.y + desiredTop - objectTop }));
    }
  }, [inspector, selected?.id]);
  const selectionBounds = getCanvasSelectionBounds(objects, selectedIds);
  const hasGroupedSelection = selectedObjects.some(item => Boolean(item.groupId));
  const connectableSelection = selectedObjects.length === 2 && selectedObjects.every(item => item.type !== 'connector');
  const selectionAlreadyConnected = connectableSelection && hasCanvasConnector(objects, selectedObjects[0].id, selectedObjects[1].id);
  const selectedDrawings = selectedObjects.filter(item => item.type === 'drawing' && item.points?.length);
  const updateSelected = (updates: Partial<CanvasObject>) => {
    if (!selected) return;
    replace(objects.map(item => item.id === selected.id ? { ...item, ...updates } : item));
  };
  const applySelectionChange = (next: CanvasObject[]) => {
    if (next === objects) return;
    replace(next);
  };
  const alignSelection = (alignment: CanvasAlignment) => applySelectionChange(alignCanvasSelection(objects, selectedIds, alignment));
  const distributeSelection = (direction: CanvasDistribution) => applySelectionChange(distributeCanvasSelection(objects, selectedIds, direction));
  const resizeSelection = (factor: number) => applySelectionChange(scaleCanvasSelection(objects, selectedIds, factor));
  const groupSelection = () => applySelectionChange(groupCanvasSelection(objects, selectedIds, `group_${id()}`));
  const ungroupSelection = () => applySelectionChange(ungroupCanvasSelection(objects, selectedIds));
  const connectSelection = () => {
    if (!connectableSelection || selectionAlreadyConnected) return;
    const connector = createCanvasConnector(id(), selectedObjects[0].id, selectedObjects[1].id, Math.max(0, ...objects.map(item => item.layer)) + 1, objects);
    if (connector) replace([...objects, connector]);
  };
  const recognizeSelectedHandwriting = async () => {
    if (!selectedDrawings.length || recognizingHandwriting) return;
    const bounds = getCanvasSelectionBounds(objects, selectedDrawings.map(item => item.id));
    if (!bounds) return;
    setRecognizingHandwriting(true);
    try {
      const result = await recognizeHandwriting(
        [...selectedDrawings].sort((left, right) => (left.createdAt ?? left.layer) - (right.createdAt ?? right.layer)).map(item => item.points ?? []),
        { width: bounds.width, height: bounds.height },
      );
      setHandwritingCandidates(result.candidates);
      setHandwritingText(result.candidates[0]);
      setHandwritingOpen(true);
    } catch (error) {
      Alert.alert('Handwriting recognition unavailable', error instanceof Error ? error.message : 'The handwriting could not be recognized.');
    } finally {
      setRecognizingHandwriting(false);
    }
  };
  const insertRecognizedText = (replaceInk: boolean) => {
    const content = handwritingText.trim();
    const drawingIds = selectedDrawings.map(item => item.id);
    const bounds = getCanvasSelectionBounds(objects, drawingIds);
    if (!content || !bounds) return;
    const textObject: CanvasObject = {
      id: id(), type: 'text', content,
      position: { x: bounds.left, y: bounds.top },
      size: { width: Math.max(200, Math.min(420, bounds.width)), height: Math.max(72, Math.min(220, bounds.height)) },
      rotation: 0, style: { color: theme.content.primary, fontSize: 22 },
      layer: Math.max(0, ...objects.map(item => item.layer)) + 1,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    const base = replaceInk ? objects.filter(item => !drawingIds.includes(item.id)) : objects;
    replace(removeDanglingCanvasConnectors([...base, textObject]));
    selectedIdsRef.current = [textObject.id];
    setSelectedIds([textObject.id]);
    setHandwritingOpen(false);
    setHandwritingCandidates([]);
    setHandwritingText('');
  };
  const duplicateSelection = () => {
    const result = duplicateCanvasSelection(objects, selectedIds, id, () => `group_${id()}`);
    if (!result.selectedIds.length) return;
    replace(result.objects);
    selectedIdsRef.current = result.selectedIds;
    setSelectedIds(result.selectedIds);
    setMultiSelect(result.selectedIds.length > 1);
  };
  const changeSelectionLayer = (direction: 1 | -1) => applySelectionChange(objects.map(item => selectedIds.includes(item.id) ? { ...item, layer: Math.max(0, item.layer + direction), updatedAt: Date.now() } : item));
  const removeSelected = () => {
    if (!selectedIds.length) return;
    replace(removeDanglingCanvasConnectors(objects.filter(item => !selectedIds.includes(item.id))));
    selectedIdsRef.current = [];
    setSelectedIds([]);
    setMultiSelect(false);
    setInspector(false);
    setArrangeOpen(false);
  };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture(items => [objects, ...items].slice(0, 40)); setObjects(previous); setHistory(items => items.slice(0, -1)); };
  const redo = () => { const next = future[0]; if (!next) return; setHistory(items => [...items, objects].slice(-40)); setObjects(next); setFuture(items => items.slice(1)); };
  useEffect(() => {
    const existing = new Set(objects.map(object => object.id));
    const next = selectedIdsRef.current.filter(selectedId => existing.has(selectedId));
    if (next.length !== selectedIdsRef.current.length) {
      selectedIdsRef.current = next;
      setSelectedIds(next);
    }
  }, [objects]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background.base }]} edges={['top', 'bottom']}>
      <View style={[styles.topBar, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}> 
        <TouchableOpacity style={styles.iconButton} onPress={() => { saveNow(); onClose(); }}><Ionicons name="chevron-back" size={24} color={theme.content.primary} /></TouchableOpacity>
        <View style={styles.titleColumn}><TextInput editable={collaborationEditable} value={title} onChangeText={setTitle} placeholder="Board title" placeholderTextColor={theme.content.muted} style={[styles.titleInput, { color: theme.content.primary }]} /><Text style={[styles.saveStatus, { color: saveState === 'unsaved' ? theme.semantic.warning : theme.content.muted }]}>{!collaborationEditable ? `${currentCollaborationMember?.role ?? 'viewer'} access` : saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Unsaved changes'}</Text></View>
        <TouchableOpacity accessibilityLabel="Undo canvas change" style={styles.iconButton} onPress={undo} disabled={!history.length || !collaborationEditable}><Ionicons name="arrow-undo" size={20} color={history.length && collaborationEditable ? theme.content.primary : theme.content.muted} /></TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Redo canvas change" style={styles.iconButton} onPress={redo} disabled={!future.length || !collaborationEditable}><Ionicons name="arrow-redo" size={20} color={future.length && collaborationEditable ? theme.content.primary : theme.content.muted} /></TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Canvas collaboration" style={styles.iconButton} onPress={() => setCollaborationOpen(true)}><View><Ionicons name={collaborationId ? 'people' : 'people-outline'} size={22} color={collaborationId ? theme.accent.base : theme.content.primary} />{onlineCollaborators.length > 1 ? <View style={[styles.onlineDot, { backgroundColor: theme.semantic.success }]} /> : null}</View></TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Export, share, or print canvas" style={styles.iconButton} onPress={() => setExportOpen(true)}><Ionicons name="share-outline" size={22} color={theme.accent.base} /></TouchableOpacity>
      </View>

      <View
        ref={canvasCaptureRef}
        collapsable={false}
        style={[styles.canvas, { backgroundColor: theme.dark ? '#151614' : '#F8F8F5' }]}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          canvasSize.current = { width, height };
          setViewportSize(current =>
            current.width === width && current.height === height ? current : { width, height }
          );
        }}
        {...boardResponder.panHandlers}
      >
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {grid ? <Defs><Pattern id="canvasGrid" x={pan.x % (28 * zoom)} y={pan.y % (28 * zoom)} width={28 * zoom} height={28 * zoom} patternUnits="userSpaceOnUse"><Path d={`M ${28 * zoom} 0 L 0 0 0 ${28 * zoom}`} fill="none" stroke={theme.divider} strokeWidth={1} /></Pattern></Defs> : null}
          {grid ? <Rect width="100%" height="100%" fill="url(#canvasGrid)" /> : null}
          <G transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {displayObjects.filter(object => object.type === 'drawing' && object.points?.length).map(object => (
              <React.Fragment key={object.id}>
                {selectedIds.includes(object.id) && !cleanExport ? <Path d={buildSmoothStrokePath(object.points ?? [])} fill="none" stroke={theme.accent.base} strokeWidth={(object.style.strokeWidth ?? 3) + 7 / zoom} strokeOpacity={0.55} strokeLinecap="round" strokeLinejoin="round" /> : null}
                <Path d={buildSmoothStrokePath(object.points ?? [])} fill="none" stroke={object.style.color} strokeWidth={object.style.strokeWidth ?? 3} strokeOpacity={object.style.opacity ?? 1} strokeLinecap="round" strokeLinejoin="round" />
              </React.Fragment>
            ))}
            {displayObjects.filter(object => object.type === 'connector').map(object => {
              const geometry = getCanvasConnectorGeometry(object, objects);
              return geometry ? <React.Fragment key={object.id}><Path d={geometry.path} fill="none" stroke={object.style.color} strokeWidth={object.style.strokeWidth ?? 3} strokeOpacity={object.style.opacity ?? 1} strokeLinecap="round" />{object.connector?.arrowEnd ? <Path d={geometry.arrowPath} fill="none" stroke={object.style.color} strokeWidth={object.style.strokeWidth ?? 3} strokeLinecap="round" strokeLinejoin="round" /> : null}</React.Fragment> : null;
            })}
          </G>
        </Svg>
        {[...displayObjects].sort((a, b) => a.layer - b.layer).map(object => (
          <CanvasObjectView key={object.id} object={object} selected={selectedIds.includes(object.id)} enabled={collaborationEditable && tool === 'select'} cleanExport={cleanExport} pan={pan} zoom={zoom}
            referenceItem={resolveCanvasReference(object, referenceItems)}
            referenceAppearance={referenceAppearance}
            onToggleReference={() => toggleReferenceTask(resolveCanvasReference(object, referenceItems))}
            onSelect={() => beginObjectMove(object)}
            onMove={moveObjectSelection}
            onMoveEnd={finishObjectMove} />
        ))}
        {!cleanExport ? onlineCollaborators.filter(person => person.uid !== user?.id && person.cursor).map(person => (
          <View
            key={`cursor_${person.uid}`}
            pointerEvents="none"
            style={[
              styles.collaboratorCursor,
              {
                left: pan.x + person.cursor!.x * zoom,
                top: pan.y + person.cursor!.y * zoom,
                backgroundColor: theme.accent.base,
              },
            ]}
          >
            <Ionicons name="navigate" size={13} color={theme.iconTile.foreground} />
            <Text numberOfLines={1} style={[styles.collaboratorCursorName, { color: theme.iconTile.foreground }]}>
              {person.name}
            </Text>
          </View>
        )) : null}
        {tool === 'select' ? displayObjects.filter(object => object.type === 'connector').map(object => { const geometry = getCanvasConnectorGeometry(object, objects); return geometry ? <TouchableOpacity key={object.id} accessibilityLabel="Select anchored connector" style={[styles.connectorHandle, { left: pan.x + geometry.midpoint.x * zoom - 22, top: pan.y + geometry.midpoint.y * zoom - 22 }]} onPress={() => { selectedIdsRef.current = [object.id]; setSelectedIds([object.id]); setMultiSelect(false); }}><View style={[styles.connectorDot, { backgroundColor: selectedIds.includes(object.id) ? theme.accent.base : theme.content.muted }]} /></TouchableOpacity> : null; }) : null}
        {!cleanExport && selectedIds.length > 1 && selectionBounds ? <View pointerEvents="none" style={[styles.multiSelectionFrame, { left: pan.x + selectionBounds.left * zoom, top: pan.y + selectionBounds.top * zoom, width: Math.max(1, selectionBounds.width * zoom), height: Math.max(1, selectionBounds.height * zoom), borderColor: theme.accent.base }]} /> : null}
        {!cleanExport ? snapGuides.map(guide => <View key={`${guide.axis}_${guide.position}_${guide.kind}`} pointerEvents="none" style={[styles.snapGuide, guide.axis === 'vertical' ? { left: pan.x + guide.position * zoom, top: 0, bottom: 0, width: guide.kind === 'object' ? 2 : 1 } : { top: pan.y + guide.position * zoom, left: 0, right: 0, height: guide.kind === 'object' ? 2 : 1 }, { backgroundColor: theme.accent.base, opacity: guide.kind === 'object' ? 0.9 : 0.5 }]} />) : null}
        {!cleanExport && selectionRect ? <View pointerEvents="none" style={[styles.lasso, { left: pan.x + selectionRect.left * zoom, top: pan.y + selectionRect.top * zoom, width: selectionRect.width * zoom, height: selectionRect.height * zoom, borderColor: theme.accent.base, backgroundColor: theme.accent.soft }]} /> : null}
        {!cleanExport ? <View style={[styles.zoomControls, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}> 
          <TouchableOpacity accessibilityLabel="Zoom out" style={styles.zoomButton} onPress={() => setZoom(value => Math.max(0.3, value - 0.1))}><Ionicons name="remove" size={18} color={theme.content.primary} /></TouchableOpacity>
          <Text style={[styles.zoomText, { color: theme.content.secondary }]}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity accessibilityLabel="Zoom in" style={styles.zoomButton} onPress={() => setZoom(value => Math.min(2.5, value + 0.1))}><Ionicons name="add" size={18} color={theme.content.primary} /></TouchableOpacity>
        </View> : null}
        {!cleanExport && collaborationEditable ? <>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: toolsOpen }} accessibilityLabel={toolsOpen ? 'Hide canvas tools' : 'Show canvas tools'} style={[styles.toolsToggle, { backgroundColor: toolsOpen ? theme.accent.base : theme.glass.solid, borderColor: theme.glass.border }]} onPress={() => setToolsOpen(value => !value)}><MaterialCommunityIcons name={toolsOpen ? 'close' : 'tools'} size={22} color={toolsOpen ? '#FFF' : theme.content.primary} /></TouchableOpacity>
          {toolsOpen ? <View style={[styles.sideTools, { bottom: selectedIds.length ? 76 : 12, backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sideToolsContent}>
            {([['hand', 'hand-back-left-outline', 'Hand'], ['select', 'cursor-default-click-outline', 'Select'], ['pen', 'pencil-outline', 'Pen'], ['highlighter', 'brush-outline', 'Highlight'], ['eraser', 'eraser', 'Eraser']] as const).map(([value, icon, label]) => <TouchableOpacity key={value} accessibilityLabel={`${label} tool`} style={[styles.railButton, tool === value && { backgroundColor: theme.accent.soft }]} onPress={() => { setTool(value); if (value !== 'select') { selectedIdsRef.current = []; setSelectedIds([]); setMultiSelect(false); setInspector(false); } }}><MaterialCommunityIcons name={icon} size={21} color={tool === value ? theme.accent.base : theme.content.primary} /><Text numberOfLines={1} style={[styles.railLabel, { color: tool === value ? theme.accent.base : theme.content.secondary }]}>{label}</Text></TouchableOpacity>)}
            <View style={[styles.railDivider, { backgroundColor: theme.divider }]} />
            <TouchableOpacity accessibilityRole="switch" accessibilityState={{ checked: grid }} accessibilityLabel={grid ? 'Hide canvas grid' : 'Show canvas grid'} style={[styles.railButton, grid && { backgroundColor: theme.accent.soft }]} onPress={() => setGrid(value => !value)}><MaterialCommunityIcons name="grid" size={21} color={grid ? theme.accent.base : theme.content.primary} /><Text style={[styles.railLabel, { color: grid ? theme.accent.base : theme.content.secondary }]}>Grid</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="switch" accessibilityState={{ checked: snapEnabled }} accessibilityLabel={snapEnabled ? 'Disable smart snapping' : 'Enable smart snapping'} style={[styles.railButton, snapEnabled && { backgroundColor: theme.accent.soft }]} onPress={() => { setSnapEnabled(value => !value); setSnapGuides([]); }}><MaterialCommunityIcons name="magnet" size={21} color={snapEnabled ? theme.accent.base : theme.content.primary} /><Text style={[styles.railLabel, { color: snapEnabled ? theme.accent.base : theme.content.secondary }]}>Snap</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Change drawing color" style={styles.railButton} onPress={() => setStrokeColor(current => COLORS[(COLORS.indexOf(current) + 1) % COLORS.length])}><View style={[styles.strokeColor, { backgroundColor: strokeColor }]} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Color</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Change stroke size" style={styles.railButton} onPress={() => setStrokeWidth(current => current >= 9 ? 2 : current + 3)}><Text style={[styles.strokeLabel, { color: theme.content.primary }]}>{strokeWidth}</Text><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Size</Text></TouchableOpacity>
            <View style={[styles.railDivider, { backgroundColor: theme.divider }]} />
            <TouchableOpacity accessibilityLabel="Add text" style={styles.railButton} onPress={() => add('text')}><Ionicons name="text" size={20} color={theme.content.primary} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Text</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Add sticky note" style={styles.railButton} onPress={() => add('sticky')}><MaterialCommunityIcons name="note-outline" size={21} color={theme.content.primary} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Sticky</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Add rectangle" style={styles.railButton} onPress={() => add('rectangle')}><MaterialCommunityIcons name="rectangle-outline" size={21} color={theme.content.primary} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Box</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Add circle" style={styles.railButton} onPress={() => add('circle')}><MaterialCommunityIcons name="circle-outline" size={21} color={theme.content.primary} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Circle</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Add line" style={styles.railButton} onPress={() => add('line')}><MaterialCommunityIcons name="minus" size={22} color={theme.content.primary} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Line</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Add arrow" style={styles.railButton} onPress={() => add('arrow')}><MaterialCommunityIcons name="arrow-right" size={22} color={theme.content.primary} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Arrow</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Add live task event or note" style={styles.railButton} onPress={() => setReferenceOpen(true)}><MaterialCommunityIcons name="link-variant-plus" size={22} color={theme.content.primary} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Live item</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Attach photo to board" style={styles.railButton} onPress={() => Alert.alert('Attach photo', 'Choose where to get the photo.', [{ text: 'Photo gallery', onPress: () => void pickImage(false) }, { text: 'Camera', onPress: () => void pickImage(true) }, { text: 'Cancel', style: 'cancel' }])}><Ionicons name="images-outline" size={21} color={theme.content.primary} /><Text style={[styles.railLabel, { color: theme.content.secondary }]}>Photo</Text></TouchableOpacity>
          </ScrollView></View> : null}
        </> : null}
      </View>

      {selectedIds.length && collaborationEditable ? <View style={[styles.selectionBar, { bottom: Math.max(insets.bottom, 12), backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
        <View style={[styles.selectionCount, { backgroundColor: theme.accent.soft }]}><Text style={[styles.selectionCountText, { color: theme.accent.base }]}>{selectedIds.length}</Text></View>
        <TouchableOpacity accessibilityLabel={multiSelect ? 'Finish adding objects to selection' : 'Add objects to selection'} style={[styles.selectionAction, styles.addSelectionAction, multiSelect && { backgroundColor: theme.accent.soft }]} onPress={() => setMultiSelect(value => !value)}><Ionicons name={multiSelect ? 'checkmark' : 'add'} size={19} color={multiSelect ? theme.accent.base : theme.content.primary} /><Text style={[styles.selectionText, { color: multiSelect ? theme.accent.base : theme.content.primary }]}>{multiSelect ? 'Done' : 'Add'}</Text></TouchableOpacity>
        {selected ? <TouchableOpacity accessibilityLabel="Edit selected object" style={styles.selectionAction} onPress={() => setInspector(true)}><Ionicons name="options-outline" size={20} color={theme.content.primary} /></TouchableOpacity> : null}
        <TouchableOpacity accessibilityLabel="Arrange selection" style={styles.selectionAction} onPress={() => setArrangeOpen(true)}><MaterialCommunityIcons name="tune-variant" size={20} color={theme.content.primary} /></TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Delete selection" style={styles.selectionAction} onPress={removeSelected}><Ionicons name="trash-outline" size={20} color={theme.semantic.danger} /></TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Clear selection" style={styles.selectionAction} onPress={() => { selectedIdsRef.current = []; setSelectedIds([]); setMultiSelect(false); }}><Ionicons name="close" size={21} color={theme.content.muted} /></TouchableOpacity>
      </View> : null}

      <Modal visible={referenceOpen} transparent animationType="slide" onRequestClose={() => setReferenceOpen(false)}>
        <View style={styles.sheetLayer}>
          <TouchableOpacity accessibilityLabel="Close live item picker" style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setReferenceOpen(false)} />
          <View style={[styles.referenceSheet, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <View style={styles.arrangeHeader}><View style={styles.referenceRowCopy}><Text style={[styles.arrangeTitle, { color: theme.content.primary }]}>Add a live OmniTask item</Text><Text style={[styles.arrangeSubtitle, { color: theme.content.secondary }]}>Insert a task, event, or note that stays linked to its original data.</Text></View><TouchableOpacity accessibilityLabel="Close live item picker" style={styles.iconButton} onPress={() => setReferenceOpen(false)}><Ionicons name="close" size={23} color={theme.content.primary} /></TouchableOpacity></View>
            <View style={[styles.referenceTabs, { backgroundColor: theme.glass.secondary }]}>{(['task', 'event', 'note'] as const).map(kind => <TouchableOpacity key={kind} accessibilityRole="tab" accessibilityState={{ selected: referenceKind === kind }} style={[styles.referenceTab, referenceKind === kind && { backgroundColor: theme.accent.soft }]} onPress={() => setReferenceKind(kind)}><Text style={[styles.referenceTabText, { color: referenceKind === kind ? theme.accent.base : theme.content.secondary }]}>{kind === 'task' ? 'Tasks' : kind === 'event' ? 'Events' : 'Notes'}</Text></TouchableOpacity>)}</View>
            {referencePickerItems.length ? <ScrollView style={styles.referenceList} contentContainerStyle={styles.referenceListContent} showsVerticalScrollIndicator={false}>{referencePickerItems.map(item => <TouchableOpacity key={item.key} accessibilityLabel={`Add live ${item.kind} ${item.title}`} style={[styles.referenceRow, { borderBottomColor: theme.divider, borderBottomWidth: StyleSheet.hairlineWidth }]} onPress={() => addReference(item)}><View style={[styles.referencePickerIcon, { backgroundColor: item.kind === 'task' ? theme.iconTile.teal : item.kind === 'event' ? theme.iconTile.coral : theme.iconTile.blue }]}><MaterialCommunityIcons name={item.kind === 'task' ? 'checkbox-marked-outline' : item.kind === 'event' ? 'calendar-outline' : 'note-text-outline'} size={20} color={theme.iconTile.foreground} /></View><View style={styles.referenceRowCopy}><Text numberOfLines={1} style={[styles.referenceRowTitle, item.completed && styles.referenceCompleted, { color: theme.content.primary }]}>{item.title}</Text><Text numberOfLines={1} style={[styles.referenceRowSubtitle, { color: theme.content.secondary }]}>{item.subtitle}</Text></View><Ionicons name="add-circle-outline" size={22} color={theme.accent.base} /></TouchableOpacity>)}</ScrollView> : <View style={styles.referenceEmpty}><MaterialCommunityIcons name={referenceKind === 'task' ? 'checkbox-blank-outline' : referenceKind === 'event' ? 'calendar-blank-outline' : 'note-outline'} size={31} color={theme.content.muted} /><Text style={[styles.referenceEmptyTitle, { color: theme.content.primary }]}>No {referenceKind}s available</Text><Text style={[styles.referenceEmptyText, { color: theme.content.secondary }]}>Create one in OmniTask first, then return here to add its live card.</Text></View>}
          </View>
        </View>
      </Modal>

      <Modal visible={collaborationOpen} transparent animationType="slide" onRequestClose={() => !collaborationBusy && setCollaborationOpen(false)}>
        <View style={styles.sheetLayer}>
          <TouchableOpacity accessibilityLabel="Close collaboration" disabled={collaborationBusy} style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCollaborationOpen(false)} />
          <View style={[styles.collaborationSheet, { paddingBottom: Math.max(insets.bottom, 18), backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <View style={styles.collaborationHeader}><View style={styles.collaborationHeaderCopy}><Text style={[styles.collaborationTitle, { color: theme.content.primary }]}>Live collaboration</Text><Text style={[styles.collaborationSubtitle, { color: theme.content.secondary }]}>{collaborationId ? `${onlineCollaborators.length} online · ${collaborationMembers.length} member${collaborationMembers.length === 1 ? '' : 's'}` : 'Edit the same canvas together in real time.'}</Text></View>{collaborationBusy ? <OmniLoader size="small" accessibilityLabel="Updating collaboration" /> : <TouchableOpacity accessibilityLabel="Close collaboration" style={styles.iconButton} onPress={() => setCollaborationOpen(false)}><Ionicons name="close" size={23} color={theme.content.primary} /></TouchableOpacity>}</View>
            {!collaborationId ? <>
              <View style={[styles.collaborationInfo, { backgroundColor: theme.accent.soft }]}><MaterialCommunityIcons name="account-multiple-check-outline" size={25} color={theme.accent.base} /><View style={styles.collaborationInfoCopy}><Text style={[styles.collaborationInfoTitle, { color: theme.content.primary }]}>Private by default</Text><Text style={[styles.collaborationInfoText, { color: theme.content.secondary }]}>A short invite code stays valid for 3 days. After joining, access continues until the person leaves, is removed, or you stop sharing. Changes sync by object.</Text></View></View>
              <TouchableOpacity accessibilityRole="button" disabled={collaborationBusy} style={[styles.collaborationPrimary, { backgroundColor: theme.accent.base, opacity: collaborationBusy ? 0.55 : 1 }]} onPress={startCollaboration}><Ionicons name="radio-outline" size={20} color="#FFF" /><Text style={styles.collaborationPrimaryText}>Start collaboration</Text></TouchableOpacity>
            </> : user && collaborationOwnerId ? (
              <CanvasCollaborationPanel
                boardId={collaborationId}
                currentUserId={user.id}
                ownerId={collaborationOwnerId}
                members={collaborationMembers}
                online={onlineCollaborators}
                disabled={collaborationBusy}
                onBusyChange={setCollaborationBusy}
                onLeaveOrStop={leaveOrStopCollaboration}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={arrangeOpen && selectedIds.length > 0} transparent animationType="slide" onRequestClose={() => setArrangeOpen(false)}>
        <View style={styles.sheetLayer}>
          <TouchableOpacity accessibilityLabel="Close arrange selection" style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setArrangeOpen(false)} />
          <View style={[styles.arrangeSheet, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <View style={styles.arrangeHeader}>
              <View><Text style={[styles.arrangeTitle, { color: theme.content.primary }]}>Arrange selection</Text><Text style={[styles.arrangeSubtitle, { color: theme.content.muted }]}>{selectedIds.length} {selectedIds.length === 1 ? 'object' : 'objects'} selected</Text></View>
              <TouchableOpacity accessibilityLabel="Close arrange selection" style={styles.iconButton} onPress={() => setArrangeOpen(false)}><Ionicons name="close" size={23} color={theme.content.primary} /></TouchableOpacity>
            </View>

            <Text style={[styles.arrangeLabel, { color: theme.content.secondary }]}>Align</Text>
            <View style={styles.arrangeRow}>
              {([['left', 'format-align-left', 'Left'], ['center', 'format-align-center', 'Center'], ['right', 'format-align-right', 'Right']] as const).map(([value, icon, label]) => <TouchableOpacity key={value} accessibilityLabel={`Align ${label.toLowerCase()}`} style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }]} onPress={() => alignSelection(value)}><MaterialCommunityIcons name={icon} size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>{label}</Text></TouchableOpacity>)}
            </View>
            <View style={styles.arrangeRow}>
              {([['top', 'align-vertical-top', 'Top'], ['middle', 'align-vertical-center', 'Middle'], ['bottom', 'align-vertical-bottom', 'Bottom']] as const).map(([value, icon, label]) => <TouchableOpacity key={value} accessibilityLabel={`Align ${label.toLowerCase()}`} style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }]} onPress={() => alignSelection(value)}><MaterialCommunityIcons name={icon} size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>{label}</Text></TouchableOpacity>)}
            </View>

            <Text style={[styles.arrangeLabel, { color: theme.content.secondary }]}>Space and size</Text>
            <View style={styles.arrangeRow}>
              <TouchableOpacity accessibilityLabel="Distribute horizontally" disabled={selectedIds.length < 3} style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }, selectedIds.length < 3 && styles.disabledAction]} onPress={() => distributeSelection('horizontal')}><MaterialCommunityIcons name="distribute-horizontal-center" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Across</Text></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Distribute vertically" disabled={selectedIds.length < 3} style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }, selectedIds.length < 3 && styles.disabledAction]} onPress={() => distributeSelection('vertical')}><MaterialCommunityIcons name="distribute-vertical-center" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Down</Text></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Make selection smaller" style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }]} onPress={() => resizeSelection(0.9)}><MaterialCommunityIcons name="arrow-collapse" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Smaller</Text></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Make selection larger" style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }]} onPress={() => resizeSelection(1.1)}><MaterialCommunityIcons name="arrow-expand" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Larger</Text></TouchableOpacity>
            </View>

            <Text style={[styles.arrangeLabel, { color: theme.content.secondary }]}>Relationship</Text>
            <View style={styles.arrangeRow}>
              <TouchableOpacity accessibilityLabel="Connect selected objects" disabled={!connectableSelection || selectionAlreadyConnected} style={[styles.arrangeAction, styles.wideArrangeAction, { backgroundColor: theme.glass.secondary }, (!connectableSelection || selectionAlreadyConnected) && styles.disabledAction]} onPress={connectSelection}><MaterialCommunityIcons name="vector-line" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>{selectionAlreadyConnected ? 'Already connected' : 'Connect selected objects'}</Text></TouchableOpacity>
            </View>

            <Text style={[styles.arrangeLabel, { color: theme.content.secondary }]}>Handwriting</Text>
            <View style={styles.arrangeRow}>
              <TouchableOpacity accessibilityLabel="Recognize selected handwriting" disabled={!selectedDrawings.length || recognizingHandwriting} style={[styles.arrangeAction, styles.wideArrangeAction, { backgroundColor: theme.glass.secondary }, (!selectedDrawings.length || recognizingHandwriting) && styles.disabledAction]} onPress={() => void recognizeSelectedHandwriting()}>{recognizingHandwriting ? <OmniLoader size="small" accessibilityLabel="Recognizing handwriting" /> : <MaterialCommunityIcons name="text-recognition" size={20} color={theme.content.primary} />}<Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>{recognizingHandwriting ? 'Recognizing…' : `Recognize ${selectedDrawings.length || ''} stroke${selectedDrawings.length === 1 ? '' : 's'}`}</Text></TouchableOpacity>
            </View>

            <Text style={[styles.arrangeLabel, { color: theme.content.secondary }]}>Group and layer</Text>
            <View style={styles.arrangeRow}>
              <TouchableOpacity accessibilityLabel="Group selection" disabled={selectedIds.length < 2} style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }, selectedIds.length < 2 && styles.disabledAction]} onPress={groupSelection}><MaterialCommunityIcons name="group" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Group</Text></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Ungroup selection" disabled={!hasGroupedSelection} style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }, !hasGroupedSelection && styles.disabledAction]} onPress={ungroupSelection}><MaterialCommunityIcons name="ungroup" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Ungroup</Text></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Duplicate selection" style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }]} onPress={duplicateSelection}><Ionicons name="copy-outline" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Duplicate</Text></TouchableOpacity>
            </View>
            <View style={styles.arrangeRow}>
              <TouchableOpacity accessibilityLabel="Bring selection forward" style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }]} onPress={() => changeSelectionLayer(1)}><MaterialCommunityIcons name="arrange-bring-forward" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Forward</Text></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Send selection backward" style={[styles.arrangeAction, { backgroundColor: theme.glass.secondary }]} onPress={() => changeSelectionLayer(-1)}><MaterialCommunityIcons name="arrange-send-backward" size={20} color={theme.content.primary} /><Text style={[styles.arrangeActionText, { color: theme.content.primary }]}>Backward</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={handwritingOpen} transparent animationType="fade" onRequestClose={() => setHandwritingOpen(false)}>
        <KeyboardAvoidingView style={styles.handwritingLayer} behavior="padding">
          <View style={[styles.handwritingSheet, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <View style={styles.inspectorHeader}><View><Text style={[styles.inspectorTitle, { color: theme.content.primary }]}>Recognized handwriting</Text><Text style={[styles.handwritingSubtitle, { color: theme.content.secondary }]}>Review the text before adding it.</Text></View><TouchableOpacity accessibilityLabel="Cancel handwriting conversion" style={styles.iconButton} onPress={() => setHandwritingOpen(false)}><Ionicons name="close" size={22} color={theme.content.primary} /></TouchableOpacity></View>
            {handwritingCandidates.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handwritingCandidates}>{handwritingCandidates.map(candidate => <TouchableOpacity key={candidate} style={[styles.handwritingCandidate, { backgroundColor: handwritingText === candidate ? theme.accent.soft : theme.glass.secondary }]} onPress={() => setHandwritingText(candidate)}><Text style={[styles.handwritingCandidateText, { color: handwritingText === candidate ? theme.accent.base : theme.content.primary }]}>{candidate}</Text></TouchableOpacity>)}</ScrollView> : null}
            <TextInput autoFocus multiline value={handwritingText} onChangeText={setHandwritingText} placeholder="Recognized text" placeholderTextColor={theme.content.muted} style={[styles.handwritingInput, { color: theme.content.primary, backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]} />
            <TouchableOpacity disabled={!handwritingText.trim()} style={[styles.doneButton, { backgroundColor: theme.accent.base }, !handwritingText.trim() && styles.disabledAction]} onPress={() => insertRecognizedText(false)}><Text style={styles.doneText}>Keep ink and add text</Text></TouchableOpacity>
            <TouchableOpacity disabled={!handwritingText.trim()} style={[styles.handwritingSecondary, { backgroundColor: theme.glass.secondary }, !handwritingText.trim() && styles.disabledAction]} onPress={() => insertRecognizedText(true)}><Text style={[styles.handwritingSecondaryText, { color: theme.content.primary }]}>Replace ink with text</Text></TouchableOpacity>
            <TouchableOpacity style={styles.handwritingCancel} onPress={() => setHandwritingOpen(false)}><Text style={[styles.handwritingCancelText, { color: theme.content.secondary }]}>Cancel</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={inspector && Boolean(selected)} transparent animationType="slide" onRequestClose={() => setInspector(false)}>
        <KeyboardAvoidingView style={styles.inspectorLayer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
          <TouchableOpacity accessibilityLabel="Close object editor" style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setInspector(false)} />
          <View style={[styles.inspector, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <View style={styles.inspectorHandle} />
          <View style={styles.inspectorHeader}><View><Text style={[styles.inspectorTitle, { color: theme.content.primary }]}>{selected?.type === 'text' || selected?.type === 'sticky' ? 'Edit text' : 'Object style'}</Text><Text style={[styles.inspectorHint, { color: theme.content.secondary }]}>Changes appear live on the canvas above.</Text></View><TouchableOpacity accessibilityLabel="Finish editing object" style={[styles.inspectorDone, { backgroundColor: theme.accent.soft }]} onPress={() => setInspector(false)}><Text style={[styles.inspectorDoneText, { color: theme.accent.base }]}>Done</Text></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.inspectorContent}>
          {(selected?.type === 'text' || selected?.type === 'sticky') ? <TextInput multiline value={selected.content} onChangeText={content => updateSelected({ content })} placeholder="Write something" placeholderTextColor={theme.content.muted} style={[styles.contentInput, { color: theme.content.primary, backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]} /> : null}
          <View style={styles.inspectorControlRow}><Text style={[styles.inspectorLabel, { color: theme.content.secondary }]}>Color</Text><View style={styles.colorRow}>{COLORS.map(color => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: selected?.style.color === color }} accessibilityLabel={`Use color ${color}`} key={color} onPress={() => updateSelected({ style: { ...selected!.style, color } })} style={[styles.colorTarget, selected?.style.color === color && { backgroundColor: theme.accent.soft }]}><View style={[styles.color, { backgroundColor: color }, selected?.style.color === color && { borderColor: theme.accent.base, borderWidth: 3 }]} /></TouchableOpacity>)}</View></View>
          {selected?.type !== 'connector' ? <View style={styles.inspectorControlRow}><Text style={[styles.inspectorLabel, { color: theme.content.secondary }]}>Size</Text><View style={styles.compactStepper}><TouchableOpacity accessibilityLabel="Make object smaller" style={[styles.stepper, { backgroundColor: theme.glass.secondary }]} onPress={() => updateSelected({ size: { width: Math.max(44, selected!.size.width - 20), height: Math.max(30, selected!.size.height - 20) } })}><Ionicons name="remove" size={21} color={theme.content.primary} /></TouchableOpacity><Text style={[styles.sizeText, { color: theme.content.primary }]}>{Math.round(selected?.size.width ?? 0)} × {Math.round(selected?.size.height ?? 0)}</Text><TouchableOpacity accessibilityLabel="Make object larger" style={[styles.stepper, { backgroundColor: theme.glass.secondary }]} onPress={() => updateSelected({ size: { width: selected!.size.width + 20, height: selected!.size.height + 20 } })}><Ionicons name="add" size={21} color={theme.content.primary} /></TouchableOpacity></View></View> : <TouchableOpacity accessibilityRole="switch" accessibilityState={{ checked: selected.connector?.arrowEnd ?? false }} style={[styles.connectorOption, { backgroundColor: theme.glass.secondary }]} onPress={() => updateSelected({ connector: selected.connector ? { ...selected.connector, arrowEnd: !selected.connector.arrowEnd } : undefined })}><MaterialCommunityIcons name="arrow-right" size={21} color={theme.accent.base} /><Text style={[styles.connectorOptionText, { color: theme.content.primary }]}>Arrow endpoint</Text><Ionicons name={selected.connector?.arrowEnd ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected.connector?.arrowEnd ? theme.accent.base : theme.content.muted} /></TouchableOpacity>}
          {(selected?.type === 'text' || selected?.type === 'sticky') ? <View style={styles.formatRow}><TouchableOpacity style={[styles.formatButton, selected.style.bold && { backgroundColor: theme.accent.soft }]} onPress={() => updateSelected({ style: { ...selected.style, bold: !selected.style.bold } })}><Text style={[styles.formatText, { color: theme.content.primary, fontFamily: fontFamily.black }]}>B</Text></TouchableOpacity><TouchableOpacity style={[styles.formatButton, selected.style.italic && { backgroundColor: theme.accent.soft }]} onPress={() => updateSelected({ style: { ...selected.style, italic: !selected.style.italic } })}><Text style={[styles.formatText, { color: theme.content.primary, fontStyle: 'italic' }]}>I</Text></TouchableOpacity><TouchableOpacity style={[styles.formatButton, selected.style.underline && { backgroundColor: theme.accent.soft }]} onPress={() => updateSelected({ style: { ...selected.style, underline: !selected.style.underline } })}><Text style={[styles.formatText, { color: theme.content.primary, textDecorationLine: 'underline' }]}>U</Text></TouchableOpacity><TouchableOpacity accessibilityLabel="Decrease font size" style={styles.formatButton} onPress={() => updateSelected({ style: { ...selected.style, fontSize: Math.max(10, (selected.style.fontSize ?? 18) - 2) } })}><Text style={[styles.formatText, { color: theme.content.primary }]}>A−</Text></TouchableOpacity><TouchableOpacity accessibilityLabel="Increase font size" style={styles.formatButton} onPress={() => updateSelected({ style: { ...selected.style, fontSize: Math.min(64, (selected.style.fontSize ?? 18) + 2) } })}><Text style={[styles.formatText, { color: theme.content.primary }]}>A+</Text></TouchableOpacity></View> : null}
          </ScrollView>
        </View></KeyboardAvoidingView>
      </Modal>
      <CanvasExportSheet visible={exportOpen} note={currentDocument()} captureTarget={canvasCaptureRef} onCaptureModeChange={setCleanExport} onClose={() => setExportOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, topBar: { minHeight: 58, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, titleColumn: { flex: 1, justifyContent: 'center' }, titleInput: { fontSize: 18, fontFamily: fontFamily.extrabold, paddingHorizontal: 6, paddingVertical: 0 }, saveStatus: { paddingHorizontal: 6, marginTop: 1, fontSize: 10, fontFamily: fontFamily.bold },
  onlineDot: { position: 'absolute', right: -2, top: -1, width: 8, height: 8, borderRadius: 4 },
  canvas: { flex: 1, overflow: 'hidden' },
  multiSelectionFrame: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed', zIndex: 90 },
  snapGuide: { position: 'absolute', zIndex: 94 },
  connectorHandle: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 91 },
  connectorDot: { width: 10, height: 10, borderRadius: 5 },
  collaboratorCursor: { position: 'absolute', zIndex: 98, minHeight: 28, maxWidth: 130, borderRadius: 10, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  collaboratorCursorName: { flexShrink: 1, fontSize: 10, fontFamily: fontFamily.extrabold },
  lasso: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.72, zIndex: 95 },
  zoomControls: { position: 'absolute', left: 12, top: 12, minHeight: 38, borderRadius: 19, borderWidth: 1, flexDirection: 'row', alignItems: 'center' }, zoomButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, zoomText: { minWidth: 42, textAlign: 'center', fontFamily: fontFamily.extrabold, fontSize: 11 },
  toolsToggle: { position: 'absolute', right: 12, top: 12, width: 48, height: 48, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 110 },
  sideTools: { position: 'absolute', right: 12, top: 68, width: 68, borderRadius: 22, borderWidth: 1, overflow: 'hidden', zIndex: 109 },
  sideToolsContent: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, gap: 3 },
  railButton: { width: 54, minHeight: 50, borderRadius: 15, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', gap: 2 },
  railLabel: { fontSize: 9, lineHeight: 11, fontFamily: fontFamily.bold, textAlign: 'center' },
  railDivider: { width: 34, height: StyleSheet.hairlineWidth, marginVertical: 4 },
  strokeColor: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: '#FFF' }, strokeLabel: { fontSize: 13, fontFamily: fontFamily.extrabold },
  selectionBar: { position: 'absolute', left: 12, right: 12, minHeight: 54, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 },
  selectionAction: { width: 44, minHeight: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  addSelectionAction: { width: 58 },
  selectionText: { fontSize: 12, fontFamily: fontFamily.bold },
  selectionCount: { minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  selectionCountText: { fontSize: 13, fontFamily: fontFamily.extrabold },
  sheetLayer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.34)' },
  collaborationSheet: { maxHeight: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingTop: 14 },
  collaborationHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center' }, collaborationHeaderCopy: { flex: 1 }, collaborationTitle: { fontSize: 20, fontFamily: fontFamily.extrabold }, collaborationSubtitle: { marginTop: 2, fontSize: 12, fontFamily: fontFamily.medium },
  collaborationInfo: { borderRadius: 18, padding: 15, marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, collaborationInfoCopy: { flex: 1 }, collaborationInfoTitle: { fontSize: 14, fontFamily: fontFamily.extrabold }, collaborationInfoText: { marginTop: 3, fontSize: 12, lineHeight: 17, fontFamily: fontFamily.medium },
  collaborationPrimary: { minHeight: 48, borderRadius: 24, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, collaborationPrimaryText: { color: '#FFF', fontSize: 14, fontFamily: fontFamily.extrabold }, collaborationDanger: { minHeight: 46, marginTop: 4, alignItems: 'center', justifyContent: 'center' }, collaborationDangerText: { fontSize: 13, fontFamily: fontFamily.bold },
  memberList: { marginTop: 10 }, memberRow: { minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 11 }, memberAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, memberInitial: { fontSize: 15, fontFamily: fontFamily.extrabold }, memberPresenceDot: { position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#FFF' }, memberCopy: { flex: 1 }, memberName: { fontSize: 14, fontFamily: fontFamily.extrabold }, memberRole: { marginTop: 2, fontSize: 11, fontFamily: fontFamily.medium }, memberRemove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  referenceSheet: { maxHeight: '76%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingTop: 14 },
  referenceTabs: { height: 44, borderRadius: 16, padding: 3, marginTop: 10, flexDirection: 'row' },
  referenceTab: { flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  referenceTabText: { fontSize: 13, fontFamily: fontFamily.bold },
  referenceList: { marginTop: 10 },
  referenceListContent: { paddingBottom: 8 },
  referenceRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  referencePickerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  referenceRowCopy: { flex: 1 },
  referenceRowTitle: { fontSize: 14, fontFamily: fontFamily.extrabold },
  referenceRowSubtitle: { marginTop: 2, fontSize: 11, fontFamily: fontFamily.medium },
  referenceCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
  referenceEmpty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  referenceEmptyTitle: { marginTop: 10, fontSize: 16, fontFamily: fontFamily.extrabold },
  referenceEmptyText: { marginTop: 4, maxWidth: 260, textAlign: 'center', fontSize: 12, lineHeight: 17 },
  arrangeSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingTop: 14 },
  arrangeHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrangeTitle: { fontSize: 20, fontFamily: fontFamily.extrabold },
  arrangeSubtitle: { marginTop: 1, fontSize: 12, fontFamily: fontFamily.medium },
  arrangeLabel: { marginTop: 12, marginBottom: 7, fontSize: 12, fontFamily: fontFamily.bold },
  arrangeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  arrangeAction: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  wideArrangeAction: { flexDirection: 'row', gap: 8 },
  arrangeActionText: { fontSize: 10, fontFamily: fontFamily.bold, textAlign: 'center' },
  disabledAction: { opacity: 0.36 },
  connectorOption: { minHeight: 50, marginTop: 14, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  connectorOptionText: { flex: 1, fontSize: 14, fontFamily: fontFamily.bold },
  handwritingLayer: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.34)' },
  handwritingSheet: { borderRadius: 28, borderWidth: 1, padding: 18 },
  handwritingSubtitle: { marginTop: 2, fontSize: 12, fontFamily: fontFamily.medium },
  handwritingCandidates: { gap: 8, paddingVertical: 12 },
  handwritingCandidate: { minHeight: 40, maxWidth: 220, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  handwritingCandidateText: { fontSize: 13, fontFamily: fontFamily.bold },
  handwritingInput: { minHeight: 96, maxHeight: 190, borderRadius: 16, borderWidth: 1, padding: 14, textAlignVertical: 'top', fontSize: 17, fontFamily: fontFamily.medium },
  handwritingSecondary: { minHeight: 46, marginTop: 8, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  handwritingSecondaryText: { fontSize: 14, fontFamily: fontFamily.extrabold },
  handwritingCancel: { minHeight: 44, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  handwritingCancelText: { fontSize: 14, fontFamily: fontFamily.bold },
  inspectorLayer: { flex: 1, justifyContent: 'flex-end' }, inspector: { maxHeight: '52%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 16, paddingTop: 8 }, inspectorHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: 'rgba(128,128,128,0.35)', marginBottom: 6 }, inspectorHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, inspectorTitle: { fontSize: 18, fontFamily: fontFamily.extrabold }, inspectorHint: { marginTop: 1, fontSize: 11, fontFamily: fontFamily.medium }, inspectorDone: { minWidth: 64, minHeight: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, inspectorDoneText: { fontSize: 13, fontFamily: fontFamily.extrabold }, inspectorContent: { paddingBottom: 4 }, contentInput: { minHeight: 54, maxHeight: 84, borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10, textAlignVertical: 'top', fontSize: 16 }, inspectorControlRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 }, inspectorLabel: { width: 42, fontSize: 12, fontFamily: fontFamily.bold }, colorRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' }, colorTarget: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, color: { width: 28, height: 28, borderRadius: 14 }, compactStepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }, stepper: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, sizeText: { minWidth: 82, textAlign: 'center', fontFamily: fontFamily.bold }, formatRow: { flexDirection: 'row', gap: 8, marginTop: 2 }, formatButton: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, formatText: { fontSize: 16 }, doneButton: { minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, doneText: { color: '#FFF', fontSize: 15, fontFamily: fontFamily.extrabold },
});
