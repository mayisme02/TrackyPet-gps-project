import React, { useEffect, useMemo, useState } from "react";
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
} from "firebase/firestore";
import { SwipeListView } from "react-native-swipe-list-view";
import ProfileHeader from "@/components/ProfileHeader";

type RouteHistory = {
  id: string;
  petId: string;
  petName: string;
  photoURL?: string | null;

  from: string; // ISO
  to: string; // ISO

  createdAt?: any; // Firestore Timestamp | undefined
};

export default function RouteHistoryList() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteHistory[]>([]);

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

  // ✅ แสดงเวลาในวันเดียว: 15:02 - 18:00 น.
  // ✅ ถ้าข้ามวัน: 23 ก.พ. 15:02 น. - 24 ก.พ. 01:10 น.
  const formatTimeRange = (from: string, to: string) => {
    const sameDay =
      new Date(from).toDateString() === new Date(to).toDateString();

    if (sameDay) {
      return `${formatThaiTime(from)} - ${formatThaiTime(to)} น.`;
    }

    return `${formatThaiDate(from)} ${formatThaiTime(from)} น. - ${formatThaiDate(
      to
    )} ${formatThaiTime(to)} น.`;
  };

  // ✅ สถานะบนการ์ด: กำลังบันทึก / เสร็จสิ้นแล้ว
  // (เงื่อนไข: ถ้าเป็น "วันนี้" และตอนนี้อยู่ในช่วง from..to ให้เป็นกำลังบันทึก)
  const getStatus = (from: string, to: string) => {
    const now = Date.now();
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();

    const isToday = new Date(from).toDateString() === new Date().toDateString();
    const isInRange =
      Number.isFinite(fromMs) &&
      Number.isFinite(toMs) &&
      now >= fromMs &&
      now <= toMs;

    if (isToday && isInRange) return "recording";
    return "done";
  };

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
   * ✅ GROUP BY วัน -> แสดงวันที่เป็นหัวข้อบนซ้ายครั้งเดียว
   * ✅ ภายในวันเรียงตามเวลาล่าสุดก่อน
   *
   * NOTE:
   * typings ของ SwipeListView บางเวอร์ชันล็อก Section เป็น DefaultSectionT
   * เราเลยเก็บ title ไว้ใน section แบบ "แนบเพิ่ม" และ cast ตอนอ่านใน header
   */
  const sections: SectionListData<RouteHistory>[] = useMemo(() => {
    const map = new Map<string, RouteHistory[]>();

    for (const r of routes) {
      const dateKey = r.from ? new Date(r.from).toDateString() : "Unknown";
      const arr = map.get(dateKey) ?? [];
      arr.push(r);
      map.set(dateKey, arr);
    }

    const result: any[] = [];

    for (const [dateKey, arr] of map.entries()) {
      arr.sort((a, b) => getSortMs(b) - getSortMs(a));

      const first = arr[0];
      const title = first?.from ? formatThaiDate(first.from) : "ไม่ทราบวันที่";

      // ✅ ใส่ title เพิ่ม (แต่ไม่บังคับ type ของ lib)
      result.push({
        key: dateKey,
        title,
        data: arr,
      });
    }

    // sort กลุ่มวัน (ล่าสุดก่อน)
    result.sort((a: any, b: any) => {
      const aTop = a.data?.[0] ? getSortMs(a.data[0]) : 0;
      const bTop = b.data?.[0] ? getSortMs(b.data[0]) : 0;
      return bTop - aTop;
    });

    return result as SectionListData<RouteHistory>[];
  }, [routes]);

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
  };

  // ✅ FIX: ให้รับ type ตาม lib แล้วค่อยอ่าน title ผ่าน any
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
    const timeText = formatTimeRange(item.from, item.to);

    const status = getStatus(item.from, item.to);
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

            {/* ✅ เปลี่ยนจาก "วันที่" เป็น "สถานะ" */}
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

  // ✅ สถานะบนการ์ด
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDone: {
    backgroundColor: "#E8F7EE",
  },
  statusRecording: {
    backgroundColor: "#FFF4E5",
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: "900",
  },
  statusTextDone: {
    color: "#166534",
  },
  statusTextRecording: {
    color: "#9A3412",
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