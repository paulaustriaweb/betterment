import { Tabs } from 'expo-router';

import { AgendaIcon, GoalsIcon, HomeIcon, LogIcon, MoneyIcon } from '@/components/icons';
import { colors, font } from '@/lib/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopWidth: 0, elevation: 0 },
        tabBarLabelStyle: { fontSize: 9.5, fontFamily: font.medium },
        sceneStyle: { backgroundColor: colors.ground },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Overview', tabBarIcon: ({ color }) => <HomeIcon color={color as string} /> }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Day', tabBarIcon: ({ color }) => <AgendaIcon color={color as string} /> }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: 'Log', tabBarIcon: ({ color }) => <LogIcon color={color as string} /> }}
      />
      <Tabs.Screen
        name="money"
        options={{ title: 'Money', tabBarIcon: ({ color }) => <MoneyIcon color={color as string} /> }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: 'Goals', tabBarIcon: ({ color }) => <GoalsIcon color={color as string} /> }}
      />
    </Tabs>
  );
}
