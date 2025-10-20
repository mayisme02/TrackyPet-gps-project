import React, { useEffect, useState } from "react";
import { View, Text,StyleSheet,Image,TouchableOpacity,SafeAreaView,ActivityIndicator,Alert,ScrollView} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db } from "../../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import ParallaxScrollView from "@/components/ParallaxScrollView";

export default function profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleLogout = () => {
    Alert.alert("คุณต้องการออกจากระบบใช่ไหม", "", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ออกจากระบบ",
        style: "destructive",
        onPress: () => {
          router.replace("/(auth)/Login");
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    router.push("/(modals)/Editprofile");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const name = profile?.username ?? "-";
  const mail = profile?.email ?? "-";
  const phone = profile?.telephone ?? "-";
  const avatar = profile?.avatarUrl ?? "";

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f2bb14", dark: "#f2bb14" }}
      headerImage={
        <SafeAreaView style={styles.headerContainer}>
          <Text style={styles.headerText}>บัญชีผู้ใช้</Text>
        </SafeAreaView>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ส่วนโปรไฟล์ */}
        <View style={styles.profileSection}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.profileImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="person" size={60} color="#aaa" />
            </View>
          )}
          <Text style={styles.username}>{name}</Text>
        </View>

        {/* การ์ดข้อมูลผู้ใช้ */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <MaterialIcons name="email" size={20} color="#555" />
            <Text style={styles.infoText}>{mail}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={20} color="#555" />
            <Text style={styles.infoText}>{phone}</Text>
          </View>
        </View>

        {/* Section ด้านล่าง */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.optionCard} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={22} color="#4a3b2d" />
            <Text style={styles.optionText}>แก้ไขข้อมูล</Text>
            <Ionicons name="chevron-forward" size={20} color="#4a3b2d" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#c0392b" />
            <Text style={[styles.optionText, { color: "#c0392b" }]}>ออกจากระบบ</Text>
            <Ionicons name="chevron-forward" size={20} color="#c0392b" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  headerContainer: {
    height: 175,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "black" 
  },
  profileSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 100,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 100,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  username: { 
    fontSize: 22, 
    fontWeight: "600", 
    marginVertical: 12 
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  infoText: { 
    fontSize: 16, 
    marginLeft: 10, 
    color: "#333" 
  },
  bottomSection: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 40,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { 
      width: 0, 
      height: 1 
    },
    elevation: 2,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: "#4a3b2d",
    marginLeft: 12,
    fontWeight: "500",
  },
});