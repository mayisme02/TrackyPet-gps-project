import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  DeviceEventEmitter,
  View,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db, rtdb } from "../../firebase/firebase";
import ProfileHeader from "@/components/ProfileHeader";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  query,
  doc,
  getDoc,
} from "firebase/firestore";
import { onValue, ref, remove } from "firebase/database";
import { styles } from "@/assets/styles/notification.styles";

/* ================= TYPES ================= */
type AlertItem = {
  key: string;
  rawKey?: string;
  sourcePath?: "users" | "devices";
  type?: "exit" | "enter" | string;
  kind?: string;
  message?: string;

  atIso?: string;
  atMs?: number;
  atUtc?: string;
  atTh?: string;

  deviceCode?: string | null;
  radiusKm?: number;

  petId?: string | null;
  petName?: string | null;
  photoURL?: string | null;

  routeId?: string | null;
};

type PetInfo = {
  id: string;
  name?: string | null;
  photoURL?: string | null;
};

type ListItem =
  | { kind: "section"; id: string; title: string }
  | { kind: "alert"; data: AlertItem };

/* ================= HELPERS ================= */
const getAtIso = (a: AlertItem) => a.atIso || a.atUtc || "";

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

const getCanonicalAlertKey = (a: Partial<AlertItem>) => {
  return [
    (a.type || "").toString().toLowerCase(),
    a.routeId || "",
    a.petId || "",
    a.deviceCode || "",
    a.atMs || 0,
  ].join("|");
};

/* ================= STORAGE KEYS ================= */
const getReadMapKey = (uid: string) => `notification_read_rtdb_${uid}`;
const getActiveDeviceKey = (uid: string) => `activeDevice_${uid}`;

