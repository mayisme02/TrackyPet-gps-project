import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
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
import ProfileHeader from "@/components/ProfileHeader";
import { styles } from "@/assets/styles/addPet.styles";

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

  /* ================= PICK IMAGE ================= */
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

  /* ================= ADD PET ================= */
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

      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const petsRef = collection(db, "users", auth.currentUser!.uid, "pets");

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
      router.back();
    } catch (error) {
      console.error("Error adding pet:", error);
      Alert.alert("ผิดพลาด", "ไม่สามารถเพิ่มข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ===== HEADER ===== */}
      <ProfileHeader
        title="เพิ่มสัตว์เลี้ยง"
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
        }
      />

      {/* ===== BODY ===== */}
      <View style={styles.container}>
        {/* รูปสัตว์ */}
        <View style={styles.imagePickerWrapper}>
          <TouchableOpacity style={styles.inputImg} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.inputImg} />
            ) : (
              <FontAwesome6 name="file-image" size={60} color="lightgray" />
            )}
          </TouchableOpacity>
        </View>

        {/* ชื่อสัตว์ */}
        <View style={styles.nameTitle}>
          <Text style={styles.inputTitle}>ชื่อสัตว์เลี้ยง</Text>
          <TextInput
            placeholder="Pet Name"
            style={styles.input}
            value={petName}
            onChangeText={setPetName}
          />
        </View>

        {/* สายพันธุ์ */}
        <View style={styles.nameTitle}>
          <Text style={styles.inputTitle}>สายพันธุ์</Text>
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
            <Text style={styles.inputTitle}>เพศ</Text>
            <View style={styles.genderBox}>
              {["เพศผู้", "เพศเมีย"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderOption,
                    gender === g && styles.genderOptionSelected,
                  ]}
                  onPress={() => setGender(g as any)}
                >
                  <Text
                    style={[
                      styles.genderLabel,
                      gender === g && styles.genderLabelSelected,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* อายุ */}
          <View style={styles.gridItem}>
            <Text style={styles.inputTitle}>อายุ</Text>
            <TextInput
              placeholder="เช่น 2 ปี"
              style={styles.input}
              value={age}
              onChangeText={setAge}
            />
          </View>

          {/* ส่วนสูง */}
          <View style={styles.gridItem}>
            <Text style={styles.inputTitle}>ส่วนสูง</Text>
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
            <Text style={styles.inputTitle}>น้ำหนัก</Text>
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