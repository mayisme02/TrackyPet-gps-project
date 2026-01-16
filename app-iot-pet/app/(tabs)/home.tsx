import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  SafeAreaView,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
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

/* ================= TYPES ================= */
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

  /* ================= LOAD PROFILE ================= */
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

  /* ================= LOAD PETS ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "users", uid, "pets"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Pet, "id">),
      }));
      setPets(data);
    });

    return () => unsub();
  }, []);

  /* ================= STATE ================= */
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f2bb14" />
      </SafeAreaView>
    );
  }

  const name = profile?.username ?? "-";
  const avatar = profile?.avatarUrl ?? "";

  const handleProfile = () => router.push("/(tabs)/profile");
  const handleViewAllPets = () => router.push("/(modals)/pet");

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f2bb14", dark: "#f2bb14" }}
      headerImage={
        <SafeAreaView style={styles.headerContainer}>
          <View style={styles.headerContent}>
            {avatar ? (
              <TouchableOpacity onPress={handleProfile}>
                <Image source={{ uri: avatar }} style={styles.profileImage} />
              </TouchableOpacity>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="person-circle-outline"
                  size={50}
                  color="#fff"
                />
              </View>
            )}
            <Text style={styles.headerText}>สวัสดี! {name}</Text>
          </View>
        </SafeAreaView>
      }
    >
      {/* ================= PET SECTION HEADER ================= */}
      <View style={styles.sectionHeader}>
        <Text style={styles.mainTitle}>สัตว์เลี้ยงของคุณ</Text>

        {pets.length > 0 && (
          <TouchableOpacity
            onPress={handleViewAllPets}
            style={styles.arrowButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color="#ffffff"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ================= PET LIST ================= */}
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
                    index === 0 && { marginLeft: 10 },
                  ]}
                >
                  {pet.photoURL ? (
                    <Image
                      source={{ uri: pet.photoURL }}
                      style={styles.petImage}
                    />
                  ) : (
                    <View style={styles.petPlaceholder}>
                      <MaterialIcons
                        name="pets"
                        size={40}
                        color="#fff"
                      />
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

/* ================= STYLES ================= */
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

  /* ===== Section Header ===== */
  sectionHeader: {
    marginTop: 20,
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  arrowButton: {
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#f2bb14", // เหลืองอ่อน
},
  /* ===== Pet List ===== */
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
    paddingRight: 5,
  },
  petBox: {
    alignItems: "center",
    marginRight: 16,
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
});