export default function NotificationScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  const [petsMap, setPetsMap] = useState<Record<string, PetInfo>>({});
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  const readKey = useMemo(() => {
    if (!uid) return null;
    return getReadMapKey(uid);
  }, [uid]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUid(user?.uid ?? null);

      if (!user) {
        setAlerts([]);
        setPetsMap({});
        setReadMap({});
        setActiveDeviceId(null);
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  /* ================= LOAD READ MAP ================= */
  useEffect(() => {
    if (!readKey) {
      setReadMap({});
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(readKey);
        if (!mounted) return;
        setReadMap(raw ? JSON.parse(raw) : {});
      } catch {
        if (!mounted) return;
        setReadMap({});
      }
    })();

    return () => {
      mounted = false;
    };
  }, [readKey]);

  /* ================= LOAD ACTIVE DEVICE ================= */
  useEffect(() => {
    if (!uid) {
      setActiveDeviceId(null);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const deviceId = await AsyncStorage.getItem(getActiveDeviceKey(uid));
        if (!mounted) return;
        setActiveDeviceId(deviceId || null);
      } catch {
        if (!mounted) return;
        setActiveDeviceId(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [uid]);

  /* ================= SUBSCRIBE PETS ================= */
  useEffect(() => {
    if (!uid) {
      setPetsMap({});
      return;
    }

    const q = query(collection(db, "users", uid, "pets"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Record<string, PetInfo> = {};

        snap.forEach((d) => {
          const data = d.data() as any;
          next[d.id] = {
            id: d.id,
            name: data.name ?? null,
            photoURL: data.photoURL ?? null,
          };
        });

        setPetsMap(next);
      },
      () => {
        setPetsMap({});
      }
    );

    return unsub;
  }, [uid]);

  /* ================= SUBSCRIBE ALERTS (USERS + DEVICE, DEDUPE) ================= */
  useEffect(() => {
    if (!uid) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const usersAlertsRef = ref(rtdb, `users/${uid}/alerts`);

    let usersAlerts: AlertItem[] = [];
    let deviceAlerts: AlertItem[] = [];

    const rebuild = () => {
      const mergedMap = new Map<string, AlertItem>();

      [...usersAlerts, ...deviceAlerts].forEach((a) => {
        const canonicalKey = getCanonicalAlertKey(a);
        const existing = mergedMap.get(canonicalKey);

        if (!existing) {
          mergedMap.set(canonicalKey, {
            ...a,
            key: canonicalKey,
          });
          return;
        }

        const existingScore = [
          existing.petName,
          existing.photoURL,
          existing.routeId,
          existing.atIso,
          existing.atUtc,
          existing.message,
        ].filter(Boolean).length;

        const nextScore = [
          a.petName,
          a.photoURL,
          a.routeId,
          a.atIso,
          a.atUtc,
          a.message,
        ].filter(Boolean).length;

        if (nextScore >= existingScore) {
          mergedMap.set(canonicalKey, {
            ...existing,
            ...a,
            key: canonicalKey,
          });
        }
      });

      const merged = Array.from(mergedMap.values())
        .filter((a) => {
          const t = (a.type || "").toString().toLowerCase();
          return t === "exit" || t === "enter";
        })
        .sort((a, b) => (b.atMs ?? 0) - (a.atMs ?? 0));

      setAlerts(merged);
      setLoading(false);
    };

    const unsubUsers = onValue(
      usersAlertsRef,
      (snap) => {
        const val = snap.val();

        usersAlerts = !val
          ? []
          : Object.entries(val).map(([key, data]: any) => ({
              key,
              rawKey: key,
              sourcePath: "users",
              type: data?.type,
              kind: data?.kind,
              message: data?.message,
              atIso: data?.atIso,
              atMs: data?.atMs,
              atUtc: data?.atUtc,
              atTh: data?.atTh,
              deviceCode: data?.deviceCode ?? null,
              radiusKm: data?.radiusKm,
              petId: data?.petId ?? null,
              petName: data?.petName ?? null,
              photoURL: data?.photoURL ?? null,
              routeId: data?.routeId ?? null,
            }));

        rebuild();
      },
      () => {
        usersAlerts = [];
        rebuild();
      }
    );

    let unsubDevice: null | (() => void) = null;

    if (activeDeviceId) {
      const deviceAlertsRef = ref(rtdb, `devices/${activeDeviceId}/alerts`);

      unsubDevice = onValue(
        deviceAlertsRef,
        (snap) => {
          const val = snap.val();

          deviceAlerts = !val
            ? []
            : Object.entries(val).map(([key, data]: any) => ({
                key,
                rawKey: key,
                sourcePath: "devices",
                type: data?.type,
                kind: data?.kind,
                message: data?.message,
                atIso: data?.atIso ?? data?.atUtc,
                atMs:
                  data?.atMs ??
                  (data?.atUtc ? Date.parse(data.atUtc) : undefined),
                atUtc: data?.atUtc,
                atTh: data?.atTh,
                deviceCode: data?.deviceCode ?? data?.device ?? activeDeviceId,
                radiusKm: data?.radiusKm,
                petId: data?.petId ?? null,
                petName: data?.petName ?? null,
                photoURL: data?.photoURL ?? null,
                routeId: data?.routeId ?? null,
              }));

          rebuild();
        },
        () => {
          deviceAlerts = [];
          rebuild();
        }
      );
    } else {
      rebuild();
    }

    return () => {
      unsubUsers();
      if (unsubDevice) unsubDevice();
    };
  }, [uid, activeDeviceId]);

  /* ================= DELETE ONE ================= */
  const deleteOne = useCallback(
    (a: AlertItem) => {
      if (!readKey || !uid) return;

      Alert.alert("ลบการแจ้งเตือน?", "ต้องการลบรายการนี้หรือไม่", [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              const next = { ...readMap };
              delete next[a.key];
              setReadMap(next);
              await AsyncStorage.setItem(readKey, JSON.stringify(next));

              const deletes: Promise<void>[] = [];

              if (a.sourcePath === "users" && a.rawKey) {
                deletes.push(
                  remove(ref(rtdb, `users/${uid}/alerts/${a.rawKey}`))
                );
              }

              if (a.sourcePath === "devices" && a.rawKey && activeDeviceId) {
                deletes.push(
                  remove(
                    ref(rtdb, `devices/${activeDeviceId}/alerts/${a.rawKey}`)
                  )
                );
              }

              await Promise.allSettled(deletes);

              DeviceEventEmitter.emit("notifications:readmap_updated");
            } catch {
              Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบรายการได้");
            }
          },
        },
      ]);
    },
    [readKey, readMap, uid, activeDeviceId]
  );

  /* ================= OPEN ALERT ================= */
  const openAlert = useCallback(
    async (a: AlertItem) => {
      if (!a.key || openingKey) return;

      setOpeningKey(a.key);

      try {
        if (readKey && !readMap[a.key]) {
          const next = { ...readMap, [a.key]: true };
          setReadMap(next);
          await AsyncStorage.setItem(readKey, JSON.stringify(next));
          DeviceEventEmitter.emit("notifications:readmap_updated");
        }

        if (!a.routeId) {
          Alert.alert(
            "ไม่มีข้อมูลเส้นทาง",
            "รายการนี้ไม่มีข้อมูลเส้นทาง หรือถูกลบไปแล้ว"
          );
          return;
        }

        if (!auth.currentUser) {
          Alert.alert(
            "ยังไม่ได้เข้าสู่ระบบ",
            "กรุณาเข้าสู่ระบบก่อนเพื่อดูข้อมูลเส้นทาง"
          );
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
        Alert.alert(
          "เกิดข้อผิดพลาด",
          "ไม่สามารถเปิดข้อมูลเส้นทางได้ในขณะนี้"
        );
      } finally {
        setOpeningKey(null);
      }
    },
    [openingKey, readKey, readMap, router]
  );

  /* ================= BUILD LIST ================= */
  const listData: ListItem[] = useMemo(() => {
    if (!alerts.length) return [];

    const out: ListItem[] = [];
    let lastHeader = "";

    for (const a of alerts) {
      const iso = getAtIso(a);
      const header = toDateHeaderTH(iso);

      if (header !== lastHeader) {
        lastHeader = header;
        out.push({ kind: "section", id: `section-${header}`, title: header });
      }

      out.push({ kind: "alert", data: a });
    }

    return out;
  }, [alerts]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "section") {
      return <Text style={styles.sectionTitle}>{item.title}</Text>;
    }

    const a = item.data;
    const t = (a.type || "").toString().toLowerCase();
    const isExit = t === "exit";

    const latestPet = a.petId ? petsMap[a.petId] : undefined;
    const displayPetName =
      latestPet?.name?.trim() || a.petName?.trim() || "สัตว์เลี้ยง";
    const displayPhotoURL = latestPet?.photoURL || a.photoURL || null;

    const rawTitle =
      cleanMessage(a.message) ||
      (isExit
        ? `${displayPetName} ออกนอกพื้นที่`
        : `${displayPetName} กลับเข้าพื้นที่`);

    const title = applyPetNameToMessage(rawTitle, displayPetName);
    const ago = timeAgoTH(getAtIso(a), nowTick);
    const isUnread = !readMap[a.key];
    const isOpening = openingKey === a.key;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openAlert(a)}
        onLongPress={() => deleteOne(a)}
        disabled={isOpening}
      >
        <View
          style={[
            styles.cardFull,
            isUnread && styles.unreadBg,
            isOpening && styles.disabledCard,
          ]}
        >
          <View style={styles.left}>
            <View style={styles.avatarWrap}>
              {displayPhotoURL ? (
                <Image source={{ uri: displayPhotoURL }} style={styles.avatar} />
              ) : (
                <MaterialIcons name="pets" size={22} color="#7A4A00" />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.title,
                  { color: isExit ? "#b00020" : "#0F7A2E" },
                ]}
              >
                {title}
              </Text>

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
          keyExtractor={(item, i) =>
            item.kind === "section" ? item.id : item.data.key || `a-${i}`
          }
          contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 10 }}
          ListEmptyComponent={
            <Text style={styles.empty}>ยังไม่มีการแจ้งเตือน</Text>
          }
        />
      )}
    </>
  );
}