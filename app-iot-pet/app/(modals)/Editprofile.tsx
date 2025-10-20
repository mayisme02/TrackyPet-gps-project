import React, { useEffect, useState } from "react";
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, ScrollView, StatusBar} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { auth, db } from "../../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../../cloud/uploadToCloudinary";

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
      aspect: [1, 1],
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
        [{ resize: { width: 800 } }],
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
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f2bb14" barStyle="dark-content" />
      
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>แก้ไขโปรไฟล์</Text>
      </View>

      {/* Body */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage}>
            {currentImage ? (
              <Image source={{ uri: currentImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="person" size={60} color="#bbb" />
              </View>
            )}
            <View style={styles.editIcon}>
              <Ionicons name="create-outline" size={18} color="#4a3b2d" />
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>{username}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ข้อมูลผู้ใช้</Text>

          <TextInput
            style={styles.input}
            placeholder="ชื่อผู้ใช้"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="อีเมล"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="เบอร์โทรศัพท์"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {uploading && (
          <View style={{ alignItems: "center", marginVertical: 10 }}>
            <ActivityIndicator />
            <Text style={{ fontSize: 13, color: "#666", marginTop: 4 }}>กำลังอัปโหลดรูปภาพ…</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, uploading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={uploading}
        >
          <Text style={styles.saveBtnText}>บันทึกการเปลี่ยนแปลง</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#F9F9FB" },

  headerContainer: {
    backgroundColor: "#f2bb14",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    paddingHorizontal: 16,
    elevation: 3,
    paddingTop: 50,
  },
  backButton: {
    position: "absolute",
    left: 10,
    padding: 8,
    top: 50,
    paddingTop: 25
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "black",
  },

  body: { padding: 20 },
  profileSection: { 
    alignItems: "center", 
    marginBottom: 16,
    marginTop: 20
  },
  profileImage: { 
    width: 130, 
    height: 130, 
    borderRadius: 80, 
    backgroundColor: "#eee" 
  },
  imagePlaceholder: {
    width: 130, 
    height: 130, 
    borderRadius: 80,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  editIcon: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 6,
    elevation: 3,
  },
  username: { 
    fontSize: 20, 
    fontWeight: "600", 
    marginTop: 10, 
    color: "#333" 
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontWeight: "600", fontSize: 16, color: "#4a3b2d", marginBottom: 10 },
  input: {
    backgroundColor: "#F6F7F9",
    borderWidth: 1,
    borderColor: "#F1F1F1FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    fontSize: 14,
    color: "#111",
  },
  saveBtn: {
    backgroundColor: "#885900ff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});