import { Tabs, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, DeviceEventEmitter } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../firebase/firebase";
import { Colors } from "@/assets/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import * as Notifications from "expo-notifications";
import { onAuthStateChanged } from "firebase/auth";
import { savePushTokenToFirestore } from "@/utils/pushNotifications";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getReadMapKey = (uid: string) => `notification_read_firestore_${uid}`;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const unsubRef = useRef<null | (() => void)>(null);

  const computeUnread = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const uid = user.uid;

    try {
      const readRaw = await AsyncStorage.getItem(getReadMapKey(uid));
      const readMap: Record<string, boolean> = readRaw ? JSON.parse(readRaw) : {};

      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }

      const q = query(
        collection(db, "users", uid, "alerts"),
        orderBy("atMs", "desc")
      );

      const unsub = onSnapshot(q, (snap) => {
        let count = 0;

        snap.forEach((docSnap) => {
          const a = docSnap.data() as any;
          const id = docSnap.id;
          const type = (a?.type || "").toString().toLowerCase();

          if (type !== "exit" && type !== "enter") return;
          if (!readMap[id]) count += 1;
        });

        setUnreadCount(count);
      });

      unsubRef.current = () => unsub();
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await savePushTokenToFirestore();
        await computeUnread();
      } else {
        setUnreadCount(0);
      }
    });

    return unsub;
  }, [computeUnread]);

  useEffect(() => {
    const subMapUpdated = DeviceEventEmitter.addListener(
      "notifications:readmap_updated",
      async () => {
        await computeUnread();
      }
    );

    return () => {
      subMapUpdated.remove();
    };
  }, [computeUnread]);

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

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        routeId?: string;
      };

      if (data?.routeId) {
        router.push({
          pathname: "/RouteHistory",
          params: { routeId: data.routeId },
        });
      } else {
        router.push("/(tabs)/notification");
      }
    });

    return () => sub.remove();
  }, [router]);

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