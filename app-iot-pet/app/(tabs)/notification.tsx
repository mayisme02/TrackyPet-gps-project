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
  ownerUid?: string | null; // ✅ เพิ่ม
};

type ListItem =
  | { kind: "section"; id: string; title: string }
  | { kind: "alert"; data: AlertItem };

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

/* ================= USER-SCOPED STORAGE ================= */
const getKeys = (uid: string) => ({
  activeDeviceKey: `activeDevice_${uid}`,
  notifLastDeviceKey: `notifications_device_last_v1_${uid}`,
  notifCachePrefix: `notifications_cache_${uid}_`,
  lastReadPrefix: `notification_last_read_${uid}_`,
  readMapPrefix: `notification_read_${uid}_`,
});

export default function NotificationScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  const [nowTick, setNowTick] = useState(() => Date.now());
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  const storage = useMemo(() => {
    if (!uid) return null;
    return getKeys(uid);
  }, [uid]);

  const readKey = useMemo(() => {
    if (!deviceId || !storage) return null;
    return `${storage.readMapPrefix}${deviceId}`;
  }, [deviceId, storage]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // sync uid เมื่อมีการ login/logout
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUid(user?.uid ?? null);
      if (!user) {
        setDeviceId(null);
        setAlerts([]);
        setReadMap({});
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // ✅ helper: ตรวจว่า device เป็นของ user นี้จริงไหม
  const validateDeviceOwnership = useCallback(
    async (currentUid: string, targetDeviceId: string) => {
      try {
        // เปลี่ยน path นี้ให้ตรงกับโครงสร้างจริงของโปรเจคคุณ
        // สมมติว่าเก็บ device ของแต่ละ user ไว้ที่ users/{uid}/devices/{deviceId}
        const deviceRef = doc(db, "users", currentUid, "devices", targetDeviceId);
        const snap = await getDoc(deviceRef);
        return snap.exists();
      } catch {
        return false;
      }
    },
    []
  );

  /* ================= LOAD DEVICE (active -> last) ================= */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const currentUid = auth.currentUser?.uid;
        if (!currentUid || !mounted) {
          setLoading(false);
          return;
        }

        const keys = getKeys(currentUid);
        const active = await AsyncStorage.getItem(keys.activeDeviceKey);
        const last = await AsyncStorage.getItem(keys.notifLastDeviceKey);

        let useId = active || last || null;

        // ✅ ถ้ามี device ให้เช็ค ownership ก่อน
        if (useId) {
          const isOwner = await validateDeviceOwnership(currentUid, useId);
          if (!isOwner) {
            useId = null;
            await AsyncStorage.multiRemove([
              keys.activeDeviceKey,
              keys.notifLastDeviceKey,
            ]);
          }
        }

        if (!mounted) return;
        setUid(currentUid);
        setDeviceId(useId);

        if (useId) {
          await AsyncStorage.setItem(keys.notifLastDeviceKey, useId);

          try {
            const cached = await AsyncStorage.getItem(
              `${keys.notifCachePrefix}${useId}`
            );
            if (cached && mounted) setAlerts(JSON.parse(cached));
          } catch {}
        } else {
          setAlerts([]);
        }
      } finally {
      }
    })();

    return () => {
      mounted = false;
    };
  }, [validateDeviceOwnership]);

  /* ================= LISTEN ACTIVE DEVICE CHANGES ================= */
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "activeDeviceChanged",
      async (payload?: { code?: string | null }) => {
        const currentUid = auth.currentUser?.uid;
        if (!currentUid) {
          setDeviceId(null);
          setAlerts([]);
          return;
        }

        const keys = getKeys(currentUid);
        let nextCode =
          payload?.code ?? (await AsyncStorage.getItem(keys.activeDeviceKey));

        if (nextCode) {
          const isOwner = await validateDeviceOwnership(currentUid, nextCode);
          if (!isOwner) {
            nextCode = null;
            await AsyncStorage.removeItem(keys.activeDeviceKey);
          }
        }

        if (nextCode) {
          setDeviceId(nextCode);
          await AsyncStorage.setItem(keys.notifLastDeviceKey, nextCode);

          try {
            const cached = await AsyncStorage.getItem(
              `${keys.notifCachePrefix}${nextCode}`
            );
            if (cached) setAlerts(JSON.parse(cached));
          } catch {}

          return;
        }

        const last = await AsyncStorage.getItem(keys.notifLastDeviceKey);

        if (last) {
          const isOwner = await validateDeviceOwnership(currentUid, last);
          if (isOwner) {
            setDeviceId(last);
            try {
              const cached = await AsyncStorage.getItem(
                `${keys.notifCachePrefix}${last}`
              );
              if (cached) setAlerts(JSON.parse(cached));
            } catch {}
            return;
          }
        }

        setDeviceId(null);
        setAlerts([]);
      }
    );

    return () => sub.remove();
  }, [validateDeviceOwnership]);

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

  /* ================= MARK SCREEN SEEN ================= */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const currentUid = auth.currentUser?.uid;
        if (!currentUid) return;

        const keys = getKeys(currentUid);

        const active =
          deviceId ||
          (await AsyncStorage.getItem(keys.activeDeviceKey)) ||
          (await AsyncStorage.getItem(keys.notifLastDeviceKey));

        if (!active) return;

        const now = Date.now();
        await AsyncStorage.setItem(`${keys.lastReadPrefix}${active}`, String(now));
        DeviceEventEmitter.emit("notifications:seen", {
          deviceId: active,
          lastRead: now,
          uid: currentUid,
        });
      })();
    }, [deviceId])
  );

  /* ================= SUBSCRIBE ALERTS ================= */
  const subscribeAlerts = useCallback(async () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setDeviceId(null);
      setAlerts([]);
      setLoading(false);
      return () => {};
    }

    const keys = getKeys(currentUid);

    const active =
      deviceId ||
      (await AsyncStorage.getItem(keys.activeDeviceKey)) ||
      (await AsyncStorage.getItem(keys.notifLastDeviceKey));

    if (!active) {
      setDeviceId(null);
      setAlerts([]);
      setLoading(false);
      return () => {};
    }

    const isOwner = await validateDeviceOwnership(currentUid, active);
    if (!isOwner) {
      setDeviceId(null);
      setAlerts([]);
      setLoading(false);
      await AsyncStorage.multiRemove([keys.activeDeviceKey, keys.notifLastDeviceKey]);
      return () => {};
    }

    setDeviceId(active);
    setLoading(true);

    try {
      await AsyncStorage.setItem(keys.notifLastDeviceKey, active);
    } catch {}

    try {
      const cached = await AsyncStorage.getItem(`${keys.notifCachePrefix}${active}`);
      if (cached) setAlerts(JSON.parse(cached));
    } catch {}

    const ref = dbRef(rtdb, `devices/${active}/alerts`);
    const unsub = onValue(
      ref,
      async (snap) => {
        const v = snap.val() || {};
        const rows: AlertItem[] = Object.keys(v).map((k) => ({
          key: k,
          ...(v[k] || {}),
        }));

        const filtered = rows
          .filter((a) => {
            const t = (a.type || "").toString().toLowerCase();
            const typeOk = t === "exit" || t === "enter";

            // ✅ ถ้ามี ownerUid ให้ต้องตรงกับ user ปัจจุบัน
            const ownerOk = !a.ownerUid || a.ownerUid === currentUid;

            return typeOk && ownerOk;
          })
          .sort((a, b) => {
            const ta = a.atUtc ? Date.parse(a.atUtc) : 0;
            const tb = b.atUtc ? Date.parse(b.atUtc) : 0;
            return tb - ta;
          });

        setAlerts(filtered);
        setLoading(false);

        try {
          await AsyncStorage.setItem(
            `${keys.notifCachePrefix}${active}`,
            JSON.stringify(filtered)
          );
        } catch {}
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [deviceId, validateDeviceOwnership]);

  useFocusEffect(
    useCallback(() => {
      let off: any;
      subscribeAlerts().then((u) => (off = u));
      return () => off && off();
    }, [subscribeAlerts])
  );

  /* ================= DELETE ONE ================= */
  const deleteOne = useCallback(
    (a: AlertItem) => {
      if (!deviceId || !uid) return;

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
              DeviceEventEmitter.emit("notifications:readmap_updated", {
                deviceId,
                uid,
              });
            }
          },
        },
      ]);
    },
    [deviceId, readKey, readMap, uid]
  );

  /* ================= CLICK ================= */
  const openAlert = useCallback(
    async (a: AlertItem) => {
      if (!a.key) return;
      if (openingKey) return;
      setOpeningKey(a.key);

      try {
        if (readKey) {
          const next = { ...readMap, [a.key]: true };
          setReadMap(next);
          await AsyncStorage.setItem(readKey, JSON.stringify(next));
          DeviceEventEmitter.emit("notifications:readmap_updated", { deviceId, uid });
        }

        if (!a.routeId) {
          Alert.alert("ไม่มีข้อมูลเส้นทาง", "รายการนี้ไม่มีข้อมูลเส้นทาง หรือถูกลบไปแล้ว");
          return;
        }

        if (!auth.currentUser) {
          Alert.alert("ยังไม่ได้เข้าสู่ระบบ", "กรุณาเข้าสู่ระบบก่อนเพื่อดูข้อมูลเส้นทาง");
          return;
        }

        const currentUid = auth.currentUser.uid;
        const rref = doc(db, "users", currentUid, "routeHistories", a.routeId);
        const rsnap = await getDoc(rref);

        if (!rsnap.exists()) {
          Alert.alert("ไม่พบข้อมูลเส้นทาง", "ข้อมูลเส้นทางนี้อาจถูกลบไปแล้ว");
          return;
        }

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
    [openingKey, readKey, readMap, deviceId, router, uid]
  );

  /* ================= BUILD LIST ================= */
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