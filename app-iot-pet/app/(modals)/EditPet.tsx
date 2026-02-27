import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { SelectCountry } from "react-native-element-dropdown";
import { breedData } from "../../assets/constants/breedData";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import ProfileHeader from "@/components/ProfileHeader";
import { styles } from "@/assets/styles/editPet.styles";

export default function EditPet() {
  const router = useRouter();
  const { pet } = useLocalSearchParams<{ pet: string }>();
  const petData = pet ? JSON.parse(pet) : null;
  if (!petData) return null;

  const [name, setName] = useState(petData.name);
  const [breed, setBreed] = useState(petData.breed);
  const [age, setAge] = useState(petData.age);
  const [weight, setWeight] = useState(petData.weight);
  const [height, setHeight] = useState(petData.height);
  const [gender, setGender] = useState(petData.gender);
  const [photo, setPhoto] = useState(petData.photoURL || "");
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
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 500 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPhoto(manipulated.uri);
    }
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("กรุณาเข้าสู่ระบบก่อน");
        return;
      }

      const updatedPet = {
        ...petData,
        name,
        breed,
        age,
        weight,
        height,
        gender,
        photoURL: photo,
      };

      const petRef = doc(db, "users", user.uid, "pets", petData.id);
      await updateDoc(petRef, updatedPet);

      router.replace({
        pathname: "/(modals)/PetDetail",
        params: { pet: JSON.stringify(updatedPet) },
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการบันทึก:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ===== HEADER ===== */}
      <ProfileHeader
        title="แก้ไขข้อมูล"
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
        }
      />

      {/* ===== CONTENT ===== */}
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* รูปภาพ */}
        <View style={styles.imageWrapper}>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={{ color: "#777" }}>เลือกรูปภาพ</Text>
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Ionicons name="pencil" size={20} color="gray" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {/* ชื่อ */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>ชื่อ</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} />
          </View>

          {/* สายพันธุ์ */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>สายพันธุ์</Text>
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
              onChange={(item) => setBreed(item.value)}
            />
          </View>

          {/* เพศ / อายุ / น้ำหนัก / ส่วนสูง */}
          <View style={styles.infoGrid}>
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
                    onPress={() => setGender(g)}
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

            <View style={styles.gridItem}>
              <Text style={styles.inputTitle}>อายุ (ปี)</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.inputTitle}>น้ำหนัก (กก.)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.inputTitle}>ส่วนสูง (ซม.)</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>

          {/* ปุ่มบันทึก */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>บันทึกข้อมูล</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}