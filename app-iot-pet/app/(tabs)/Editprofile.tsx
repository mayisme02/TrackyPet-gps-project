import React, { useEffect, useState } from "react";
import {View, Text, SafeAreaView, StyleSheet, TouchableOpacity, Image,ActivityIndicator, Alert, TextInput, ScrollView} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { auth, db } from "../../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../uploadToCloudinary";

export default function EditProfile() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentImage = downloadUrl ?? localUri ?? null;

  const handleBack = () => router.push("/(tabs)/profile");

useEffect(() => {
    // ดึงข้อมูลจาก Firestore
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const p = snap.data() as any;
          setUsername(p.username ?? "USER");
          setEmail(p.email ?? "");
          setPhone(p.telephone ?? "");
          if (p.avatarUrl) setDownloadUrl(p.avatarUrl);
        }
      } catch (e) {
        console.log("fetch profile error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("ต้องการสิทธิ์เข้าถึงรูปภาพ", "โปรดอนุญาตการเข้าถึงคลังรูปภาพ");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled) {
      setLocalUri(result.assets[0].uri);
      setDownloadUrl(null);
    }
  };

  const uploadImage = async () => {
    if (!localUri) return null;
    try {
      setUploading(true);
      const manipulated = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1280 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      const { secure_url } = await uploadToCloudinary(manipulated.uri);
      setDownloadUrl(secure_url);
      return secure_url;
    } catch (e: any) {
      Alert.alert("อัปโหลดล้มเหลว", e?.message ?? "Unknown error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      let avatarUrl = downloadUrl;
      if (!avatarUrl && localUri) {
        avatarUrl = await uploadImage();
        if (!avatarUrl) return;
      }

      await updateDoc(doc(db, "users", user.uid), {
        username,
        email,
        telephone: phone,
        avatarUrl: avatarUrl ?? null,
      });

      Alert.alert("สำเร็จ", "บันทึกโปรไฟล์เรียบร้อย", [
        { text: "ตกลง", onPress: () => router.replace("/(tabs)/profile") },
      ]);
    } catch (e: any) {
      Alert.alert("ผิดพลาด", e?.message ?? "ไม่สามารถบันทึกได้");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>แก้ไขโปรไฟล์</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.imageWrapper}>
          {currentImage ? (
            <Image source={{ uri: currentImage }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.imagePlaceholder]}>
              <Ionicons name="person-circle-outline" size={120} color="#bbb" />
            </View>
          )}
          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Ionicons name="create-outline" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoName}>{username}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#111" />
            <Text style={styles.infoText}>{email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color="#111" />
            <Text style={styles.infoText}>{phone}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>แก้ไขโปรไฟล์</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Telephone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {uploading && (
          <View style={{ alignItems: "center", gap: 6, marginTop: 6 }}>
            <ActivityIndicator />
            <Text>กำลังอัปโหลด…</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, uploading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={uploading}
        >
          <Text style={styles.saveBtnText}>บันทึก</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#FFB800",
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  backBtn: { position: "absolute", left: 16, top: 30, padding: 8 },
  body: { padding: 16 },

  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 190,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#eee",
    marginBottom: 16,
  },
  profileImage: { width: "100%", height: "100%" },
  imagePlaceholder: { justifyContent: "center", alignItems: "center" },
  editIcon: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    elevation: 3,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  infoName: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  infoText: { marginLeft: 8, fontSize: 14, color: "#111" },

  form: { marginBottom: 14 },
  formTitle: { fontWeight: "bold", marginBottom: 10, color: "#111" },
  input: {
    borderWidth: 1,
    borderColor: "#D2D5DA",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: "#F6F7F9",
  },

  saveBtn: {
    backgroundColor: "#FFB800",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
