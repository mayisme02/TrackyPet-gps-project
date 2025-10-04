import React, { useState } from "react";
import {
    SafeAreaView,
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

type Pet = {
    id: string;
    name: string;
    breed: string;
    age: string;
    weight: string;
    height: string;
    gender: string;
    photoURL?: string;
    dob?: string;
};

export default function EditPet() {
    const router = useRouter();
    const { pet } = useLocalSearchParams<{ pet: string }>();
    const petData: Pet | null = pet ? JSON.parse(pet) : null;
    if (!petData) return null;

    const [name, setName] = useState(petData.name);
    const [breed, setBreed] = useState(petData.breed);
    const [age, setAge] = useState(petData.age);
    const [weight, setWeight] = useState(petData.weight);
    const [height, setHeight] = useState(petData.height);
    const [gender, setGender] = useState<"เพศผู้" | "เพศเมีย">(petData.gender as "เพศผู้" | "เพศเมีย");
    const [photo, setPhoto] = useState(petData.photoURL || "");
    const [loading, setLoading] = useState(false);

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

    const handleSave = async () => {
        setLoading(true);
        try {
            Alert.alert("บันทึกสำเร็จ", "ข้อมูลสัตว์เลี้ยงถูกอัปเดตแล้ว");
            router.back();
        } catch (error) {
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
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
                    <Text style={styles.topHeaderTitle}>แก้ไขข้อมูลสัตว์เลี้ยง</Text>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                {/* รูปสัตว์เลี้ยง */}
                <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                    {photo ? (
                        <Image source={{ uri: photo }} style={styles.image} />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Text style={{ color: "#777" }}>เลือกรูปภาพ</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* ฟอร์ม */}
                <View style={styles.form}>
                    {/* ชื่อ */}
                    <View style={{ marginBottom: 15 }}>
                        <Text style={styles.label}>ชื่อ</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                            placeholder="ชื่อสัตว์เลี้ยง"
                        />
                    </View>

                    {/* Dropdown เลือกสายพันธุ์ */}
                    <View style={{ marginBottom: 15 }}>
                        <Text style={styles.label}>สายพันธุ์</Text>
                        <SelectCountry
                            style={styles.dropdown}
                            selectedTextStyle={styles.selectedTextStyle}
                            placeholderStyle={styles.placeholderStyle}
                            imageStyle={styles.imageStyle}
                            iconStyle={styles.iconStyle}
                            containerStyle={styles.dropdownContainer}
                            itemTextStyle={styles.dropdownItemText}
                            itemContainerStyle={styles.dropdownItemContainer}
                            activeColor="#f8e4b5"
                            maxHeight={230}
                            value={breed} // แสดงค่าเดิม
                            data={breedData}
                            valueField="value"
                            labelField="label"
                            imageField="image"
                            placeholder="เลือกสายพันธุ์"
                            onChange={(item) => setBreed(item.value)}
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
                            <Text style={styles.InputTitle}>อายุ (ปี)</Text>
                            <TextInput
                                value={age}
                                onChangeText={setAge}
                                keyboardType="numeric"
                                style={styles.input}
                                placeholder="อายุ"
                            />
                        </View>

                        {/* ส่วนสูง */}
                        <View style={styles.gridItem}>
                            <Text style={styles.InputTitle}>ส่วนสูง (ซม.)</Text>
                            <TextInput
                                value={height}
                                onChangeText={setHeight}
                                keyboardType="numeric"
                                style={styles.input}
                                placeholder="ส่วนสูง"
                            />
                        </View>

                        {/* น้ำหนัก */}
                        <View style={styles.gridItem}>
                            <Text style={styles.InputTitle}>น้ำหนัก (กก.)</Text>
                            <TextInput
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="numeric"
                                style={styles.input}
                                placeholder="น้ำหนัก"
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

const styles = StyleSheet.create({
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 18,
        backgroundColor: "#f2bb14",
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
        textAlign: "center",
    },
    imageContainer: {
        alignItems: "center",
        marginTop: 20,
    },
    image: {
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    placeholderImage: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "#EAEAEA",
        alignItems: "center",
        justifyContent: "center",
    },
    form: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    label: {
        fontSize: 14,
        color: "#333",
        fontWeight: "600",
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 13,
        marginBottom: 0,
        fontSize: 16,
        backgroundColor: "#F2F2F2",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    col: {
        flex: 1,
        marginHorizontal: 5,
    },
    // Dropdown
    dropdown: {
        height: 50,
        backgroundColor: "#DEDEDE",
        borderRadius: 15,
        paddingHorizontal: 12,
    },
    dropdownContainer: {
        backgroundColor: "#fff", // สีพื้นหลัง dropdown
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    dropdownItemContainer: {
        backgroundColor: "#fff", // พื้นหลังแต่ละตัวเลือก
        borderBottomWidth: 0.5,
        borderColor: "#eee",
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    dropdownItemText: {
        fontSize: 15,
        color: "#333", // ตัวหนังสือมองเห็นชัด
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
    iconStyle: {
        width: 22,
        height: 22,
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
        borderColor: "#D3D3D3",
    },
    genderOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    genderOptionSelected: {
        backgroundColor: "#F5B120",
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
    saveButton: {
        backgroundColor: "#885900ff",
        paddingVertical: 14,
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
        color: "#333",
    },
});