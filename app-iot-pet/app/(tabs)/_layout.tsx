import { Tabs,Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
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
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'หน้าหลัก',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pet"
        options={{
          title: 'สัตว์เลี้ยง',
          tabBarIcon: ({ color }) => <FontAwesome6 name="paw" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'แผนที่',
          tabBarIcon: ({ color }) => <FontAwesome6 name="map-pin" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'อุปกรณ์',
          tabBarIcon: ({ color }) => <MaterialIcons name="devices" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ color }) => <FontAwesome6 name="user-pen" size={24} color={color} />,
        }}
      />
      <Tabs.Screen name="Editprofile" options={{ href: null }} />  {/*  ซ่อนจากแท็บ */} 
      <Tabs.Screen name="notification" options={{ href: null }} /> 
    </Tabs>
  );
}