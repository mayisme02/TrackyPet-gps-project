import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  SafeAreaView,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { auth, db } from "../../firebase/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import Feather from '@expo/vector-icons/Feather';

// ---- interface ของ Pet ----
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

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<Pet[]>([]);

  // โหลดข้อมูลโปรไฟล์จาก Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // โหลดข้อมูลสัตว์เลี้ยงจาก Firestore
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

  // ถ้าโหลดอยู่
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f2bb14" />
      </SafeAreaView>
    );
  }

  // ข้อมูลผู้ใช้
  const name = profile?.username ?? "-";
  const avatar = profile?.avatarUrl ?? "";

  // ไปหน้าแจ้งเตือน
  const handleNoti = () => router.push("/(modals)/notification");

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f2bb14", dark: "#f2bb14" }}
      headerImage={
        <SafeAreaView style={styles.headerContainer}>
          <View style={styles.headerContent}>
            {/* รูปโปรไฟล์ */}
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="person-circle-outline" size={50} color="#fff" />
              </View>
            )}

            <Text style={styles.headerText}>สวัสดี! {name}</Text>
          </View>

          {/* ปุ่มแจ้งเตือน */}
          <TouchableOpacity style={styles.notiButton} onPress={handleNoti}>
            <Ionicons name="notifications" size={26} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      }
    >

      {/* --- หัวข้อสัตว์เลี้ยงของฉัน --- */}
      <View style={styles.petHeader}>
        <Text style={styles.panelTitle}>สัตว์เลี้ยงของฉัน</Text>
        <View style={styles.iconCircle}>
          <Feather name="chevrons-right" size={24} color="white" />
        </View>
      </View>

      {/* --- Container แสดงสัตว์เลี้ยง --- */}
      <View style={styles.petContainer}>
        <View style={styles.petBorder}>
          <View style={styles.petImgList}>
            {pets.length > 0 ? (
              pets.slice(0, 3).map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(modals)/PetDetail",
                      params: { pet: JSON.stringify(pet) },
                    })
                  }
                  activeOpacity={0.8}
                  style={styles.petBox}
                >
                  {pet.photoURL ? (
                    <Image
                      source={{ uri: pet.photoURL }}
                      style={styles.petImage}
                    />
                  ) : (
                    <View style={styles.petPlaceholder}>
                      <MaterialIcons name="pets" size={40} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.petName}>{pet.name}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noPetText}>ยังไม่มีสัตว์เลี้ยง</Text>
            )}
          </View>
        </View>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    height: 175,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 14,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
    color: "#fff",
  },
  notiButton: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 30,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  // --- หัวข้อสัตว์เลี้ยง ---
  petHeader: {
    flexDirection: "row",
    justifyContent: "space-between", // ทำให้หัวข้อชิดซ้าย ไอคอนชิดขวา
    alignItems: "center",
    marginHorizontal: 24, // ให้ตรงกับ margin ของ panelTitle
    marginVertical: 12,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    // ลบ marginHorizontal, marginVertical ออกเพราะย้ายไป petHeader
  },

  // --- Container สัตว์เลี้ยง ---
  petContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 20,

    // เงาสำหรับ iOS
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,

    // เงาสำหรับ Android
    elevation: 6,
  },
  petBorder: {
    alignItems: "center",
    paddingVertical: 10,
  },
  petImgList: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  petBox: {
    alignItems: "center",
    flex: 1,
  },
  petImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  petPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#f2bb14",
    justifyContent: "center",
    alignItems: "center",
  },
  petName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  noPetText: {
    color: "#aaa",
    fontSize: 16,
  },
  iconCircle: {
    width: 30,              // ขนาดวงกลม
    height: 30,
    borderRadius: 18,       // ครึ่งหนึ่งของ width/height เพื่อให้เป็นวงกลม
    backgroundColor: "#f2bb14", // สีพื้นหลัง
    justifyContent: "center",
    alignItems: "center",
  },
});