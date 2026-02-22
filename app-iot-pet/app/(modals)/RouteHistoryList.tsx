import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Pressable,
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

  from: string;
  to: string;

  createdAt?: any;
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

  const formatRange = (from: string, to: string) => {
    const sameDay =
      new Date(from).toDateString() === new Date(to).toDateString();

    if (sameDay) {
      return `${formatThaiDate(from)} • ${formatThaiTime(from)} น. - ${formatThaiTime(
        to
      )} น.`;
    }

    return `${formatThaiDate(from)} ${formatThaiTime(from)} น.\nถึง ${formatThaiDate(
      to
    )} ${formatThaiTime(to)} น.`;
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
      setRoutes(data);
    });
  }, []);

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

  const renderItem = ({ item }: { item: RouteHistory }) => {
    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/(modals)/RouteHistory",
            // ✅ ส่ง routeId ให้หน้า RouteHistory ใช้งานได้จริง
            // ✅ ส่ง route ไปด้วย (optional) เพื่อให้โชว์ชื่อ/รูป/เวลาได้ทันที
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
          <Text style={styles.name}>{item.petName ?? "-"}</Text>
          <Text style={styles.range}>{formatRange(item.from, item.to)}</Text>
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
          data={routes}
          renderItem={renderItem}
          renderHiddenItem={renderHiddenItem}
          keyExtractor={(item) => item.id}
          rightOpenValue={-75}
          disableRightSwipe
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
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

  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
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