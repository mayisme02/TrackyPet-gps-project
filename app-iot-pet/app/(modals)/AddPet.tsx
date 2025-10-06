import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/firebase";
import { signInAnonymously } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadToCloudinary } from "../../cloud/uploadToCloudinary";
import { SelectCountry } from "react-native-element-dropdown";
import { breedData } from "../../assets/constants/breedData";

export default function AddPet() {
  const router = useRouter();
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState<"เพศผู้" | "เพศเมีย">("เพศผู้");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // เลือกรูปจากคลัง
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImage(manipResult.uri);
    }
  };

  // เพิ่มสัตว์เลี้ยง
  const handleAddPet = async () => {
    if (!petName || !breed) {
      Alert.alert("ผิดพลาด", "กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    setLoading(true);

    try {
      let photoURL = null;
      let cloudinaryPublicId = null;

      if (image) {
        const uploadResult = await uploadToCloudinary(image);
        photoURL = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
      }

      const user = auth.currentUser;
      if (!user) {
        await signInAnonymously(auth);
      }

      const petsRef = collection(db, "users", auth.currentUser?.uid!, "pets");

      await addDoc(petsRef, {
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

      Alert.alert("สำเร็จ", "เพิ่มสัตว์เลี้ยงเรียบร้อยแล้ว");
      router.push("/(tabs)/pet");
    } catch (error) {
      console.error("Error adding pet:", error);
      Alert.alert("ผิดพลาด", "ไม่สามารถเพิ่มข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="black" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>เพิ่มสัตว์เลี้ยง</Text>
        </View>
      </SafeAreaView>

      {/* Body */}
      <View style={styles.container}>
        {/* รูปสัตว์ */}
        <View style={styles.imagePickerWrapper}>
          <TouchableOpacity style={styles.inputImg} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.inputImg} />
            ) : (
              <FontAwesome6 name="file-image" size={60} color={"lightgray"} />
            )}
          </TouchableOpacity>
        </View>

        {/* ชื่อสัตว์ */}
        <View style={styles.nameTitle}>
          <Text style={styles.InputTitle}>ชื่อสัตว์เลี้ยง</Text>
          <TextInput
            placeholder="Pet Name"
            style={styles.input}
            value={petName}
            onChangeText={setPetName}
          />
        </View>

        {/* สายพันธุ์ */}
        <View style={styles.nameTitle}>
          <Text style={styles.InputTitle}>สายพันธุ์</Text>
          <SelectCountry
            style={styles.dropdown}
            selectedTextStyle={styles.selectedTextStyle}
            placeholderStyle={styles.placeholderStyle}
            imageStyle={styles.imageStyle}
            containerStyle={styles.dropdownContainer}
            itemTextStyle={styles.dropdownItemText}
            itemContainerStyle={styles.dropdownItemContainer}
            activeColor="#f8e4b5"
            maxHeight={230}
            value={breed}
            data={breedData}
            valueField="value"
            labelField="lable"
            imageField="image"
            placeholder="เลือกสายพันธุ์"
            onChange={(e) => setBreed(e.value)}
            renderRightIcon={() => (
              <Ionicons
                name="chevron-down"
                size={22}
                color="#555"
                style={{ marginRight: 10 }}
              />
            )}
          />
        </View>

        {/* เพศ / อายุ / ส่วนสูง / น้ำหนัก */}
        <View style={styles.infoGrid}>
          {/* เพศ */}
          <View style={styles.gridItem}>
            <Text style={styles.InputTitle}>เพศ</Text>
            <View style={styles.genderBox}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === "เพศผู้" && styles.genderOptionSelected,
                ]}
                onPress={() => setGender("เพศผู้")}
              >
                <Text
                  style={[
                    styles.genderLabel,
                    gender === "เพศผู้" && styles.genderLabelSelected,
                  ]}
                >
                  เพศผู้
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === "เพศเมีย" && styles.genderOptionSelected,
                ]}
                onPress={() => setGender("เพศเมีย")}
              >
                <Text
                  style={[
                    styles.genderLabel,
                    gender === "เพศเมีย" && styles.genderLabelSelected,
                  ]}
                >
                  เพศเมีย
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* อายุ */}
          <View style={styles.gridItem}>
            <Text style={styles.InputTitle}>อายุ</Text>
            <TextInput
              placeholder="เช่น 2 ปี"
              style={styles.input}
              value={age}
              onChangeText={setAge}
            />
          </View>

          {/* ส่วนสูง */}
          <View style={styles.gridItem}>
            <Text style={styles.InputTitle}>ส่วนสูง</Text>
            <TextInput
              placeholder="ซม."
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
            />
          </View>

          {/* น้ำหนัก */}
          <View style={styles.gridItem}>
            <Text style={styles.InputTitle}>น้ำหนัก</Text>
            <TextInput
              placeholder="กก."
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* ปุ่มบันทึก */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPet}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>บันทึก</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    backgroundColor: "#f2bb14",
    height: 120,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 10,
    padding: 8,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "black",
  },
  container: {
    padding: 20,
  },
  imagePickerWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  inputImg: {
    height: 160,
    width: 160,
    backgroundColor: "#E7E7E7FF",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  nameTitle: {
    marginBottom: 16,
  },
  InputTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F2F2F2FF",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D3D3D3FF",
  },
  dropdown: {
    height: 50,
    backgroundColor: "#DEDEDEFF",
    borderRadius: 15,
    paddingHorizontal: 12,
  },
  placeholderStyle: {
    fontSize: 15,
    color: "#555",
  },
  selectedTextStyle: {
    fontSize: 15,
    color: "#333",
    marginLeft: 5
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dropdownItemContainer: {
    borderBottomWidth: 0.5,
    borderColor: "#eee",
    paddingVertical: 4, // เพิ่ม padding บน-ล่าง
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333",
  },
  imageStyle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 5
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gridItem: {
    width: "48%",
    marginBottom: 12,
  },
  genderBox: {
    flexDirection: "row",
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    overflow: "hidden",
    height: 48,
    borderWidth: 1,
    borderColor: "#D3D3D3FF",
  },
  genderOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  genderOptionSelected: {
    backgroundColor: "#f2bb14",
  },
  genderLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  genderLabelSelected: {
    color: "#333",
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#885900ff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});