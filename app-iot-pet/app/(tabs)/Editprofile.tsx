import React, { useEffect, useState, } from 'react';
import { View, Text, SafeAreaView, StyleSheet,TouchableOpacity, TextInput, Alert, Image, ActivityIndicator} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Editprofile() {
  // ---------- State (typed) ----------
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null); // ไฟล์ใหม่ที่เลือก
  const [photoURL, setPhotoURL] = useState<string | null>(null); // ลิงก์รูปที่เก็บใน Storage
  const [loading, setLoading] = useState<boolean>(false);

  const handleBack = () => router.push('/(tabs)/profile');

  // ขอสิทธิ์คลังภาพ
  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  // ดึงข้อมูลเดิมด้วย email ที่กรอก
  useEffect(() => {
    if (email && email.includes('@')) fetchExisting(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const fetchExisting = async (id: string) => {
    try {
      const snap = await getDoc(doc(db, 'profile', id));
      if (snap.exists()) {
        const d = snap.data();
        setUsername((d.username as string) || '');
        setPhone((d.phone as string) || '');
        setPhotoURL((d.photoURL as string) || null);
      }
    } catch (e: any) {
      console.log('fetchExisting error', e?.message ?? e);
    }
  };

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });
      if (!res.canceled) {
        setImageUri(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('ไม่สามารถเปิดแกลเลอรีได้', e?.message ?? String(e));
    }
  };

  const uploadImageIfNeeded = async (id: string): Promise<string | null> => {
    // ถ้าไม่ได้เลือกรูปใหม่ให้ใช้ของเดิม
    if (!imageUri) return photoURL || null;

    const path = `profileImages/${encodeURIComponent(id)}.jpg`;
    const storageRef = ref(storage, path);

    const response = await fetch(imageUri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    setPhotoURL(url);
    return url;
  };

  const handleSave = async () => {
    try {
      if (!username || !email || !phone) {
        Alert.alert('กรุณากรอกข้อมูลให้ครบ');
        return;
      }
      setLoading(true);

      const url = await uploadImageIfNeeded(email);

      await setDoc(
        doc(db, 'users', email), // ใช้ email เป็น document id
        {
          username,
          email,
          phone,
          photoURL: url || null,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      Alert.alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
      handleBack();
    } catch (error: any) {
      console.error('Error saving profile: ', error);
      Alert.alert('เกิดข้อผิดพลาด', error?.message ?? String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>แก้ไขโปรไฟล์</Text>
      </View>

      {/* รูปโปรไฟล์ + การ์ดข้อมูล */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <View style={styles.imageWrap}>
          {imageUri || photoURL ? (
            <Image
              source={{ uri: imageUri ?? photoURL! }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="person" size={48} color="#999" />
            </View>
          )}

          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Ionicons name="create" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardName}>{username || 'USER'}</Text>
          <View style={styles.row}>
            <Ionicons name="mail" size={16} color="#000" />
            <Text style={styles.rowText}>{email || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="call" size={16} color="#000" />
            <Text style={styles.rowText}>{phone || '-'}</Text>
          </View>
        </View>
      </View>

      {/* ฟอร์ม */}
      <View style={styles.body}>
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
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>บันทึก</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#FFB800',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { fontSize: 18, fontWeight: 'bold', color: 'white', top: 10 },
  backBtn: { position: 'absolute', left: 16, top: 35, padding: 8 },

  imageWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#FFB800',
    padding: 8,
    borderRadius: 999,
  },

  card: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardName: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rowText: { marginLeft: 8 },

  body: { flex: 1, alignItems: 'center', marginTop: 14 },
  input: {
    width: '88%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  saveBtn: {
    backgroundColor: '#FFB800',
    padding: 15,
    borderRadius: 12,
    width: '88%',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});