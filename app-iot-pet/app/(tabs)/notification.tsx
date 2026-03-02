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
  petId?: string | null;
  // จุดเริ่ม session (เวลาที่ match นี้ถูกอัปเดตล่าสุด)
  sessionStartMs?: number; // derived from updatedAt
};

type ListItem =
  | { kind: "section"; id: "section-latest" | "section-old"; title: string }
  | { kind: "alert"; data: AlertItem };

export default function NotificationScreen() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const [pet, setPet] = useState<MatchedPet | null>(null);
  const [sessionStartMs, setSessionStartMs] = useState<number>(0);

  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  /* ================= STORAGE KEYS (แยกตาม session) ================= */
  const readKey = useMemo(() => {
    if (!deviceId) return null;
    return `notification_read_${deviceId}_${sessionStartMs || 0}`;
  }, [deviceId, sessionStartMs]);

  const lastReadKey = useMemo(() => {
    if (!deviceId) return null;
    return `notification_last_read_${deviceId}_${sessionStartMs || 0}`;
  }, [deviceId, sessionStartMs]);

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

  /* ================= LOAD MATCHED PET (และสร้าง sessionStartMs) ================= */
  useEffect(() => {
    if (!auth.currentUser || !deviceId) {
      setPet(null);
      setSessionStartMs(0);
      return;
    }

    return onSnapshot(
      doc(db, "users", auth.currentUser.uid, "deviceMatches", deviceId),
      (snap) => {
        if (!snap.exists()) {
          setPet(null);
          setSessionStartMs(0);
          return;
        }

        const d: any = snap.data();

        // ✅ ใช้ updatedAt เป็นจุดเริ่ม session
        const ms =
          typeof d?.updatedAt?.toMillis === "function"
            ? (d.updatedAt.toMillis() as number)
            : 0;

        setPet({
          petName: d.petName,
          photoURL: d.photoURL ?? null,
          petId: d.petId ?? null,
          sessionStartMs: ms,
        });

        setSessionStartMs(ms || 0);
      }
    );
  }, [deviceId]);

  /* ================= LOAD READ MAP (ตาม session) ================= */
  useEffect(() => {
    if (!readKey) {
      setReadMap({});
      return;
    }

    let mounted = true;
    AsyncStorage.getItem(readKey).then((v) => {
      if (!mounted) return;
      setReadMap(v ? JSON.parse(v) : {});
    });

    return () => {
      mounted = false;
    };
  }, [readKey]);

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

        // ✅ แสดงเฉพาะ "ออกนอกพื้นที่"
        const onlyExit = rows.filter((a) => (a.type || "").toString().toLowerCase() === "exit");

        // ✅ “เพิ่มใหม่เท่านั้น”: กรองตาม sessionStartMs (เวลาที่เปลี่ยนสัตว์เลี้ยง/อัปเดต match)
        const filteredBySession =
          sessionStartMs > 0
            ? onlyExit.filter((a) => {
                const t = a.atUtc ? Date.parse(a.atUtc) : 0;
                return t >= sessionStartMs;
              })
            : onlyExit;

        setAlerts(filteredBySession);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [sessionStartMs]);

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
      if (!lastReadKey) return;
      AsyncStorage.setItem(lastReadKey, String(Date.now()));
    }, [lastReadKey])
  );

  /* ================= MARK VISIBLE ALERTS AS READ ================= */
  useFocusEffect(
    useCallback(() => {
      if (!readKey || alerts.length === 0) return;

      const updated = { ...readMap };
      alerts.forEach((a) => {
        if (a.key) updated[a.key] = true;
      });

      setReadMap(updated);
      AsyncStorage.setItem(readKey, JSON.stringify(updated));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readKey, alerts])
  );

  /* ================= CLEAR (ลบเฉพาะชุดที่แสดงใน session นี้) ================= */
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

          // เคลียร์ readMap ของ session นี้ด้วย
          if (readKey) {
            try {
              await AsyncStorage.removeItem(readKey);
            } catch {}
            setReadMap({});
          }
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
      out.push({ kind: "section", id: "section-latest", title: "ล่าสุด" });
      unread.forEach((a) => out.push({ kind: "alert", data: a }));
    }
    if (read.length) {
      out.push({ kind: "section", id: "section-old", title: "ก่อนหน้านี้" });
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
          keyExtractor={(item, i) => {
            if (item.kind === "section") return item.id; // ✅ stable key ไม่ทับกัน
            return item.data.key || `alert-${i}`;
          }}
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
    borderRadius: 26,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },
});