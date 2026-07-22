import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DashboardScreen from '@/screens/DashboardScreen';
import FocusScreen from '@/screens/FocusScreen';
import AlarmScreen from '@/screens/AlarmScreen';
import CalculatorScreen from '@/screens/CalculatorScreen';
import TasksScreen from '@/screens/TasksScreen';
import { useTheme } from '@/context/ThemeContext';
import { floatingShadow, radii } from '@/theme';
import { fontFamily } from '@/theme/typography';

const Tab = createBottomTabNavigator();

function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: theme.accent.base }]}>
      {children}
    </View>
  );
}

export default function MainTabNavigator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8) + 8;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent.base,
        tabBarInactiveTintColor: theme.content.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          floatingShadow,
          {
            bottom,
            backgroundColor: 'transparent',
            borderColor: theme.dark ? 'rgba(255,255,255,0.19)' : 'rgba(255,255,255,0.88)',
          },
        ],
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.tabBarFill,
              { backgroundColor: theme.dark ? 'rgba(35,36,34,0.86)' : 'rgba(250,250,248,0.72)' },
            ]}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.glassTint,
                { backgroundColor: theme.dark ? 'rgba(110,159,189,0.035)' : 'rgba(255,255,255,0.20)' },
              ]}
            />
            <View style={[styles.glassHighlight, { backgroundColor: theme.glass.highlight }]} />
          </View>
        ),
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={focused ? '#FFF' : theme.icon} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name={focused ? 'timer' : 'timer-outline'} size={22} color={focused ? '#FFF' : theme.icon} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Alarm"
        component={AlarmScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name={focused ? 'alarm' : 'alarm-outline'} size={22} color={focused ? '#FFF' : theme.icon} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name={focused ? 'calculator' : 'calculator-outline'} size={22} color={focused ? '#FFF' : theme.icon} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          tabBarLabel: 'Organize',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <MaterialCommunityIcons name={focused ? 'note-text' : 'note-text-outline'} size={22} color={focused ? '#FFF' : theme.icon} />
            </TabIcon>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 68,
    borderRadius: radii.pill,
    borderTopWidth: 1,
    borderWidth: 1,
    overflow: 'hidden',
    paddingTop: 4,
    paddingBottom: 4,
  },
  tabBarFill: { borderRadius: radii.pill, overflow: 'hidden' },
  glassTint: { borderRadius: radii.pill },
  glassHighlight: {
    position: 'absolute',
    top: 1,
    left: 24,
    right: 24,
    height: 1,
    opacity: 0.8,
  },
  tabItem: { height: 58 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
  },
  label: { fontSize: 10, fontFamily: fontFamily.semibold, marginTop: -1 },
});
