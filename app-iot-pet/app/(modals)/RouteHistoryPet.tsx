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
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { SwipeListView } from "react-native-swipe-list-view";
import ProfileHeader from "@/components/ProfileHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

// ✅ Calendar
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales.th = {
  monthNames: [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ],
  monthNamesShort: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
  dayNames: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"],
  dayNamesShort: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],
  today: "วันนี้",
};
LocaleConfig.defaultLocale = "th";

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

  // ✅ เวลาจริง (รองรับหลายแบบ)
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

export default function RouteHistoryPet() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    petId?: string;
    petName?: string;
    photoURL?: string;
  }>();

  const petId = (params.petId ?? "").toString();
  const headerName = (params.petName ?? "ประวัติเส้นทางย้อนหลัง").toString();

  const [routes, setRoutes] = useState<RouteHistory[]>([]);
  const [realTimes, setRealTimes] = useState<RealTimeMap>({});

  const fetchingRef = useRef<Set<string>>(new Set());
  const blockCardPressRef = useRef(false);

  // ✅ selected date (YYYY-MM-DD). null = แสดงทั้งหมด
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);

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

  // ✅ เวลา “การ์ดนี้” ใช้เรียง (ล่าสุดขึ้นบน) : createdAt > endedAtMs > startedAtMs > to > from
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

  const formatTimeRange = (fromIso: string, toIsoStr: string) => {
    const sameDay = new Date(fromIso).toDateString() === new Date(toIsoStr).toDateString();
    if (sameDay) return `${formatThaiTime(fromIso)} - ${formatThaiTime(toIsoStr)} น.`;
    return `${formatThaiDate(fromIso)} ${formatThaiTime(fromIso)} น. - ${formatThaiDate(toIsoStr)} ${formatThaiTime(
      toIsoStr
    )} น.`;
  };

  /**
   * ✅ normalize status ให้เป็น 2 ค่า: recording / done
   */
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

  // ✅ ISO -> YYYY-MM-DD (ตาม timezone ของเครื่อง)
  const toDateId = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  /**
   * ✅ helper: emit event + clear storage (ให้ Maps รีเซต)
   */
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
   * - อัปเดท endedAtIso/endedAtMs ให้หน้า RouteHistory เอาเวลา “จบจริง” ได้ทันที
   */
  const stopRecordingNow = useCallback(
    async (route: RouteHistory) => {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;

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
    [notifyMapsRecordingEnded]
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
        { text: "หยุดบันทึก", style: "destructive", onPress: () => void stopRecordingNow(route) },
      ]);
    },
    [stopRecordingNow]
  );

  /**
   * ✅ AUTO COMPLETE เฉพาะ route ที่ recording ของ "สัตว์เลี้ยงตัวนี้"
   */
  useEffect(() => {
    if (!auth.currentUser || !petId) return;
    const uid = auth.currentUser.uid;

    const qRec = query(
      collection(db, "users", uid, "routeHistories"),
      where("petId", "==", petId),
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
  }, [notifyMapsRecordingEnded, petId]);

  /**
   * ✅ โหลด routeHistories เฉพาะ petId นี้
   * ✅ ตัด orderBy ใน query ออก เพื่อไม่ต้องสร้าง composite index
   * แล้วค่อย sort ในแอปแทน
   */
  useEffect(() => {
    if (!auth.currentUser || !petId) return;
    const uid = auth.currentUser.uid;

    const q = query(collection(db, "users", uid, "routeHistories"), where("petId", "==", petId));

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const raw = d.data() as Omit<RouteHistory, "id">;
        return { id: d.id, ...raw };
      });

      data.sort((a, b) => getSortMs(b) - getSortMs(a));
      setRoutes(data);
    });
  }, [petId]);

  /**
   * ✅ ดึง "เวลาจริงเริ่ม/จบ" จาก subcollection points
   * - ใช้ timestampMs orderBy (ให้เข้ากับอีกหน้า)
   */
  useEffect(() => {
    if (!auth.currentUser || !petId) return;
    const uid = auth.currentUser.uid;

    let cancelled = false;

    const fetchRealTimes = async () => {
      for (const r of routes) {
        if (!r?.id) continue;

        // ถ้ามีเวลาจริงในเอกสารแล้ว ก็ข้าม
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
  }, [routes, realTimes, petId]);

  // ✅ ใช้วันของ route: startedAt จริง > points start > from
  const getRouteDayIso = useCallback(
    (r: RouteHistory) => {
      const routeStart = r.startedAtIso || toIso(r.startedAt) || null;
      const pointsStart = realTimes[r.id]?.startIso ?? null;
      return routeStart || pointsStart || r.from || null;
    },
    [realTimes]
  );

  // ✅ map: dateId -> routes
  const routesByDateId = useMemo(() => {
    const map = new Map<string, RouteHistory[]>();
    for (const r of routes) {
      const dayIso = getRouteDayIso(r);
      if (!dayIso) continue;
      const dateId = toDateId(dayIso);
      const arr = map.get(dateId) ?? [];
      arr.push(r);
      map.set(dateId, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => getSortMs(b) - getSortMs(a));
      map.set(k, arr);
    }
    return map;
  }, [routes, getRouteDayIso]);

  // ✅ markedDates: วันไหนมีบันทึกจะมีจุด + วันเลือกจะถูก highlight
  const markedDates = useMemo(() => {
    const obj: any = {};
    for (const dateId of routesByDateId.keys()) {
      obj[dateId] = { marked: true, dotColor: "#22C55E" };
    }
    if (selectedDateId) {
      obj[selectedDateId] = {
        ...(obj[selectedDateId] ?? {}),
        selected: true,
        selectedColor: "#FBBF24",
        selectedTextColor: "#111827",
      };
    }
    return obj;
  }, [routesByDateId, selectedDateId]);

  // ✅ routes ที่จะโชว์ (เลือกวัน = filter)
  const visibleRoutes = useMemo(() => {
    if (!selectedDateId) return routes;
    return routesByDateId.get(selectedDateId) ?? [];
  }, [routes, routesByDateId, selectedDateId]);

  // ✅ group by วัน (จาก visibleRoutes)
  const sections: SectionListData<RouteHistory>[] = useMemo(() => {
    const map = new Map<string, RouteHistory[]>();

    for (const r of visibleRoutes) {
      const isoForDay = getRouteDayIso(r);
      const dateKey = isoForDay ? new Date(isoForDay).toDateString() : "Unknown";

      const arr = map.get(dateKey) ?? [];
      arr.push(r);
      map.set(dateKey, arr);
    }

    const result: any[] = [];

    for (const [dateKey, arr] of map.entries()) {
      arr.sort((a, b) => getSortMs(b) - getSortMs(a));

      const first = arr[0];
      const isoForTitle = (first ? getRouteDayIso(first) : null) || first?.from || null;
      const title = isoForTitle ? formatThaiDate(isoForTitle) : "ไม่ทราบวันที่";

      result.push({ key: dateKey, title, data: arr });
    }

    result.sort((a: any, b: any) => {
      const aTop = a.data?.[0] ? getSortMs(a.data[0]) : 0;
      const bTop = b.data?.[0] ? getSortMs(b.data[0]) : 0;
      return bTop - aTop;
    });

    return result as SectionListData<RouteHistory>[];
  }, [visibleRoutes, getRouteDayIso]);

  const confirmDelete = (rowMap: { [key: string]: any }, rowKey: string, routeId: string, petName: string) => {
    Alert.alert("ลบประวัติการบันทึก", `ต้องการลบประวัติของ ${petName} ใช่ไหม?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => handleDelete(rowMap, rowKey, routeId) },
    ]);
  };

  const handleDelete = async (rowMap: { [key: string]: any }, rowKey: string, routeId: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

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
    const startIso = item.startedAtIso || toIso(item.startedAt) || rt?.startIso || item.from || "";
    const endIso = item.endedAtIso || toIso(item.endedAt) || rt?.endIso || item.to || "";

    const timeText = startIso && endIso ? formatTimeRange(startIso, endIso) : formatTimeRange(item.from, item.to);

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
              style={[styles.statusPill, status === "recording" ? styles.statusRecording : styles.statusDone]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.statusText, status === "recording" ? styles.statusTextRecording : styles.statusTextDone]}>
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

  const onDayPress = useCallback((d: DateData) => {
    // toggle: แตะซ้ำ = ยกเลิก filter
    setSelectedDateId((prev) => (prev === d.dateString ? null : d.dateString));
  }, []);

  return (
    <>
      <ProfileHeader
        title={`เส้นทางย้อนหลังของ ${headerName}`}
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
        }
        // ✅ ล้างตัวกรองแบบ icon เมื่อเลือกวันอยู่
        right={
          selectedDateId ? (
            <TouchableOpacity onPress={() => setSelectedDateId(null)} style={{ paddingHorizontal: 0, paddingVertical: 4 }}>
              <MaterialCommunityIcons name="restart" size={28} color="black" />
            </TouchableOpacity>
          ) : null
        }
      />

      {!petId ? (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="route" size={88} color="lightgray" />
          <Text style={styles.emptyText}>ไม่พบ petId</Text>
        </View>
      ) : (
        <>
          {/* ✅ Calendar (แบบเดียวกับ RouteHistoryList) */}
          <View style={styles.calendarWrap}>
            <Calendar
              onDayPress={onDayPress}
              markedDates={markedDates}
              enableSwipeMonths
              theme={{
                textMonthFontWeight: "900",
                textDayFontWeight: "700",
                textDayHeaderFontWeight: "800",
                arrowColor: "#0F172A",
                todayTextColor: "#8C4D00",
              }}
              style={styles.calendar}
            />
          </View>

          {/* ✅ List */}
          {routes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="route" size={88} color="lightgray" />
              <Text style={styles.emptyText}>ยังไม่มีประวัติการบันทึกเส้นทาง</Text>
            </View>
          ) : selectedDateId && visibleRoutes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="calendar-xmark" size={72} color="lightgray" />
              <Text style={styles.emptyText}>ไม่มีการบันทึกในวันที่เลือก</Text>
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
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // ✅ ปฏิทิน (เหมือนหน้า RouteHistoryList)
  calendarWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    marginTop: 10,
  },
  calendar: {
    borderRadius: 14,
    overflow: "hidden",
    paddingBottom: 20,
  },

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