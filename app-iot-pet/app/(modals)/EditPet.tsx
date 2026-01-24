import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
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
            <Ionicons name="arrow-back" size={26} color="#000" />
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
              <Text style={styles.InputTitle}>เพศ</Text>
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
              <Text style={styles.InputTitle}>อายุ (ปี)</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.InputTitle}>น้ำหนัก (กก.)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.InputTitle}>ส่วนสูง (ซม.)</Text>
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

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  imageWrapper: {
    alignItems: "center",
    marginTop: 30,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: 130,
    height: 130,
    borderRadius: 100,
  },
  placeholderImage: {
    width: 130,
    height: 130,
    borderRadius: 100,
    backgroundColor: "#EAEAEA",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#DDDDDDFF",
    borderRadius: 20,
    padding: 6,
  },
  form: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F2F2F2",
  },
  dropdown: {
    height: 50,
    backgroundColor: "#DEDEDEFF",
    borderRadius: 15,
    paddingHorizontal: 12,
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 3,
  },
  dropdownItemContainer: {
    borderBottomWidth: 0.5,
    borderColor: "#eee",
    paddingVertical: 4,
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333",
  },
  imageStyle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  placeholderStyle: {
    fontSize: 15,
    color: "#333",
  },
  selectedTextStyle: {
    fontSize: 15,
    marginLeft: 8,
    color: "#333",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  gridItem: {
    width: "48%",
    marginBottom: 14,
  },
  genderBox: {
    flexDirection: "row",
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    overflow: "hidden",
    height: 48,
    borderWidth: 1,
    borderColor: "#D3D3D3",
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
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#885900ff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  InputTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
});