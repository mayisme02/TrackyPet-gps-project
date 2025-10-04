import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import  HapticTab  from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/assets/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';


export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          title: 'หน้าหลัก',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="Pet"
        options={{
          title: 'สัตว์เลี้ยง',
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome6 name="paw" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Map2"
        options={{
          title: 'แผนที่',
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome6 name="map-pin" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Devices"
        options={{
          title: 'อุปกรณ์',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="devices" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'บัญชีผู้ใช้',
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome6 name="user-pen" size={24} color={color} />,
        }}
      />
      {/* ซ่อนจากแท็บ */}
      <Tabs.Screen name="Map" options={{ href: null }} />
    </Tabs>
    
  );
}