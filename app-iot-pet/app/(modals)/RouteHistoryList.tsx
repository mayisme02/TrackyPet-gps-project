import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Pressable,
  SectionListData,
  DeviceEventEmitter,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/firebase";
import {
  onSnapshot,
  collection,
  query,
  orderBy,
  deleteDoc,
  doc,
  where,
  updateDoc,
  serverTimestamp,
  getDocs,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { SwipeListView } from "react-native-swipe-list-view";
import ProfileHeader from "@/components/ProfileHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";

type RouteHistory = {
  id: string;
  petId: string;
  petName: string;
  photoURL?: string | null;

  from: string; // ISO (เวลาที่ตั้งไว้)
  to: string; // ISO (เวลาที่ตั้งไว้)

  status?: string;
  deviceCode?: string | null;

  createdAt?: any;

  // ✅ เวลาจริงจาก Maps / หรือจาก list stop
  startedAtIso?: string | null;
  endedAtIso?: string | null;
  startedAtMs?: number | null;
  endedAtMs?: number | null;

  // เผื่อบางทีเก็บเป็น Firestore Timestamp
  startedAt?: any;
  endedAt?: any;
};

type RealTimeMap = Record<
  string,
  {
    startIso?: string | null;
    endIso?: string | null;
  }
>;

const ROUTE_FILTER_STORAGE_KEY = "routeFilter_v1";
const ACTIVE_GEOFENCE_STORAGE_KEY = "activeGeofence_v1";
const ROUTE_RECORDING_ENDED_EVENT = "routeRecordingEnded";

export default function RouteHistoryList() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  const [routes, setRoutes] = useState<RouteHistory[]>([]);
  const [realTimes, setRealTimes] = useState<RealTimeMap>({});

  const fetchingRef = useRef<Set<string>>(new Set());
  const blockCardPressRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  const toIso = (v: any): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v?.toDate === "function") return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    return "";
  };

  const formatThaiDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatThaiTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const getSortMs = (r: RouteHistory) => {
    const ca = r.createdAt;
    const caMs = ca && typeof ca?.toMillis === "function" ? (ca.toMillis() as number) : NaN;

    const endMs = Number(r.endedAtMs ?? NaN);
    const startMs = Number(r.startedAtMs ?? NaN);

    const toMs = r.to ? new Date(r.to).getTime() : NaN;
    const fromMs = r.from ? new Date(r.from).getTime() : NaN;

    if (Number.isFinite(caMs)) return caMs;
    if (Number.isFinite(endMs)) return endMs;
    if (Number.isFinite(startMs)) return startMs;
    if (Number.isFinite(toMs)) return toMs;
    if (Number.isFinite(fromMs)) return fromMs;
    return 0;
  };

  const formatTimeRange = (fromIso: string, toIso: string) => {
    const sameDay = new Date(fromIso).toDateString() === new Date(toIso).toDateString();

    if (sameDay) return `${formatThaiTime(fromIso)} - ${formatThaiTime(toIso)} น.`;

    return `${formatThaiDate(fromIso)} ${formatThaiTime(fromIso)} น. - ${formatThaiDate(toIso)} ${formatThaiTime(
      toIso
    )} น.`;
  };

  const getStatus = (route: RouteHistory): "recording" | "done" => {
    const s = (route.status ?? "").toString().trim().toLowerCase();

    const now = Date.now();
    const toMs = route.to ? new Date(route.to).getTime() : NaN;

    if (s === "recording" || s === "rec" || s === "in_progress" || s === "running") {
      if (Number.isFinite(toMs) && now > toMs + 1000) return "done";
      return "recording";
    }

    if (s === "done" || s === "finished" || s === "completed" || s === "cancelled" || s === "canceled" || s === "stop") {
      return "done";
    }

    const fromMs = route.from ? new Date(route.from).getTime() : NaN;
    const isToday = route.from && new Date(route.from).toDateString() === new Date().toDateString();
    const isInRange = Number.isFinite(fromMs) && Number.isFinite(toMs) && now >= fromMs && now <= toMs;

    return isToday && isInRange ? "recording" : "done";
  };

  const notifyMapsRecordingEnded = useCallback(async (payload: { routeId: string; deviceCode?: string | null }) => {
    try {
      await AsyncStorage.removeItem(ROUTE_FILTER_STORAGE_KEY);
      await AsyncStorage.removeItem(ACTIVE_GEOFENCE_STORAGE_KEY);
    } catch {}

    DeviceEventEmitter.emit(ROUTE_RECORDING_ENDED_EVENT, {
      routeId: payload.routeId,
      deviceCode: payload.deviceCode ?? null,
      at: Date.now(),
    });
  }, []);

  /**
   * ✅ หยุดบันทึกทันทีจากหน้า list
   * - อัปเดท endedAtIso/endedAtMs เพื่อให้หน้า RouteHistory แสดง “เวลาหยุดจริง” ทันที
   */
  const stopRecordingNow = useCallback(
    async (route: RouteHistory) => {
      if (!uid) return;

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      try {
        await updateDoc(doc(db, "users", uid, "routeHistories", route.id), {
          status: "completed",
          endedAt: serverTimestamp(),
          endedAtIso: nowIso,
          endedAtMs: nowMs,
          updatedAt: serverTimestamp(),
        });

        await notifyMapsRecordingEnded({
          routeId: route.id,
          deviceCode: route.deviceCode ?? null,
        });
      } catch (e) {
        console.warn("Failed to stop recording:", route.id, e);
        Alert.alert("หยุดการบันทึกไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
      }
    },
    [uid, notifyMapsRecordingEnded]
  );

  const openStopRecordingConfirm = useCallback(
    (route: RouteHistory) => {
      Alert.alert("หยุดการบันทึกทันที", `ต้องการหยุดการบันทึกของ ${route.petName ?? "สัตว์เลี้ยง"} ใช่ไหม?`, [
        {
          text: "ยกเลิก",
          style: "cancel",
          onPress: () => {
            setTimeout(() => (blockCardPressRef.current = false), 200);
          },
        },
        {
          text: "หยุดบันทึก",
          style: "destructive",
          onPress: () => void stopRecordingNow(route),
        },
      ]);
    },
    [stopRecordingNow]
  );

  /**
   * ✅ AUTO COMPLETE เฉพาะกรณี "เลยเวลา to" เท่านั้น
   * - อัปเดท endedAtIso/endedAtMs ด้วย
   */
  useEffect(() => {
    if (!uid) return;

    const qRec = query(
      collection(db, "users", uid, "routeHistories"),
      where("status", "in", ["recording", "RECORDING", "Recording"])
    );

    return onSnapshot(qRec, async (snap) => {
      if (snap.empty) return;

      const now = Date.now();

      for (const d of snap.docs) {
        const data = d.data() as any;
        const toIsoStr: string | null = data?.to ?? null;
        const toMs = toIsoStr ? new Date(toIsoStr).getTime() : NaN;

        const passedStopTime = Number.isFinite(toMs) && now > toMs + 1000;
        if (!passedStopTime) continue;

        const nowIso = new Date().toISOString();
        const nowMs = Date.now();

        try {
          await updateDoc(doc(db, "users", uid, "routeHistories", d.id), {
            status: "completed",
            endedAt: serverTimestamp(),
            endedAtIso: nowIso,
            endedAtMs: nowMs,
            updatedAt: serverTimestamp(),
          });

          await notifyMapsRecordingEnded({
            routeId: d.id,
            deviceCode: data?.deviceCode ?? null,
          });
        } catch (e) {
          console.warn("Failed to auto-complete route:", d.id, e);
        }
      }
    });
  }, [uid, notifyMapsRecordingEnded]);

  // ✅ โหลดรายการ routeHistories (realtime)
  useEffect(() => {
    if (!uid) {
      setRoutes([]);
      return;
    }

    const qRoutes = query(collection(db, "users", uid, "routeHistories"), orderBy("createdAt", "desc"));

    return onSnapshot(qRoutes, (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const raw = d.data() as Omit<RouteHistory, "id">;
        return { id: d.id, ...raw };
      });

      data.sort((a, b) => getSortMs(b) - getSortMs(a));
      setRoutes(data);
    });
  }, [uid]);

  /**
   * ✅ ดึง "เวลาจริงเริ่ม/จบ" จาก points (ลด listener: ใช้ getDocs)
   * - ใช้ timestampMs orderBy
   */
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    const fetchRealTimes = async () => {
      for (const r of routes) {
        if (!r?.id) continue;

        // ถ้า route มี startedAtIso/endedAtIso แล้ว ไม่ต้อง fetch points ก็ได้
        const hasRouteStart = !!(r.startedAtIso || toIso(r.startedAt));
        const hasRouteEnd = !!(r.endedAtIso || toIso(r.endedAt));
        if (hasRouteStart && hasRouteEnd) continue;

        if (realTimes[r.id]?.startIso && realTimes[r.id]?.endIso) continue;
        if (fetchingRef.current.has(r.id)) continue;
        fetchingRef.current.add(r.id);

        try {
          const pointsCol = collection(db, "users", uid, "routeHistories", r.id, "points");
          const qStart = query(pointsCol, orderBy("timestampMs", "asc"), limit(1));
          const qEnd = query(pointsCol, orderBy("timestampMs", "desc"), limit(1));

          const [startSnap, endSnap] = await Promise.all([getDocs(qStart), getDocs(qEnd)]);

          const startIso = (startSnap.docs[0]?.data() as any)?.timestamp ?? null;
          const endIso = (endSnap.docs[0]?.data() as any)?.timestamp ?? null;

          if (cancelled) return;

          setRealTimes((prev) => ({
            ...prev,
            [r.id]: { startIso, endIso },
          }));
        } catch {
          // ignore
        } finally {
          fetchingRef.current.delete(r.id);
        }
      }
    };

    void fetchRealTimes();

    return () => {
      cancelled = true;
    };
  }, [uid, routes, realTimes]);

  // ✅ group by วัน (ใช้ "วันของ startedAt จริง" ถ้ามี ไม่งั้นใช้ points start ไม่งั้นใช้ from)
  const sections: SectionListData<RouteHistory>[] = useMemo(() => {
    const map = new Map<string, RouteHistory[]>();

    for (const r of routes) {
      const routeStart = r.startedAtIso || toIso(r.startedAt) || null;
      const pointsStart = realTimes[r.id]?.startIso ?? null;
      const isoForDay = routeStart || pointsStart || r.from;

      const dateKey = isoForDay ? new Date(isoForDay).toDateString() : "Unknown";
      const arr = map.get(dateKey) ?? [];
      arr.push(r);
      map.set(dateKey, arr);
    }

    const result: any[] = [];

    for (const [dateKey, arr] of map.entries()) {
      arr.sort((a, b) => getSortMs(b) - getSortMs(a));

      const first = arr[0];
      const isoForTitle =
        (first?.startedAtIso || toIso(first?.startedAt) || realTimes[first?.id]?.startIso || first?.from) ?? null;

      const title = isoForTitle ? formatThaiDate(isoForTitle) : "ไม่ทราบวันที่";
      result.push({ key: dateKey, title, data: arr });
    }

    result.sort((a: any, b: any) => {
      const aTop = a.data?.[0] ? getSortMs(a.data[0]) : 0;
      const bTop = b.data?.[0] ? getSortMs(b.data[0]) : 0;
      return bTop - aTop;
    });

    return result as SectionListData<RouteHistory>[];
  }, [routes, realTimes]);

  const confirmDelete = (rowMap: { [key: string]: any }, rowKey: string, routeId: string, petName: string) => {
    Alert.alert("ลบประวัติการบันทึก", `ต้องการลบประวัติของ ${petName} ใช่ไหม?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => handleDelete(rowMap, rowKey, routeId) },
    ]);
  };

  const handleDelete = async (rowMap: { [key: string]: any }, rowKey: string, routeId: string) => {
    if (!uid) return;

    await deleteDoc(doc(db, "users", uid, "routeHistories", routeId));
    rowMap[rowKey]?.closeRow();

    setRealTimes((prev) => {
      const next = { ...prev };
      delete next[routeId];
      return next;
    });
  };

  const renderSectionHeader = ({ section }: { section: SectionListData<RouteHistory> }) => {
    const title = (section as any).title as string | undefined;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title ?? "-"}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: RouteHistory }) => {
    const rt = realTimes[item.id];

    const status = getStatus(item);
    const statusText = status === "recording" ? "กำลังบันทึก" : "เสร็จสิ้นแล้ว";

    // ✅ เลือกเวลา “จริง” สำหรับการ์ด
    const startIso =
      item.startedAtIso || toIso(item.startedAt) || rt?.startIso || item.from || "";
    const endIso =
      item.endedAtIso || toIso(item.endedAt) || rt?.endIso || item.to || "";

    const timeText =
      startIso && endIso ? formatTimeRange(startIso, endIso) : formatTimeRange(item.from, item.to);

    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          if (blockCardPressRef.current) {
            blockCardPressRef.current = false;
            return;
          }

          router.push({
            pathname: "/(modals)/RouteHistory",
            params: { routeId: item.id, route: JSON.stringify(item) },
          });
        }}
      >
        <View>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="pets" size={28} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.petName ?? "-"}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPressIn={() => {
                blockCardPressRef.current = true;
              }}
              onPress={() => {
                if (status !== "recording") {
                  setTimeout(() => (blockCardPressRef.current = false), 50);
                  return;
                }
                openStopRecordingConfirm(item);
              }}
              style={[
                styles.statusPill,
                status === "recording" ? styles.statusRecording : styles.statusDone,
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text
                style={[
                  styles.statusText,
                  status === "recording" ? styles.statusTextRecording : styles.statusTextDone,
                ]}
              >
                {statusText}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.range} numberOfLines={2}>
            {timeText}
          </Text>
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
        </View>
      </Pressable>
    );
  };

  const renderHiddenItem = ({ item }: { item: RouteHistory }, rowMap: { [key: string]: any }) => (
    <View style={styles.hiddenContainer}>
      <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(rowMap, item.id, item.id, item.petName)}>
        <FontAwesome6 name="trash" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <ProfileHeader
        title="เส้นทางย้อนหลัง"
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
        }
      />

      {routes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="route" size={88} color="lightgray" />
          <Text style={styles.emptyText}>ยังไม่มีประวัติการบันทึกเส้นทาง</Text>
        </View>
      ) : (
        <SwipeListView
          useSectionList
          sections={sections}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          renderHiddenItem={renderHiddenItem}
          keyExtractor={(item) => item.id}
          rightOpenValue={-75}
          disableRightSwipe
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            paddingBottom: 24,
          }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 90,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#888",
    fontWeight: "600",
    textAlign: "center",
  },

  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFEFE",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  avatar: { width: 60, height: 60, borderRadius: 30 },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  info: { flex: 1, marginLeft: 12 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },

  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDone: { backgroundColor: "#E8F7EE" },
  statusRecording: { backgroundColor: "#EAFEFF" },

  statusText: { fontSize: 12.5, fontWeight: "900" },
  statusTextDone: { color: "#166534" },
  statusTextRecording: { color: "#126D9A" },

  range: {
    fontSize: 13.5,
    color: "#6B7280",
    fontWeight: "600",
    lineHeight: 18,
  },

  chevronWrap: { paddingLeft: 8 },

  hiddenContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 14,
    paddingRight: 16,
  },

  deleteButton: {
    width: 75,
    height: "100%",
    backgroundColor: "#C21F04",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
});