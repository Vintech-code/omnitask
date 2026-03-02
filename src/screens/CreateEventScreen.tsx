import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE = '#4A90D9';
const PURPLE = '#7C5CBF';

export default function CreateEventScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationAlert, setLocationAlert] = useState(false);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [agreed, setAgreed] = useState(false);

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Top Bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.topCancel}>Cancel</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.topTitle}>New Event</Text>
          <Text style={s.topSaved}>Auto-saved 2m ago</Text>
        </View>
        <TouchableOpacity>
          <Text style={s.topDrafts}>Drafts</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Event Title ── */}
        <TextInput
          style={s.titleInput}
          placeholder="Event Title (e.g. Project Sync)"
          placeholderTextColor="#C5C5C5"
          value={title}
          onChangeText={setTitle}
        />

        {/* ── Description & Agenda ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Description &amp; Agenda</Text>
          <TextInput
            style={s.descInput}
            placeholder="What's the goal for this meeting? Add links, agenda items, or notes..."
            placeholderTextColor="#C5C5C5"
            multiline
            value={description}
            onChangeText={setDescription}
          />
          <View style={s.descToolbar}>
            <TouchableOpacity style={s.toolbarBtn}>
              <Ionicons name="list-outline" size={14} color="#555" />
              <Text style={s.toolbarBtnText}> Rich Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolbarBtn}>
              <Ionicons name="add" size={14} color="#555" />
              <Text style={s.toolbarBtnText}> Add Sub-task</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Timing ── */}
        <View style={s.sectionRow}>
          <Ionicons name="calendar-outline" size={16} color={BLUE} />
          <Text style={s.sectionRowTitle}> TIMING</Text>
          <Text style={s.sectionRowRight}>Today</Text>
        </View>
        <View style={s.timingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.timingLabel}>START</Text>
            <TouchableOpacity style={s.timingVal}>
              <Ionicons name="time-outline" size={14} color={BLUE} />
              <Text style={s.timingValText}> 10:30 AM</Text>
            </TouchableOpacity>
            <Text style={s.timingDate}>Oct 24, 2023</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.timingLabel}>END (OPTIONAL)</Text>
            <TouchableOpacity style={s.timingAdd}>
              <Ionicons name="add" size={14} color="#888" />
              <Text style={s.timingAddText}> Add End Time</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Suggested Times */}
        <View style={s.suggestedBox}>
          <View style={s.suggestedTitle}>
            <MaterialCommunityIcons name="star-four-points-outline" size={13} color={PURPLE} />
            <Text style={s.suggestedTitleText}> SUGGESTED TIMES</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Tomorrow 9:00 AM', 'Wed 2:00 PM', 'Friday 11:…'].map(t => (
              <TouchableOpacity key={t} style={s.suggestedChip}>
                <Text style={s.suggestedChipText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Location & Venue ── */}
        <View style={s.sectionRow}>
          <Ionicons name="location-outline" size={16} color="#555" />
          <Text style={s.sectionRowTitle}> LOCATION &amp; VENUE</Text>
        </View>
        <View style={s.locationInput}>
          <Ionicons name="location-outline" size={16} color="#AAA" />
          <Text style={s.locationPlaceholder}> Enter address or place name</Text>
        </View>
        <View style={s.locationTools}>
          <TouchableOpacity style={s.toolbarBtn}>
            <Ionicons name="map-outline" size={14} color="#555" />
            <Text style={s.toolbarBtnText}> Open Map Picker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.toolbarBtn}>
            <MaterialCommunityIcons name="star-four-points-outline" size={13} color={BLUE} />
            <Text style={[s.toolbarBtnText, { color: BLUE }]}> Auto-suggest</Text>
          </TouchableOpacity>
        </View>

        {/* Map placeholder */}
        <View style={s.mapPlaceholder}>
          <Ionicons name="location" size={24} color="#E05252" style={s.mapPin} />
          <Text style={s.mapMiles}>12.4 miles away</Text>
        </View>

        {/* Location-Based Alert toggle */}
        <View style={s.toggleRow}>
          <Ionicons name="notifications-outline" size={16} color="#555" />
          <Text style={s.toggleLabel}> Location-Based Alert</Text>
          <Switch
            value={locationAlert}
            onValueChange={setLocationAlert}
            trackColor={{ false: '#E0E0E0', true: BLUE }}
            thumbColor="#fff"
            style={{ marginLeft: 'auto' }}
          />
        </View>

        {/* Event Category + Priority */}
        <View style={s.catPriorityRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={s.fieldLabel}>Event Category</Text>
            <TouchableOpacity style={s.dropdown}>
              <Text style={s.dropdownText}>Work</Text>
              <Ionicons name="chevron-down" size={14} color="#555" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Priority Level</Text>
            <View style={s.priorityBtns}>
              {(['Low', 'Medium', 'High'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    s.priorityBtn,
                    priority === p && {
                      backgroundColor:
                        p === 'High' ? '#E05252' : p === 'Medium' ? '#E09C52' : '#52B788',
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.priorityBtnText,
                      priority === p && { color: '#fff' },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Reminders & Alerts ── */}
        <View style={s.sectionRow}>
          <Ionicons name="notifications-outline" size={16} color="#555" />
          <Text style={s.sectionRowTitle}> REMINDERS &amp; ALERTS</Text>
          <Text style={s.sectionRowRight}>3 Active</Text>
        </View>
        {[
          { icon: 'timer-outline' as const, label: '15 minutes before' },
          { icon: 'refresh-outline' as const, label: 'Daily Repeat' },
        ].map(item => (
          <View key={item.label} style={s.reminderRow}>
            <Ionicons name={item.icon} size={16} color="#555" />
            <Text style={s.reminderText}> {item.label}</Text>
            <TouchableOpacity style={{ marginLeft: 'auto' }}>
              <Ionicons name="close" size={16} color="#AAA" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={s.addRowBtn}>
          <Ionicons name="add" size={15} color={BLUE} />
          <Text style={[s.addRowBtnText, { color: BLUE }]}> Add Custom Notification</Text>
        </TouchableOpacity>

        {/* Advanced Notification Settings */}
        <TouchableOpacity style={s.advancedRow}>
          <Ionicons name="options-outline" size={15} color="#888" />
          <Text style={s.advancedText}> ADVANCED NOTIFICATION SETTINGS</Text>
          <Ionicons name="chevron-down" size={14} color="#888" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* ── Collaboration ── */}
        <View style={s.sectionRow}>
          <Ionicons name="people-outline" size={16} color="#555" />
          <Text style={s.sectionRowTitle}> COLLABORATION</Text>
        </View>
        <View style={s.inviteInput}>
          <Ionicons name="share-social-outline" size={16} color="#AAA" />
          <Text style={s.invitePlaceholder}> Invite by email or name...</Text>
        </View>
        <View style={s.collaboratorsRow}>
          {[BLUE, '#E09C52', '#52B788'].map((c, i) => (
            <View
              key={i}
              style={[s.avatar, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8 }]}
            />
          ))}
          <View style={[s.avatar, { backgroundColor: '#DDD', marginLeft: -8 }]}>
            <Text style={{ fontSize: 11, color: '#555', fontWeight: '700' }}>+3</Text>
          </View>
          <Text style={s.collaboratorsLabel}> 5 people invited · 2 RSVP'd</Text>
        </View>
        <TouchableOpacity style={s.shareBtn}>
          <Ionicons name="add" size={14} color="#555" />
          <Text style={s.shareBtnText}> Generate Shareable Invite Link</Text>
        </TouchableOpacity>

        {/* Attachments + Tags */}
        <View style={s.attTagRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Attachments</Text>
            <TouchableOpacity style={s.attBox}>
              <Ionicons name="attach-outline" size={22} color="#AAA" />
              <Text style={s.attText}>Add Files</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Tags &amp; Labels</Text>
            <View style={s.tagsRow}>
              <View style={s.tag}><Text style={s.tagText}>#Urgent</Text></View>
              <View style={s.tag}><Text style={s.tagText}>#Internal</Text></View>
            </View>
            <TouchableOpacity style={s.addTag}>
              <Ionicons name="add" size={13} color="#888" />
              <Text style={s.addTagText}> Tag</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Live Widget Preview ── */}
        <View style={s.widgetPreview}>
          <View style={s.widgetPreviewLeft}>
            <Text style={s.widgetPreviewBadge}>LIVE WIDGET PREVIEW</Text>
            <Text style={s.widgetPreviewTitle}>Board Review</Text>
            <Text style={s.widgetPreviewSub}>Starts in 2h 45m</Text>
          </View>
          <View style={s.widgetPreviewRight}>
            <View style={s.widgetPreviewIcon}>
              <Ionicons name="grid-outline" size={13} color={BLUE} />
              <Text style={{ fontSize: 10, color: BLUE }}> Dashboard</Text>
            </View>
            <View style={s.widgetCounters}>
              <View style={s.widgetCounter}>
                <Text style={s.widgetCounterVal}>02</Text>
                <Text style={s.widgetCounterLabel}>HR</Text>
              </View>
              <View style={s.widgetCounter}>
                <Text style={s.widgetCounterVal}>45</Text>
                <Text style={s.widgetCounterLabel}>Min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Widget actions */}
        <View style={s.widgetActions}>
          <TouchableOpacity style={s.widgetActionBtn}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#555" />
            <Text style={s.widgetActionText}> Mark Done</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.widgetActionBtn}>
            <Ionicons name="alarm-outline" size={14} color="#555" />
            <Text style={s.widgetActionText}> Snooze 10m</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.widgetActionBtn}>
            <Ionicons name="refresh-outline" size={14} color="#555" />
            <Text style={s.widgetActionText}> Every Week</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Create & Sync Button (fixed bottom) ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.createBtn} onPress={() => {
          if (!title.trim()) {
            Alert.alert('Validation', 'Please enter an event title.');
            return;
          }
          Alert.alert('Event Created!', `'${title.trim()}' has been synced to your calendar.`, [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }}>
          <Text style={s.createBtnText}>Create &amp; Sync Event</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topCancel: { fontSize: 15, color: '#555', fontWeight: '500' },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  topSaved: { fontSize: 11, color: '#3DAE7C', marginTop: 2 },
  topDrafts: { fontSize: 15, color: BLUE, fontWeight: '600' },
  scroll: { flex: 1 },

  /* Title input */
  titleInput: {
    fontSize: 20,
    fontWeight: '300',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  /* Section box */
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  descInput: {
    fontSize: 14,
    color: '#444',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    minHeight: 70,
  },
  descToolbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 10,
    gap: 10,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toolbarBtnText: { fontSize: 12, color: '#555' },

  /* Section row header */
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 0.5,
  },
  sectionRowRight: { marginLeft: 'auto', fontSize: 13, color: '#888' },

  /* Timing */
  timingRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 10,
  },
  timingLabel: { fontSize: 11, color: '#AAA', fontWeight: '600', marginBottom: 4 },
  timingVal: { flexDirection: 'row', alignItems: 'center' },
  timingValText: { fontSize: 18, fontWeight: '700', color: BLUE },
  timingDate: { fontSize: 12, color: '#999', marginTop: 2 },
  timingAdd: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timingAddText: { fontSize: 14, color: '#999' },

  /* Suggested times */
  suggestedBox: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E4FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    backgroundColor: '#FAFAFE',
  },
  suggestedTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  suggestedTitleText: { fontSize: 12, fontWeight: '700', color: PURPLE, letterSpacing: 0.5 },
  suggestedChip: {
    borderWidth: 1,
    borderColor: '#C8B8E8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  suggestedChipText: { fontSize: 13, color: PURPLE },

  /* Location */
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  locationPlaceholder: { fontSize: 14, color: '#C5C5C5' },
  locationTools: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },

  /* Map placeholder */
  mapPlaceholder: {
    marginHorizontal: 16,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#EDEDED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  mapPin: { marginTop: 10 },
  mapMiles: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontSize: 11,
    color: '#555',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  /* Toggle */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  toggleLabel: { fontSize: 14, color: '#333' },

  /* Category + Priority */
  catPriorityRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  fieldLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownText: { fontSize: 14, color: '#333' },
  priorityBtns: { flexDirection: 'row', gap: 4 },
  priorityBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  priorityBtnText: { fontSize: 12, color: '#555' },

  /* Reminders */
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  reminderText: { fontSize: 14, color: '#333' },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addRowBtnText: { fontSize: 14 },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    marginBottom: 4,
  },
  advancedText: { fontSize: 12, color: '#888', fontWeight: '600', letterSpacing: 0.5 },

  /* Collaboration */
  inviteInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  invitePlaceholder: { fontSize: 14, color: '#C5C5C5' },
  collaboratorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collaboratorsLabel: { fontSize: 13, color: '#555', marginLeft: 8 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    marginBottom: 16,
  },
  shareBtnText: { fontSize: 13, color: '#555' },

  /* Attachments + Tags */
  attTagRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    gap: 16,
  },
  attBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  attText: { fontSize: 12, color: '#AAA', marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  tag: {
    backgroundColor: '#F0EFFE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: PURPLE },
  addTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  addTagText: { fontSize: 12, color: '#888' },

  /* Live Widget Preview */
  widgetPreview: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 0,
  },
  widgetPreviewLeft: { flex: 1 },
  widgetPreviewBadge: { fontSize: 10, color: '#3DAE7C', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  widgetPreviewTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
  widgetPreviewSub: { fontSize: 12, color: '#888' },
  widgetPreviewRight: { alignItems: 'flex-end' },
  widgetPreviewIcon: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  widgetCounters: { flexDirection: 'row', gap: 8 },
  widgetCounter: { alignItems: 'center' },
  widgetCounterVal: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  widgetCounterLabel: { fontSize: 10, color: '#888' },

  /* Widget actions */
  widgetActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  widgetActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  widgetActionText: { fontSize: 12, color: '#555' },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  createBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
