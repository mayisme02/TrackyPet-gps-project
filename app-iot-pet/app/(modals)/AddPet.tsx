import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, SafeAreaView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { auth, db } from "../../firebase/firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { uploadToCloudinary } from "../(auth)/uploadToCloudinary";

interface Pet {
  id: string;
  name: string;
  breed: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
  photoURL?: string;           
  cloudinaryPublicId?: string;
}

export default function AddPet() {
  const router = useRouter();
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [petList, setPetList] = useState<Pet[]>([]);

  async function ensureAuth() {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  }

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("ต้องอนุญาตการเข้าถึงรูปภาพก่อนจึงจะใช้งานได้");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleAddPet = async () => {
    setLoading(true);
    try {
      // 1) Upload รูปภาพไปยัง Cloudinary (ถ้ามี)
      let photoURL: string | null = null;
      let cloudinaryPublicId: string | null = null;

      if (image) {
        const manipulated = await ImageManipulator.manipulateAsync(
          image,
          [{ resize: { width: 1280 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        const { secure_url, public_id } = await uploadToCloudinary(manipulated.uri);
        photoURL = secure_url;
        cloudinaryPublicId = public_id;
      }

      // 2) Login ก่อนเขียน Firestore
      await ensureAuth();
      const uid = auth.currentUser!.uid;

      // 3) สร้างและอัปเดตเอกสาร users/{uid}
      await setDoc(
        doc(db, "users", uid),
        { lastActiveAt: serverTimestamp() },
        { merge: true }
      );

      // 4) เพิ่ม doc ใต้ users/{uid}/pets
      await addDoc(collection(db, "users", uid, "pets"), {
        name: petName,
        breed,
        gender,
        age,
        height,
        weight,
        photoURL,
        cloudinaryPublicId,
        createdAt: serverTimestamp(),
      });

      Alert.alert("เพิ่มข้อมูลสัตว์เลี้ยงเรียบร้อย!");

      // เปลี่ยนจาก router.back() เป็น router.replace ไปหน้า Pets โดยตรง
      router.replace("/(tabs)/Pet");

    } catch (err: any) {
      console.log("Firestore error:", err?.code, err?.message);
      Alert.alert("ผิดพลาด", err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // โหลดรายชื่อสัตว์เลี้ยงของผู้ใช้ที่กำลังล็อกอิน จาก Firestore แล้วเก็บไว้ใน state ของ React
  const getPetList = async () => {
    if (!auth.currentUser) return; // กัน null
    const uid = auth.currentUser.uid;

    const querySnapshot = await getDocs(collection(db, "users", uid, "pets"));

    const pets = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Pet, "id">), // cast ให้ตรง type
    }));

    setPetList(pets);
  };

  useEffect(() => {
    getPetList();
  }, []);

  return (
    <>
      <SafeAreaView style={styles.headerContainer}>
        {/* กลับไปยังหน้า Pet */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/Pet")}>
          <Text style={styles.backButtonText}>กลับ</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* รับข้อมูลจาก User */}
      <View style={styles.container}>
        <Text style={styles.title}>เพิ่มข้อมูล</Text>

        <Text style={styles.InputTitle}>ชื่อสัตว์เลี้ยง</Text>
        <TextInput placeholder="Pet Name" style={styles.input} value={petName} onChangeText={setPetName} />

        <Text style={styles.InputTitle}>สายพันธุ์</Text>
        <TextInput placeholder="Breed Name" style={styles.input} value={breed} onChangeText={setBreed} />

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.InputTitle}>เพศ</Text>
            <TextInput placeholder="Gender" style={styles.inputSmall} value={gender} onChangeText={setGender} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.InputTitle}>อายุ</Text>
            <TextInput placeholder="Age" style={styles.inputSmall} value={age} onChangeText={setAge} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.InputTitle}>ส่วนสูง</Text>
            <TextInput placeholder="Height" style={styles.inputSmall} value={height} onChangeText={setHeight} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.InputTitle}>น้ำหนัก</Text>
            <TextInput placeholder="Weight" style={styles.inputSmall} value={weight} onChangeText={setWeight} />
          </View>
        </View>

        <Text style={styles.InputTitle}>เพิ่มรูปภาพ</Text>
        <TouchableOpacity style={[styles.inputSmall, styles.imagePicker]} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={{ width: 150, height: 150 }} />
          ) : (
            <FontAwesome6 name="file-image" size={80} color={"lightgray"} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleAddPet}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>เพิ่ม</Text>}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 100,
    backgroundColor: "#f2bb14",
  },
  backButton: {
    paddingHorizontal: 20,
    alignItems: "flex-start"
  },
  backButtonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold"
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center"
  },
  input: {
    backgroundColor: "#eee",
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    fontSize: 16
  },
  row: {
    flexDirection: "row",
    marginBottom: 12,
    justifyContent: "space-between"
  },
  inputSmall: {
    backgroundColor: "#eee",
    borderRadius: 15,
    padding: 12,
    fontSize: 16,
    textAlign: "center"
  },
  imagePicker: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    height: 150
  },
  button: {
    backgroundColor: "#A16D28", 
    borderRadius: 12, 
    paddingVertical: 12, 
    alignItems: "center", 
    marginTop: 15
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18
  },
  InputTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 5
  },
});
