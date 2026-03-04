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
  DeviceEventEmitter,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rtdb, auth, db } from "../../firebase/firebase";
import { ref as dbRef, onValue, remove } from "firebase/database";
import ProfileHeader from "@/components/ProfileHeader";
import { useFocusEffect, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";

/* ================= TYPES ================= */
type AlertItem = {
  key: string;
  type: "exit" | "enter" | string;
  atTh?: string;
  atUtc?: string;
  message?: string;
  device?: string;
  radiusKm?: number;

  petId?: string | null;
  petName?: string | null;
  photoURL?: string | null;

  routeId?: string | null;
};

type ListItem =
  | { kind: "section"; id: string; title: string }
  | { kind: "alert"; data: AlertItem };

/* ================= STORAGE KEYS ================= */
const NOTIF_LAST_DEVICE_KEY = "notifications_device_last_v1";
const NOTIF_CACHE_PREFIX = "notifications_cache_";

/* ================= HELPERS ================= */
const cleanMessage = (msg?: string) => {
  if (!msg) return "";
  return msg.replace(/\s*\(\s*\d+\s*ม\.?\s*\)\s*$/g, "").trim();
};

const applyPetNameToMessage = (msg: string, petName?: string | null) => {
  const name = petName?.trim() ? petName.trim() : "";
  if (!name) return msg;
  return msg.replace(/^สัตว์เลี้ยง/, name);
};

const toDateHeaderTH = (iso?: string) => {
  if (!iso) return "ไม่ทราบวันที่";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "ไม่ทราบวันที่";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const timeAgoTH = (iso?: string, nowMs?: number) => {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";

  const now = nowMs ?? Date.now();
  let diffSec = Math.floor((now - t) / 1000);
  if (diffSec < 0) diffSec = 0;

  if (diffSec < 60) return "เมื่อสักครู่";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} วันที่แล้ว`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo} เดือนที่แล้ว`;
  const diffYr = Math.floor(diffMo / 12);
  return `${diffYr} ปีที่แล้ว`;
};

export default function NotificationScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // tick ให้ timeago อัปเดต realtime
  const [nowTick, setNowTick] = useState(() => Date.now());

  // readMap ต่อ device
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  // กันกดซ้ำตอนกำลังเช็ค/นำทาง
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  const readKey = useMemo(() => {
    if (!deviceId) return null;
    return `notification_read_${deviceId}`;
  }, [deviceId]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  /* ================= LOAD DEVICE (active -> last) ================= */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const active = await AsyncStorage.getItem("activeDevice");
        const last = await AsyncStorage.getItem(NOTIF_LAST_DEVICE_KEY);

        const useId = active || last || null;
        if (!mounted) return;

        setDeviceId(useId);

        if (useId) {
          await AsyncStorage.setItem(NOTIF_LAST_DEVICE_KEY, useId);
          // ✅ preload cache (เร็วขึ้น/กันวูบ)
          try {
            const cached = await AsyncStorage.getItem(`${NOTIF_CACHE_PREFIX}${useId}`);
            if (cached && mounted) setAlerts(JSON.parse(cached));
          } catch {}
        }
      } finally {
        // ไม่ setLoading(false) ตรงนี้ เพราะยังรอ subscribeAlerts อยู่
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ================= LISTEN ACTIVE DEVICE CHANGES ================= */
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "activeDeviceChanged",
      async (payload?: { code?: string | null }) => {
        const nextCode =
          payload?.code ?? (await AsyncStorage.getItem("activeDevice"));

        // ถ้ามี active ใหม่ -> ใช้ตัวใหม่ และจำเป็น last
        if (nextCode) {
          setDeviceId(nextCode);
          await AsyncStorage.setItem(NOTIF_LAST_DEVICE_KEY, nextCode);

          // preload cache
          try {
            const cached = await AsyncStorage.getItem(`${NOTIF_CACHE_PREFIX}${nextCode}`);
            if (cached) setAlerts(JSON.parse(cached));
          } catch {}

          return;
        }

        // ถ้าโดนลบ activeDevice (disconnect) -> ใช้ last ต่อไป (ห้าม set null แล้วล้าง)
        const last = await AsyncStorage.getItem(NOTIF_LAST_DEVICE_KEY);
        setDeviceId(last || null);

        if (last) {
          try {
            const cached = await AsyncStorage.getItem(`${NOTIF_CACHE_PREFIX}${last}`);
            if (cached) setAlerts(JSON.parse(cached));
          } catch {}
        }
      }
    );

    return () => sub.remove();
  }, []);

  /* ================= LOAD READ MAP ================= */
  useEffect(() => {
    if (!readKey) {
      setReadMap({});
      return;
    }
    let mounted = true;
    (async () => {
      const raw = await AsyncStorage.getItem(readKey);
      if (!mounted) return;
      setReadMap(raw ? JSON.parse(raw) : {});
    })();
    return () => {
      mounted = false;
    };
  }, [readKey]);

  /* ================= MARK SCREEN SEEN (เคลียร์ badge ฝั่ง TabLayout) ================= */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const active =
          deviceId ||
          (await AsyncStorage.getItem("activeDevice")) ||
          (await AsyncStorage.getItem(NOTIF_LAST_DEVICE_KEY));

        if (!active) return;

        const now = Date.now();
        await AsyncStorage.setItem(`notification_last_read_${active}`, String(now));
        DeviceEventEmitter.emit("notifications:seen", { deviceId: active, lastRead: now });
      })();
    }, [deviceId])
  );

  /* ================= SUBSCRIBE ALERTS (use deviceId/last, not only activeDevice) ================= */
  const subscribeAlerts = useCallback(async () => {
    const active =
      deviceId ||
      (await AsyncStorage.getItem("activeDevice")) ||
      (await AsyncStorage.getItem(NOTIF_LAST_DEVICE_KEY));

    // ไม่มีทั้ง active และ last -> ไม่มีอะไรให้โชว์
    if (!active) {
      setDeviceId(null);
      setAlerts([]);
      setLoading(false);
      return () => {};
    }

    setDeviceId(active);
    setLoading(true);

    // จำเป็น last เสมอ เพื่อให้ disconnect แล้วยังอยู่
    try {
      await AsyncStorage.setItem(NOTIF_LAST_DEVICE_KEY, active);
    } catch {}

    // preload cache ก่อน subscribe (กันหน้าว่าง)
    try {
      const cached = await AsyncStorage.getItem(`${NOTIF_CACHE_PREFIX}${active}`);
      if (cached) setAlerts(JSON.parse(cached));
    } catch {}

    const ref = dbRef(rtdb, `devices/${active}/alerts`);
    const unsub = onValue(
      ref,
      async (snap) => {
        const v = snap.val() || {};
        const rows: AlertItem[] = Object.keys(v).map((k) => ({ key: k, ...(v[k] || {}) }));

        const filtered = rows
          .filter((a) => {
            const t = (a.type || "").toString().toLowerCase();
            return t === "exit" || t === "enter";
          })
          .sort((a, b) => {
            const ta = a.atUtc ? Date.parse(a.atUtc) : 0;
            const tb = b.atUtc ? Date.parse(b.atUtc) : 0;
            return tb - ta;
          });

        setAlerts(filtered);
        setLoading(false);

        // cache ไว้เผื่อ activeDevice ถูกลบ/ออฟไลน์
        try {
          await AsyncStorage.setItem(`${NOTIF_CACHE_PREFIX}${active}`, JSON.stringify(filtered));
        } catch {}
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [deviceId]);

  useFocusEffect(
    useCallback(() => {
      let off: any;
      subscribeAlerts().then((u) => (off = u));
      return () => off && off();
    }, [subscribeAlerts])
  );

  /* ================= DELETE ONE (LONG PRESS) ================= */
  const deleteOne = useCallback(
    (a: AlertItem) => {
      if (!deviceId) return;

      Alert.alert("ลบการแจ้งเตือน?", "ต้องการลบรายการนี้หรือไม่", [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              await remove(dbRef(rtdb, `devices/${deviceId}/alerts/${a.key}`));
            } catch {}

            if (readKey) {
              const next = { ...readMap };
              delete next[a.key];
              setReadMap(next);
              await AsyncStorage.setItem(readKey, JSON.stringify(next));
              DeviceEventEmitter.emit("notifications:readmap_updated", { deviceId });
            }
          },
        },
      ]);
    },
    [deviceId, readKey, readMap]
  );

  /* ================= CLICK: MARK READ + GO (WITH VALIDATION) ================= */
  const openAlert = useCallback(
    async (a: AlertItem) => {
      if (!a.key) return;
      if (openingKey) return; // กันกดซ้ำ
      setOpeningKey(a.key);

      try {
        // 1) mark read
        if (readKey) {
          const next = { ...readMap, [a.key]: true };
          setReadMap(next);
          await AsyncStorage.setItem(readKey, JSON.stringify(next));
          DeviceEventEmitter.emit("notifications:readmap_updated", { deviceId });
        }

        // 2) ต้องมี routeId ถึงจะไป RouteHistory ได้
        if (!a.routeId) {
          Alert.alert("ไม่มีข้อมูลเส้นทาง", "รายการนี้ไม่มีข้อมูลเส้นทาง หรือถูกลบไปแล้ว");
          return;
        }

        // 3) เช็คว่าเอกสาร routeHistories ยังมีอยู่ไหม
        if (!auth.currentUser) {
          Alert.alert("ยังไม่ได้เข้าสู่ระบบ", "กรุณาเข้าสู่ระบบก่อนเพื่อดูข้อมูลเส้นทาง");
          return;
        }

        const uid = auth.currentUser.uid;
        const rref = doc(db, "users", uid, "routeHistories", a.routeId);
        const rsnap = await getDoc(rref);

        if (!rsnap.exists()) {
          Alert.alert("ไม่พบข้อมูลเส้นทาง", "ข้อมูลเส้นทางนี้อาจถูกลบไปแล้ว");
          return;
        }

        // 4) มีจริง -> ไปหน้า RouteHistory
        router.push({
          pathname: "/RouteHistory",
          params: { routeId: a.routeId },
        });
      } catch {
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเปิดข้อมูลเส้นทางได้ในขณะนี้");
      } finally {
        setOpeningKey(null);
      }
    },
    [openingKey, readKey, readMap, deviceId, router]
  );

  /* ================= BUILD LIST: GROUP BY DATE ================= */
  const listData: ListItem[] = useMemo(() => {
    if (!alerts.length) return [];
    const out: ListItem[] = [];
    let lastHeader = "";

    for (const a of alerts) {
      const header = toDateHeaderTH(a.atUtc);
      if (header !== lastHeader) {
        lastHeader = header;
        out.push({ kind: "section", id: `section-${header}`, title: header });
      }
      out.push({ kind: "alert", data: a });
    }

    return out;
  }, [alerts]);

  /* ================= RENDER ================= */
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "section") return <Text style={styles.sectionTitle}>{item.title}</Text>;

    const a = item.data;
    const t = (a.type || "").toString().toLowerCase();
    const isExit = t === "exit";

    const petName = a.petName?.trim() ? a.petName.trim() : "สัตว์เลี้ยง";
    const rawTitle =
      cleanMessage(a.message) || (isExit ? `${petName} ออกนอกพื้นที่` : `${petName} กลับเข้าพื้นที่`);
    const title = applyPetNameToMessage(rawTitle, a.petName);

    const ago = timeAgoTH(a.atUtc, nowTick);
    const isUnread = !readMap[a.key];
    const isOpening = openingKey === a.key;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openAlert(a)}
        onLongPress={() => deleteOne(a)}
        disabled={isOpening}
      >
        <View style={[styles.cardFull, isUnread && styles.unreadBg, isOpening && styles.disabledCard]}>
          <View style={styles.left}>
            <View style={styles.avatarWrap}>
              {a.photoURL ? (
                <Image source={{ uri: a.photoURL }} style={styles.avatar} />
              ) : (
                <MaterialIcons name="pets" size={22} color="#7A4A00" />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: isExit ? "#b00020" : "#0F7A2E" }]}>{title}</Text>
              {!!ago && <Text style={styles.timeAgo}>{ago}</Text>}
              {isOpening && <Text style={styles.openingText}>กำลังเปิด...</Text>}
            </View>
          </View>

          <Ionicons
            name={isExit ? "warning-outline" : "checkmark-circle-outline"}
            size={20}
            color={isExit ? "#b00020" : "#0F7A2E"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <ProfileHeader title="การแจ้งเตือน" />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, i) => (item.kind === "section" ? item.id : item.data.key || `a-${i}`)}
          contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 10 }}
          ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีการแจ้งเตือน</Text>}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 8,
    color: "#111827",
    paddingHorizontal: 16,
  },
  empty: {
    textAlign: "center",
    marginTop: 80,
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "700",
  },
  cardFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  unreadBg: {
    backgroundColor: "#E8F8FF",
  },
  disabledCard: {
    opacity: 0.7,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F5E6C8",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  timeAgo: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    fontWeight: "700",
  },
  openingText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
});