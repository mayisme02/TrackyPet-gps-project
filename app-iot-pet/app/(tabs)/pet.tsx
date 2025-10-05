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
import { MaterialIcons } from "@expo/vector-icons";
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

export default function Pets() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);

  // โหลดข้อมูลแบบ realtime
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(
      collection(db, "users", uid, "pets"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const petsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Pet, "id">),
      }));
      setPets(petsData);
    });

    return () => unsubscribe();
  }, []);

  // ฟังก์ชันยืนยันก่อนลบ
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

  // ฟังก์ชันลบสัตว์เลี้ยง
  const handleDelete = async (
    rowMap: { [key: string]: any },
    rowKey: string,
    petId: string
  ) => {
    try {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;
      await deleteDoc(doc(db, "users", uid, "pets", petId));
      console.log("Pet deleted:", petId);

      // ปิด row ที่เปิดอยู่
      if (rowMap[rowKey]) {
        rowMap[rowKey].closeRow();
      }
    } catch (error) {
      console.error("Error deleting pet:", error);
    }
  };

  // การ์ดสัตว์เลี้ยง
  const renderPetItem = ({ item }: { item: Pet }) => (
    <Pressable
      style={styles.petCard}
      android_ripple={{ color: "transparent" }}
      onPress={() =>
        router.push({
          pathname: "/(modals)/PetDetail",
          params: { pet: JSON.stringify(item) },
        })
      }
    >
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.petImage} />
      ) : (
        <MaterialIcons name="pets" size={40} color="gray" />
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.petName}>{item.name}</Text>
        <Text style={styles.petDetail}>
          {item.breed} • {item.age} ปี • {item.gender}
        </Text>
      </View>
    </Pressable>
  );

  // การ์ดซ่อน (swipe to delete)
  const renderHiddenItem = (
    { item }: { item: Pet },
    rowMap: { [key: string]: any }
  ) => (
    <View style={styles.hiddenContainer}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDelete(rowMap, item.id, item.id, item.name)}
      >
        <FontAwesome6 name="trash" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {/* Header เหมือนในภาพ */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>บัญชีผู้ใช้</Text>
          <TouchableOpacity
            style={styles.addButtonHeader}
            onPress={() => router.push("/(modals)/AddPet")}
          >
            <MaterialIcons name="add" size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* เนื้อหา */}
      <View style={styles.AddPetHeader}>
        <Text style={styles.AddPetHeaderText}>สัตว์เลี้ยงของคุณ</Text>
        <Text style={styles.noOfItem}>{pets.length}</Text>
      </View>

      {pets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="dog" size={100} color={"lightgray"} />
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
          disableRightSwipe={true}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#f2bb14",
  },
  header: {
    backgroundColor: "#f2bb14",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  addButtonHeader: {
    position: "absolute",
    right: 16,
    top: "110%",
    transform: [{ translateY: -14 }],
  },
  AddPetHeader: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  AddPetHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  noOfItem: {
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyContainer: {
    marginTop: 50,
    justifyContent: "center",
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
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  petName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  petDetail: {
    fontSize: 14,
    color: "#666",
  },
  hiddenContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    height: "100%",
    backgroundColor: "#C21F04",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
});