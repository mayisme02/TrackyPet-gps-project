import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  SafeAreaView,
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

interface Pet {
  id: string;
  name: string;
  breed: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
  photoURL?: string;
}

type DeviceMatch = {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  petId: string;
};

export default function Pets() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [deviceMap, setDeviceMap] = useState<Record<string, DeviceMatch>>({});

  /* ================= LOAD PETS ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "users", uid, "pets"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Pet, "id">),
      }));
      setPets(data);
    });

    return () => unsubscribe();
  }, []);

  /* ================= LOAD DEVICE MATCH ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(
      collection(db, "users", uid, "deviceMatches"),
      (snap) => {
        const map: Record<string, DeviceMatch> = {};
        snap.docs.forEach((d) => {
          const m = d.data() as DeviceMatch;
          map[m.petId] = m;
        });
        setDeviceMap(map);
      }
    );
  }, []);

  /* ================= DELETE ================= */
  const confirmDelete = (
    rowMap: { [key: string]: any },
    rowKey: string,
    petId: string,
    petName: string
  ) => {
    Alert.alert("ยืนยันการลบ", `คุณแน่ใจหรือไม่ว่าต้องการลบ ${petName}?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => handleDelete(rowMap, rowKey, petId),
      },
    ]);
  };

  const handleDelete = async (
    rowMap: { [key: string]: any },
    rowKey: string,
    petId: string
  ) => {
    try {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;

      await deleteDoc(doc(db, "users", uid, "pets", petId));

      if (rowMap[rowKey]) {
        rowMap[rowKey].closeRow();
      }
    } catch (error) {
      console.error("Error deleting pet:", error);
    }
  };

  /* ================= RENDER ITEM ================= */
  const renderPetItem = ({ item }: { item: Pet }) => {
    const device = deviceMap[item.id];

    return (
      <Pressable
        style={styles.petCard}
        onPress={() =>
          router.push({
            pathname: "/(modals)/PetDetail",
            params: { pet: JSON.stringify(item) },
          })
        }
      >
        {/* Image */}
        <View>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.petImage} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="pets" size={32} color="#aaa" />
            </View>
          )}

          {/* ONLINE DOT (NO ICON) */}
          {device && <View style={styles.connectedBadge} />}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.petName}>{item.name}</Text>
          <Text style={styles.petDetail}>
            {item.breed} • {item.age} ปี • {item.gender}
          </Text>

          {/* DEVICE STATUS PILL */}
          {device && (
            <View style={styles.deviceTag}>
              <Text style={styles.deviceTagText}>
                {device.deviceName}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderHiddenItem = (
    { item }: { item: Pet },
    rowMap: { [key: string]: any }
  ) => (
    <View style={styles.hiddenContainer}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() =>
          confirmDelete(rowMap, item.id, item.id, item.name)
        }
      >
        <FontAwesome6 name="trash" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {/* ================= HEADER ================= */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>สัตว์เลี้ยงของคุณ</Text>

          <TouchableOpacity
            style={styles.headerRight}
            onPress={() => router.push("/(modals)/AddPet")}
          >
            <MaterialIcons name="add" size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ================= CONTENT ================= */}
      {pets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="dog" size={100} color="lightgray" />
          <Text style={styles.emptyText}>
            เพิ่มความน่ารักด้วยสัตว์เลี้ยงตัวแรกของคุณ
          </Text>
        </View>
      ) : (
        <SwipeListView
          data={pets}
          renderItem={renderPetItem}
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

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#f2bb14",
  },

  header: {
    height: 56,
    backgroundColor: "#f2bb14",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerLeft: {
    position: "absolute",
    left: 16,
  },
  headerRight: {
    position: "absolute",
    right: 16,
  },

  emptyContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
  },

  petCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFEFE",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },

  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ===== ONLINE DOT ===== */
  connectedBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#009B4B",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  petName: {
    fontSize: 16,
    fontWeight: "700",
  },
  petDetail: {
    fontSize: 14,
    color: "#6B7280",
  },
  deviceTag: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#009B4B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  deviceTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },

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