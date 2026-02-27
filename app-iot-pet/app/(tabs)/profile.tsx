import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db } from "../../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import ProfileHeader from "@/components/ProfileHeader";
import { styles } from "@/assets/styles/profile.styles";

export default function Profile() {
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
      headerImage={<ProfileHeader title="บัญชีผู้ใช้" />}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* โปรไฟล์ */}
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

        {/* การ์ดข้อมูล */}
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

        {/* ปุ่มล่าง */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.optionCard} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={22} color="#4a3b2d" />
            <Text style={styles.optionText}>แก้ไขข้อมูล</Text>
            <Ionicons name="chevron-forward" size={20} color="#4a3b2d" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#c0392b" />
            <Text style={[styles.optionText, { color: "#c0392b" }]}>
              ออกจากระบบ
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#c0392b" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ParallaxScrollView>
  );
}