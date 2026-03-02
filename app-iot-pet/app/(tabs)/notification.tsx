import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rtdb, auth, db } from "../../firebase/firebase";
import { ref as dbRef, onValue, remove } from "firebase/database";
import { doc, onSnapshot } from "firebase/firestore";
import ProfileHeader from "@/components/ProfileHeader";
import { useFocusEffect } from "@react-navigation/native";

/* ================= TYPES ================= */
type AlertItem = {
  key?: string;
  type: "exit" | "enter";
  atTh?: string;
  atUtc?: string;
  message?: string;
  device?: string;
  radiusKm?: number;
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

  /* ================= LOAD ACTIVE DEVICE (ทันที) ================= */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const active = await AsyncStorage.getItem("activeDevice");
      if (!mounted) return;
      setDeviceId(active || null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ================= LOAD MATCHED PET ================= */
  useEffect(() => {
    if (!auth.currentUser || !deviceId) {
      setPet(null);
      return;
    }

    return onSnapshot(
      doc(db, "users", auth.currentUser.uid, "deviceMatches", deviceId),
      (snap) => {
        if (!snap.exists()) return setPet(null);
        const d: any = snap.data();
        setPet({ petName: d.petName, photoURL: d.photoURL ?? null });
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

  /* ================= SUBSCRIBE ALERTS (FOCUS) ================= */
  const subscribeAlerts = useCallback(async () => {
    const active = await AsyncStorage.getItem("activeDevice");
    if (!active) {
      setDeviceId(null);
      setAlerts([]);
      setLoading(false);
      return () => {};
    }

    setDeviceId(active);
    setLoading(true);

    const ref = dbRef(rtdb, `devices/${active}/alerts`);

    const unsubscribe = onValue(
      ref,
      (snap) => {
        const v = snap.val() || {};
        const rows: AlertItem[] = Object.keys(v).map((k) => ({
          key: k,
          ...(v[k] || {}),
        }));

        rows.sort((a, b) => {
          const ta = a.atUtc ? Date.parse(a.atUtc) : 0;
          const tb = b.atUtc ? Date.parse(b.atUtc) : 0;
          return tb - ta;
        });

        // ✅ แสดงเฉพาะ "ออกนอกพื้นที่" เท่านั้น
        const onlyExit = rows.filter((a) => (a.type || "").toString().toLowerCase() === "exit");

        setAlerts(onlyExit);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let off: any;
      subscribeAlerts().then((u) => (off = u));
      return () => off && off();
    }, [subscribeAlerts])
  );

  /* ================= MARK LAST READ (FOCUS) ================= */
  useFocusEffect(
    useCallback(() => {
      if (!deviceId) return;
      AsyncStorage.setItem(`notification_last_read_${deviceId}`, String(Date.now()));
    }, [deviceId])
  );

  /* ================= MARK VISIBLE ALERTS AS READ ================= */
  useFocusEffect(
    useCallback(() => {
      if (!deviceId || alerts.length === 0) return;

      const updated = { ...readMap };
      alerts.forEach((a) => {
        if (a.key) updated[a.key] = true;
      });

      setReadMap(updated);
      AsyncStorage.setItem(`notification_read_${deviceId}`, JSON.stringify(updated));
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
              a.key
                ? remove(dbRef(rtdb, `devices/${deviceId}/alerts/${a.key}`)).catch(() => null)
                : Promise.resolve()
            )
          );
        },
      },
    ]);
  };

  /* ================= BUILD LIST ================= */
  const listData: ListItem[] = useMemo(() => {
    if (!alerts.length) return [];

    const unread = alerts.filter((a) => a.key && !readMap[a.key]);
    const read = alerts.filter((a) => a.key && readMap[a.key]);

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

    const a = item.data;
    const petName = pet?.petName ?? "สัตว์เลี้ยง";
    const title = a.message || `${petName} ออกนอกพื้นที่`;
    const timeLabel = a.atTh || a.atUtc || "";

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
          <Text style={[styles.title, { color: "#b00020" }]}>{title}</Text>
          {!!timeLabel && <Text style={styles.time}>{timeLabel}</Text>}
        </View>
      </View>
    );
  };

  return (
    <>
      <ProfileHeader
        title="การแจ้งเตือน"
        right={
          <TouchableOpacity onPress={clearAll}>
            <Ionicons name="trash-outline" size={22} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, i) =>
            item.kind === "section" ? `section-${i}` : item.data.key || `alert-${i}`
          }
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีการแจ้งเตือน</Text>}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginVertical: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 80,
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "700",
  },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
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
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 26 
  },
  title: { 
    fontSize: 16, 
    fontWeight: "700" 
  },
  time: { 
    fontSize: 12, 
    color: "#777", 
    marginTop: 6 
  },
});