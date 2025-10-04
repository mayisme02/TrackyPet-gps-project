import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, SafeAreaView, ActivityIndicator, Alert
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { auth, db } from "../../firebase/firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { uploadToCloudinary } from "../../cloud/uploadToCloudinary";
import { Ionicons } from "@expo/vector-icons";

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
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [gender, setGender] = useState<"เพศผู้" | "เพศเมีย">("เพศผู้");
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

      await ensureAuth();
      const uid = auth.currentUser!.uid;

      await setDoc(
        doc(db, "users", uid),
        { lastActiveAt: serverTimestamp() },
        { merge: true }
      );

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
      router.replace("/(tabs)/pet");

    } catch (err: any) {
      console.log("Firestore error:", err?.code, err?.message);
      Alert.alert("ผิดพลาด", err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getPetList = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const querySnapshot = await getDocs(collection(db, "users", uid, "pets"));

    const pets = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Pet, "id">),
    }));

    setPetList(pets);
  };

  useEffect(() => {
    getPetList();
  }, []);

  return (
    <>
      <SafeAreaView style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.container}>
        <Text style={styles.title}>เพิ่มข้อมูล</Text>

        {/* เพิ่มรูปภาพ */}
        <View style={styles.imagePickerWrapper}>
          <TouchableOpacity style={[styles.inputImg, styles.imagePicker]} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.inputImg} />
            ) : (
              <FontAwesome6 name="file-image" size={80} color={"lightgray"} />
            )}

          </TouchableOpacity>
        </View>

        {/* ชื่อสัตว์ */}
        <View style={styles.nameTitle}>
          <Text style={styles.InputTitle}>ชื่อสัตว์เลี้ยง</Text>
          <TextInput placeholder="Pet Name" style={styles.input} value={petName} onChangeText={setPetName} />
        </View>

        {/* สายพันธุ์ */}
        <View style={styles.nameTitle}>
          <Text style={styles.InputTitle}>สายพันธุ์</Text>
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setDropdownVisible(!dropdownVisible)}
            >
              <Text style={styles.dropdownButtonText}>
                {breed ? breed : "-- เลือกสายพันธุ์ --"}
              </Text>
            </TouchableOpacity>

            {dropdownVisible && (
              <View style={styles.dropdownList}>
                {[
                  { label: "สุนัขพันธุ์ชิสุ", value: "Shih Tzu" },
                  { label: "สุนัขพันธุ์ปอมเมอเรเนียน", value: "Pomeranian" },
                  { label: "สุนัขพันธุ์ลาบราดอร์", value: "Labrador" },
                  { label: "แมวพันธุ์เปอร์เซีย", value: "Persian" },
                  { label: "แมวพันธุ์สยาม", value: "Siamese" },
                  { label: "สุนัขพันธุ์เฟรนช์บูลด็อก", value: "Bulldog" },
                  { label: "แมวพันธุ์เมนคูน", value: "Maine Coon" },
                  { label: "สุนัขพันธุ์โกลเด้น รีทรีฟเวอร์", value: "Golden Retriever" }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => { setBreed(item.label); setDropdownVisible(false); }}
                  >
                    <Text style={styles.dropdownItem}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* เพศ + อายุ */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.InputTitle}>เพศ</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderButton, gender === "เพศผู้" && styles.genderButtonSelected]}
                onPress={() => setGender("เพศผู้")}
              >
                <Text style={[styles.genderText, gender === "เพศผู้" && styles.genderTextSelected]}>
                  เพศผู้
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.genderButton, gender === "เพศเมีย" && styles.genderButtonSelected]}
                onPress={() => setGender("เพศเมีย")}
              >
                <Text style={[styles.genderText, gender === "เพศเมีย" && styles.genderTextSelected]}>
                  เพศเมีย
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.InputTitle}>อายุ</Text>
            <TextInput placeholder="Age" style={styles.inputSmall} value={age} onChangeText={setAge} />
          </View>
        </View>

        {/* ส่วนสูง + น้ำหนัก */}
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

        {/* ปุ่มเพิ่ม */}
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
  imagePickerWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  imagePicker: {
    justifyContent: "center",
    alignItems: "center",
  },
  inputImg: {
    height: 200,
    width: 200,
    backgroundColor: "#eee",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
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
    marginBottom: 10,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 5
  },
  genderContainer: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  genderButtonSelected: {
    backgroundColor: "#F7CB54FF",
  },
  genderText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
  },
  genderTextSelected: {
    color: "#000",
    fontWeight: "600",
  },
  nameTitle: {
    marginTop: 12
  },
  dropdownWrapper: {
    marginTop: 5,
    position: "relative",
  },
  dropdownButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    paddingVertical: 8,
    position: "absolute",
    top: 55,
    width: "100%",
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#444",
  },
});