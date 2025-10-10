import React, { useEffect, useState } from "react";
import {Text, StyleSheet,SafeAreaView,View,TouchableOpacity,Image,ActivityIndicator,ScrollView,} from "react-native";
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

export default function home() {
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

  // ไปหน้าบัญชีผู้ใช้
  const handleProfile = () => router.push("/(tabs)/profile");

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f2bb14", dark: "#f2bb14" }}
      headerImage={
        <SafeAreaView style={styles.headerContainer}>
          <View style={styles.headerContent}>
            {/* รูปโปรไฟล์ */}
            {avatar ? (
              <TouchableOpacity onPress={handleProfile}>
                <Image source={{ uri: avatar }} style={styles.profileImage} />
              </TouchableOpacity>
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
      {/* --- Container แสดงสัตว์เลี้ยง --- */}
      <View style={styles.mainTitleContainer}>
        <Text style={styles.mainTitle}>สัตว์เลี้ยงของคุณ</Text>
      </View>
      <View style={styles.petContainer}>
        <View style={styles.petBorder}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petImgList}
          >
            {pets.length > 0 ? (
              pets.map((pet, index) => (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(modals)/PetDetail",
                      params: { pet: JSON.stringify(pet) },
                    })
                  }
                  activeOpacity={0.8}
                  style={[
                    styles.petBox,
                    index === 0 && { marginLeft: 10 }, // การ์ดแรกขยับเข้ามานิดนึง
                  ]}
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
          </ScrollView>
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
    marginLeft: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
    color: "black",
  },
  notiButton: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
  },
  profileImage: {
    width: 40,
    height: 40,
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
  // --- Container สัตว์เลี้ยง ---
  petContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  petBorder: {
    alignItems: "center",
    paddingVertical: 10,
  },
  petImgList: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 5, // ให้การ์ดสุดท้ายโผล่มาทางขวา
  },
  petBox: {
    alignItems: "center",
    marginRight: 16, // ระยะห่างระหว่างการ์ด
  },
  petImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  petPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: "#D3D3D3FF",
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
  mainTitleContainer: {
    marginTop: 20,
    alignItems: "flex-start",
    marginHorizontal: 20,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },

});