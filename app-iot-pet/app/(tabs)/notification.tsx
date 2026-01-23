import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rtdb, auth, db } from "../../firebase/firebase";
import { ref as dbRef, onValue, remove } from "firebase/database";
import { doc, onSnapshot } from "firebase/firestore";

/* ================= TYPES ================= */
type AlertItem = {
  key?: string;
  type: "exit" | "enter";
  atTh?: string;
  atUtc?: string;
};

type MatchedPet = {
  petName: string;
  photoURL?: string | null;
};

type ListItem =
  | { kind: "section"; title: string }
  | { kind: "alert"; data: AlertItem };

export default function NotificationScreen() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pet, setPet] = useState<MatchedPet | null>(null);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  /* ================= LOAD MATCHED PET ================= */
  useEffect(() => {
    if (!auth.currentUser || !deviceId) {
      setPet(null);
      return;
    }

    return onSnapshot(
      doc(db, "users", auth.currentUser.uid, "deviceMatches", deviceId),
      (snap) => {
        if (!snap.exists()) {
          setPet(null);
          return;
        }
        const d = snap.data();
        setPet({
          petName: d.petName,
          photoURL: d.photoURL ?? null,
        });
      }
    );
  }, [deviceId]);

  /* ================= LOAD READ MAP ================= */
  useEffect(() => {
    if (!deviceId) return;

    AsyncStorage.getItem(`notification_read_${deviceId}`).then((v) =>
      setReadMap(v ? JSON.parse(v) : {})
    );
  }, [deviceId]);

  /* ================= LOAD ALERTS ================= */
  const load = useCallback(async () => {
    const active = await AsyncStorage.getItem("activeDevice");
    if (!active) {
      setAlerts([]);
      setLoading(false);
      return () => {};
    }

    setDeviceId(active);
    const ref = dbRef(rtdb, `devices/${active}/alerts`);

    return onValue(ref, (snap) => {
      const v = snap.val() || {};
      const rows: AlertItem[] = Object.keys(v).map((k) => ({
        key: k,
        ...v[k],
      }));

      rows.sort((a, b) => {
        const ta = a.atUtc ? Date.parse(a.atUtc) : 0;
        const tb = b.atUtc ? Date.parse(b.atUtc) : 0;
        return tb - ta;
      });

      // กรองไม่ให้ซ้ำ type ติดกัน
      const filtered: AlertItem[] = [];
      for (const a of rows) {
        const last = filtered[filtered.length - 1];
        if (!last || last.type !== a.type) filtered.push(a);
      }

      setAlerts(filtered);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let off: any;
      load().then((u) => (off = u));
      return () => off && off();
    }, [load])
  );

  /* =====================================================
     ✅ FIX หลัก: MARK ALL AS READ (TIMESTAMP)
     → ทำให้ badge หายทันทีเมื่อเข้าแท็บแจ้งเตือน
  ===================================================== */
  useFocusEffect(
    useCallback(() => {
      if (!deviceId) return;

      const now = Date.now();
      AsyncStorage.setItem(
        `notification_last_read_${deviceId}`,
        String(now)
      );
    }, [deviceId])
  );

  /* ================= MARK ALL AS READ (KEY MAP) ================= */
  useFocusEffect(
    useCallback(() => {
      if (!deviceId || alerts.length === 0) return;

      const updated: Record<string, boolean> = { ...readMap };
      alerts.forEach((a) => {
        if (a.key) updated[a.key] = true;
      });

      setReadMap(updated);
      AsyncStorage.setItem(
        `notification_read_${deviceId}`,
        JSON.stringify(updated)
      );
    }, [deviceId, alerts])
  );

  /* ================= CLEAR ================= */
  const clearAll = () => {
    if (!deviceId || alerts.length === 0) return;

    Alert.alert("ลบการแจ้งเตือนทั้งหมด?", "คุณต้องการลบทั้งหมดหรือไม่", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบทั้งหมด",
        style: "destructive",
        onPress: async () => {
          await Promise.all(
            alerts.map((a) =>
              remove(
                dbRef(rtdb, `devices/${deviceId}/alerts/${a.key}`)
              ).catch(() => null)
            )
          );
        },
      },
    ]);
  };

  /* ================= BUILD LIST ================= */
  const listData: ListItem[] = useMemo(() => {
    if (!alerts.length) return [];

    const unread = alerts.filter((a) => !readMap[a.key!]);
    const read = alerts.filter((a) => readMap[a.key!]);

    const out: ListItem[] = [];
    if (unread.length) {
      out.push({ kind: "section", title: "ล่าสุด" });
      unread.forEach((a) => out.push({ kind: "alert", data: a }));
    }
    if (read.length) {
      out.push({ kind: "section", title: "ก่อนหน้านี้" });
      read.forEach((a) => out.push({ kind: "alert", data: a }));
    }
    return out;
  }, [alerts, readMap]);

  /* ================= RENDER ================= */
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "section") {
      return <Text style={styles.sectionTitle}>{item.title}</Text>;
    }

    const alert = item.data;
    const isExit = alert.type === "exit";
    const petName = pet?.petName ?? "สัตว์เลี้ยง";

    return (
      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          {pet?.photoURL ? (
            <Image source={{ uri: pet.photoURL }} style={styles.avatar} />
          ) : (
            <MaterialIcons name="pets" size={22} color="#7A4A00" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: isExit ? "#b00020" : "#2e7d32" },
            ]}
          >
            {petName}
            {isExit ? " ออกนอกพื้นที่" : " กลับเข้าพื้นที่"}
          </Text>
          <Text style={styles.time}>
            {alert.atTh || alert.atUtc}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
          <TouchableOpacity
            style={styles.headerRight}
            onPress={clearAll}
          >
            <Ionicons name="trash-outline" size={24} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, i) =>
            item.kind === "section"
              ? `section-${i}`
              : item.data.key!
          }
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.empty}>ยังไม่มีการแจ้งเตือน</Text>
          }
        />
      )}
    </>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#f2bb14" },
  header: {
    height: 56,
    backgroundColor: "#f2bb14",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerRight: { position: "absolute", right: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginVertical: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 80,
    fontSize: 16,
    color: "#666",
  },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F1F1",
    backgroundColor: "#fff",
    marginBottom: 6,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 26,
    backgroundColor: "#F5E6C8",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 50, height: 50, borderRadius: 26 },
  title: { fontSize: 16, fontWeight: "700" },
  time: { fontSize: 12, color: "#777", marginTop: 6 },
});