import { Tabs, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Platform } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rtdb } from "../../firebase/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { Colors } from "@/assets/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [unreadCount, setUnreadCount] = useState(0);

  /* ================= UPDATE BADGE WHEN TAB FOCUS ================= */
  useFocusEffect(
    useCallback(() => {
      let unsub: any;

      const load = async () => {
        const deviceId = await AsyncStorage.getItem("activeDevice");
        if (!deviceId) {
          setUnreadCount(0);
          return;
        }

        const lastRead =
          Number(
            await AsyncStorage.getItem(
              `notification_last_read_${deviceId}`
            )
          ) || 0;

        const ref = dbRef(rtdb, `devices/${deviceId}/alerts`);

        unsub = onValue(ref, (snap) => {
          const v = snap.val() || {};
          let count = 0;

          Object.values(v).forEach((a: any) => {
            const t = a.atUtc ? Date.parse(a.atUtc) : 0;
            if (t > lastRead) count++;
          });

          setUnreadCount(count);
        });
      };

      load();

      return () => {
        unsub && unsub();
      };
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:
          Colors[colorScheme ?? "light"].tint,
        tabBarStyle: Platform.select({
          ios: { position: "absolute" },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "หน้าหลัก",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="devices"
        options={{
          title: "อุปกรณ์",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="devices" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="maps"
        options={{
          title: "แผนที่",
          tabBarIcon: ({ color }) => (
            <FontAwesome5
              name="map-marked-alt"
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* 🔔 Notification */}
      <Tabs.Screen
        name="notification"
        options={{
          title: "แจ้งเตือน",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="bell" size={24} color={color} />
          ),
          tabBarBadge:
            unreadCount > 0 ? unreadCount : undefined,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "บัญชีผู้ใช้",
          tabBarIcon: ({ color }) => (
            <FontAwesome6
              name="user-pen"
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}