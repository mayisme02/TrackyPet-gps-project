import { Tabs, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, DeviceEventEmitter } from "react-native";
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

  const unsubRef = useRef<null | (() => void)>(null);
  const loadingRef = useRef(false);

  const computeUnread = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const deviceId = await AsyncStorage.getItem("activeDevice");
      if (!deviceId) {
        setUnreadCount(0);
        return;
      }

      // ✅ readMap ของ device นี้ (นับ unread ให้ตรงกับสีฟ้าใน NotificationScreen)
      const readKey = `notification_read_${deviceId}`;
      const readRaw = await AsyncStorage.getItem(readKey);
      const readMap: Record<string, boolean> = readRaw ? JSON.parse(readRaw) : {};

      // เคลียร์ sub เก่า
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }

      const ref = dbRef(rtdb, `devices/${deviceId}/alerts`);
      const unsub = onValue(ref, (snap) => {
        const v = snap.val() || {};
        let count = 0;

        Object.keys(v).forEach((key) => {
          const a: any = v[key];
          const type = (a?.type || "").toString().toLowerCase();
          if (type !== "exit" && type !== "enter") return;

          // ✅ ถ้ายังไม่เคย mark read => นับ
          if (!readMap[key]) count += 1;
        });

        setUnreadCount(count);
      });

      unsubRef.current = () => unsub();
    } catch {
      // เงียบไว้
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // ✅ ฟัง event จาก NotificationScreen แล้วอัปเดต badge ทันที
  useEffect(() => {
    const subSeen = DeviceEventEmitter.addListener("notifications:seen", async ({ deviceId }: any) => {
      // optional: ถ้าต้องการ "เข้า tab แล้วถือว่าอ่านหมด" ให้เคลียร์ unreadMap ด้วย
      // แต่ส่วนใหญ่เราไม่ลบ readMap แค่ให้ NotificationScreen mark ตามรายการ
      await computeUnread();
    });

    const subMapUpdated = DeviceEventEmitter.addListener("notifications:readmap_updated", async () => {
      await computeUnread();
    });

    return () => {
      subSeen.remove();
      subMapUpdated.remove();
    };
  }, [computeUnread]);

  // ✅ เวลา tab focus ให้คำนวณ + subscribe ใหม่
  useFocusEffect(
    useCallback(() => {
      computeUnread();
      return () => {
        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }
      };
    }, [computeUnread])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
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
          tabBarIcon: ({ color }) => <FontAwesome6 name="house" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="devices"
        options={{
          title: "อุปกรณ์",
          tabBarIcon: ({ color }) => <MaterialIcons name="devices" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="maps"
        options={{
          title: "แผนที่",
          tabBarIcon: ({ color }) => <FontAwesome5 name="map-marked-alt" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="notification"
        options={{
          title: "แจ้งเตือน",
          tabBarIcon: ({ color }) => <FontAwesome6 name="bell" size={24} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "บัญชีผู้ใช้",
          tabBarIcon: ({ color }) => <FontAwesome6 name="user-pen" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}