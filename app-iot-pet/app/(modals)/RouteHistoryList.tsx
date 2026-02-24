import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Pressable,
  SectionListData,
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
import { SwipeListView } from "react-native-swipe-list-view";
import ProfileHeader from "@/components/ProfileHeader";

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
  startedAt?: any; // Firestore Timestamp
  endedAt?: any; // Firestore Timestamp
};

type RealTimeMap = Record<
  string,
  {
    startIso?: string | null; // เวลาจริงจาก points[0]
    endIso?: string | null; // เวลาจริงจาก points[last]
  }
>;

export default function RouteHistoryList() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteHistory[]>([]);

  // ✅ map เก็บเวลาจริงของแต่ละ route (ดึงจาก points)
  const [realTimes, setRealTimes] = useState<RealTimeMap>({});

  // กันยิง getDocs ซ้ำซ้อน
  const fetchingRef = useRef<Set<string>>(new Set());

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

  // ✅ เวลา “การ์ดนี้” ใช้เรียง (ล่าสุดขึ้นบน) : createdAt > to > from
  const getSortMs = (r: RouteHistory) => {
    const ca = r.createdAt;
    const caMs =
      ca && typeof ca?.toMillis === "function" ? (ca.toMillis() as number) : NaN;

    const toMs = r.to ? new Date(r.to).getTime() : NaN;
    const fromMs = r.from ? new Date(r.from).getTime() : NaN;

    if (Number.isFinite(caMs)) return caMs;
    if (Number.isFinite(toMs)) return toMs;
    if (Number.isFinite(fromMs)) return fromMs;
    return 0;
  };

  const formatTimeRange = (fromIso: string, toIso: string) => {
    const sameDay =
      new Date(fromIso).toDateString() === new Date(toIso).toDateString();

    if (sameDay) {
      return `${formatThaiTime(fromIso)} - ${formatThaiTime(toIso)} น.`;
    }

    return `${formatThaiDate(fromIso)} ${formatThaiTime(fromIso)} น. - ${formatThaiDate(
      toIso
    )} ${formatThaiTime(toIso)} น.`;
  };

  /**
   * ✅ normalize status ให้เป็น 2 ค่า: recording / done
   * - สำคัญ: ถ้า status=recording แต่ยังไม่ถึงเวลา to -> ต้องเป็น recording เสมอ
   * - ถ้าเลยเวลา to แล้ว -> done
   */
  const getStatus = (route: RouteHistory): "recording" | "done" => {
    const s = (route.status ?? "").toString().trim().toLowerCase();

    const now = Date.now();
    const toMs = route.to ? new Date(route.to).getTime() : NaN;

    // 1) ถ้า DB บอก recording และยังไม่ถึงเวลาสิ้นสุด -> recording
    if (
      s === "recording" ||
      s === "rec" ||
      s === "in_progress" ||
      s === "running"
    ) {
      // ถ้ามี to และเลยเวลาแล้ว -> ถือว่า done (กันกรณี timeout ไม่ยิง)
      if (Number.isFinite(toMs) && now > toMs + 1000) return "done";
      return "recording";
    }

    // 2) done (completed/cancelled/done/finished/stop)
    if (
      s === "done" ||
      s === "finished" ||
      s === "completed" ||
      s === "cancelled" ||
      s === "canceled" ||
      s === "stop"
    ) {
      return "done";
    }

    // 3) fallback สำหรับเอกสารเก่ามากที่ไม่มี status:
    // ถ้ายังอยู่ในช่วง from-to ของ "วันนี้" ให้มองว่า recording
    const fromMs = route.from ? new Date(route.from).getTime() : NaN;
    const isToday =
      route.from &&
      new Date(route.from).toDateString() === new Date().toDateString();
    const isInRange =
      Number.isFinite(fromMs) &&
      Number.isFinite(toMs) &&
      now >= fromMs &&
      now <= toMs;

    return isToday && isInRange ? "recording" : "done";
  };

  /**
   * ✅ AUTO COMPLETE เฉพาะกรณี "เลยเวลา to" เท่านั้น
   * (เอา logic ปิดเพราะ disconnected ออกทั้งหมด เพราะทำให้ปิดผิดตั้งแต่โหลดหน้า)
   */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const qRec = query(
      collection(db, "users", uid, "routeHistories"),
      where("status", "in", ["recording", "RECORDING", "Recording"])
    );

    return onSnapshot(qRec, async (snap) => {
      if (snap.empty) return;

      const now = Date.now();

      for (const d of snap.docs) {
        const data = d.data() as any;
        const toIso: string | null = data?.to ?? null;
        const toMs = toIso ? new Date(toIso).getTime() : NaN;

        const passedStopTime = Number.isFinite(toMs) && now > toMs + 1000;

        if (!passedStopTime) continue;

        try {
          await updateDoc(doc(db, "users", uid, "routeHistories", d.id), {
            status: "completed",
            endedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn("Failed to auto-complete route:", d.id, e);
        }
      }
    });
  }, []);

  // ✅ โหลดรายการ routeHistories
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "users", uid, "routeHistories"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const raw = d.data() as Omit<RouteHistory, "id">;
        return { id: d.id, ...raw };
      });

      data.sort((a, b) => getSortMs(b) - getSortMs(a));
      setRoutes(data);
    });
  }, []);

  /**
   * ✅ ดึง "เวลาจริงเริ่ม/จบ" จาก subcollection points ของแต่ละ route
   * - start = point แรก (orderBy timestamp asc, limit 1)
   * - end = point สุดท้าย (orderBy timestamp desc, limit 1)
   *
   * NOTE: ใช้ getDocs (ไม่ใช่ onSnapshot) เพื่อลด listener จำนวนมาก
   */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    let cancelled = false;

    const fetchRealTimes = async () => {
      for (const r of routes) {
        if (!r?.id) continue;

        // ถ้ามีแล้ว ไม่ต้องดึงซ้ำ
        if (realTimes[r.id]?.startIso && realTimes[r.id]?.endIso) continue;

        // กันซ้ำระหว่างรอบ
        if (fetchingRef.current.has(r.id)) continue;
        fetchingRef.current.add(r.id);

        try {
          const pointsCol = collection(
            db,
            "users",
            uid,
            "routeHistories",
            r.id,
            "points"
          );

          const qStart = query(pointsCol, orderBy("timestamp", "asc"), limit(1));
          const qEnd = query(pointsCol, orderBy("timestamp", "desc"), limit(1));

          const [startSnap, endSnap] = await Promise.all([
            getDocs(qStart),
            getDocs(qEnd),
          ]);

          const startIso = startSnap.docs[0]?.data()?.timestamp ?? null;
          const endIso = endSnap.docs[0]?.data()?.timestamp ?? null;

          if (cancelled) return;

          setRealTimes((prev) => ({
            ...prev,
            [r.id]: { startIso, endIso },
          }));
        } catch {
          // ไม่มี points หรือ permission ไม่ผ่าน -> fallback from/to
        } finally {
          fetchingRef.current.delete(r.id);
        }
      }
    };

    void fetchRealTimes();

    return () => {
      cancelled = true;
    };
  }, [routes, realTimes]);

  // ✅ group by วัน (ใช้ "วันของเวลาจริง" ถ้ามี ไม่งั้นใช้ from)
  const sections: SectionListData<RouteHistory>[] = useMemo(() => {
    const map = new Map<string, RouteHistory[]>();

    for (const r of routes) {
      const realStart = realTimes[r.id]?.startIso ?? null;
      const isoForDay = realStart || r.from;
      const dateKey = isoForDay ? new Date(isoForDay).toDateString() : "Unknown";

      const arr = map.get(dateKey) ?? [];
      arr.push(r);
      map.set(dateKey, arr);
    }

    const result: any[] = [];

    for (const [dateKey, arr] of map.entries()) {
      arr.sort((a, b) => getSortMs(b) - getSortMs(a));

      const first = arr[0];
      const realStart = first ? realTimes[first.id]?.startIso ?? null : null;
      const isoForTitle = realStart || first?.from;
      const title = isoForTitle ? formatThaiDate(isoForTitle) : "ไม่ทราบวันที่";

      result.push({
        key: dateKey,
        title,
        data: arr,
      });
    }

    result.sort((a: any, b: any) => {
      const aTop = a.data?.[0] ? getSortMs(a.data[0]) : 0;
      const bTop = b.data?.[0] ? getSortMs(b.data[0]) : 0;
      return bTop - aTop;
    });

    return result as SectionListData<RouteHistory>[];
  }, [routes, realTimes]);

  const confirmDelete = (
    rowMap: { [key: string]: any },
    rowKey: string,
    routeId: string,
    petName: string
  ) => {
    Alert.alert("ลบประวัติการบันทึก", `ต้องการลบประวัติของ ${petName} ใช่ไหม?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => handleDelete(rowMap, rowKey, routeId),
      },
    ]);
  };

  const handleDelete = async (
    rowMap: { [key: string]: any },
    rowKey: string,
    routeId: string
  ) => {
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

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<RouteHistory>;
  }) => {
    const title = (section as any).title as string | undefined;

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title ?? "-"}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: RouteHistory }) => {
    const rt = realTimes[item.id];
    const realStart = rt?.startIso ?? null;
    const realEnd = rt?.endIso ?? null;

    const timeText =
      realStart && realEnd
        ? formatTimeRange(realStart, realEnd)
        : formatTimeRange(item.from, item.to);

    const status = getStatus(item);
    const statusText = status === "recording" ? "กำลังบันทึก" : "เสร็จสิ้นแล้ว";

    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/(modals)/RouteHistory",
            params: { routeId: item.id, route: JSON.stringify(item) },
          })
        }
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

            <View
              style={[
                styles.statusPill,
                status === "recording" ? styles.statusRecording : styles.statusDone,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  status === "recording"
                    ? styles.statusTextRecording
                    : styles.statusTextDone,
                ]}
              >
                {statusText}
              </Text>
            </View>
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

  const renderHiddenItem = (
    { item }: { item: RouteHistory },
    rowMap: { [key: string]: any }
  ) => (
    <View style={styles.hiddenContainer}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDelete(rowMap, item.id, item.id, item.petName)}
      >
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
  statusDone: {
    backgroundColor: "#E8F7EE",
  },
  statusRecording: {
    backgroundColor: "#EAFEFF",
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: "900",
  },
  statusTextDone: {
    color: "#166534",
  },
  statusTextRecording: {
    color: "#126D9A",
  },

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