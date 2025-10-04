import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, ActivityIndicator } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db } from "../../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { Alert } from "react-native";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { username, email, telephone, avatarUrl } = useLocalSearchParams<{
    username: string;
    email: string;
    telephone: string;
    avatarUrl?: string;
  }>();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    // subscribe realtime
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "คุณต้องการออกจากระบบใช่ไหม",
      "",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ออกจากระบบ",
          style: "destructive",
          onPress: () => {
            router.replace("/Login");
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push("./Editprofile");
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  // fallback ถ้า profile ยังไม่มี
  const name = profile?.username ?? username ?? "-";
  const mail = profile?.email ?? email ?? "-";
  const phone = profile?.telephone ?? telephone ?? "-";
  const avatar = profile?.avatarUrl ?? avatarUrl ?? "";

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f2bb14", dark: "#f2bb14" }}
      headerImage={
        <SafeAreaView style={styles.headerContainer}>
          <Text style={styles.headerText}>บัญชีผู้ใช้</Text>
        </SafeAreaView>
      }
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.profileImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={{ color: "#999" }}>No Image</Text>
        </View>
      )}

      <View style={styles.card}>
        <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
          <Ionicons name="pencil" size={20} color="black" />
          <Text style={{ marginLeft: 4 }}>แก้ไข</Text>
        </TouchableOpacity>

        <Text style={styles.userLabel}>{name}</Text>

        <View style={styles.row}>
          <MaterialIcons name="email" size={20} color="black" />
          <Text style={styles.infoText}>{mail}</Text>
        </View>

        <View style={styles.row}>
          <MaterialIcons name="phone" size={20} color="black" />
          <Text style={styles.infoText}>{phone}</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="red" />
          <Text style={{ color: "red", marginLeft: 6 }}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 175,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff"
  },
  profileImage: {
    width: "90%",
    height: 200,
    alignSelf: "center",
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    width: "90%",
    height: 200,
    alignSelf: "center",
    marginTop: 100,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },

  card: {
    backgroundColor: "#fff",
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: {
      width: 0,
      height: 2
    },
    elevation: 4,
  },
  editBtn: {
    flexDirection: "row",
    alignSelf: "flex-end",
    marginBottom: 10
  },
  userLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5
  },
  infoText: {
    fontSize: 16
  },
  logoutBtn: {
    flexDirection: "row",
    marginTop: 15,
    alignItems: "center",
  },
});