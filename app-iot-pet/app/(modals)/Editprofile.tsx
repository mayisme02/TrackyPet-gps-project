import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { auth, db } from "../../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../../cloud/uploadToCloudinary";
import ProfileHeader from "@/components/ProfileHeader";
import { styles } from "@/assets/styles/editProfile.styles";

export default function EditProfile() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentImage = downloadUrl ?? localUri ?? null;

  /* ================= LOAD PROFILE ================= */
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

  /* ================= PICK IMAGE ================= */
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

  /* ================= UPLOAD IMAGE ================= */
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

  /* ================= SAVE ================= */
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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      {/* ===== HEADER ===== */}
      <ProfileHeader
        title="แก้ไขโปรไฟล์"
        left={
          <TouchableOpacity onPress={() => router.replace("/(tabs)/profile")}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
        }
      />

      {/* ===== BODY ===== */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
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
          <View style={styles.uploading}>
            <ActivityIndicator />
            <Text style={styles.uploadingText}>กำลังอัปโหลดรูปภาพ…</Text>
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
    </>
  );
}