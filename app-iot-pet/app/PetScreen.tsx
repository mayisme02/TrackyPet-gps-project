import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";

type Pet = {
  id: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  height: string;
  color: string;
  gender: string;
  photoURL?: string;
  dob?: string;
};

export default function PetScreen() {
  const router = useRouter();
  const { pet } = useLocalSearchParams<{ pet: string }>();
  const petData: Pet | null = pet ? JSON.parse(pet) : null;
  if (!petData) return null;

  const handleEdit = () => {
    console.log("Edit pet info:", petData.id);
    // 
  };

  const handleViewHistory = () => {
    console.log("View history of:", petData.id);
    // 
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Top yellow header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="black" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>ข้อมูลสัตว์เลี้ยง</Text>
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* รูปสัตว์เลี้ยง */}
        {petData.photoURL ? (
          <Image source={{ uri: petData.photoURL }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={{ color: "#666" }}>{petData.name}</Text>
          </View>
        )}

        {/* === White card: ข้อมูลสัตว์เลี้ยง === */}
        <View style={styles.infoCard}>
          <Text style={styles.petName}>
            {petData.name} - <Text style={styles.petBreed}>{petData.breed}</Text>
          </Text>

          <View style={styles.infoGrid}>
            <View style={[styles.infoBox]}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{petData.age ? petData.age : "-"}</Text>
            </View>

            <View style={[styles.infoBox]}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{petData.gender || "-"}</Text>
            </View>

            <View style={[styles.infoBox]}>
              <Text style={styles.infoLabel}>Weight</Text>
              <Text style={styles.infoValue}>{petData.weight || "-"}</Text>
            </View>

            <View style={[styles.infoBox]}>
              <Text style={styles.infoLabel}>Height</Text>
              <Text style={styles.infoValue}>{petData.height || "-"}</Text>
            </View>
          </View>
        </View>

        {/* === Gray Section: ดูประวัติเส้นทาง / การเชื่อมต่อ / แก้ไข === */}
        <View style={styles.greenSection}>
          {/* การเชื่อมต่ออุปกรณ์ */}
          <TouchableOpacity style={styles.grayRow}>
            <View style={styles.grayIcon}>
              <MaterialIcons name="devices" size={20} color="#483C32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>การเชื่อมต่ออุปกรณ์</Text>
              <Text style={styles.connectStatus}>เชื่อมต่อแล้ว</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* ประวัติเส้นทางของสัตว์เลี้ยง */}
          <TouchableOpacity style={styles.grayRow} onPress={handleViewHistory}>
            <View style={styles.grayIcon}>
              <MaterialIcons name="history" size={20} color="#483C32" />
            </View>
            <Text style={styles.infoText}>ดูประวัติเส้นทางย้อนหลัง</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>

          {/* แก้ไขข้อมูล */}
          <TouchableOpacity style={styles.grayRow} onPress={handleEdit}>
            <View style={styles.grayIcon}>
              <AntDesign name="edit" size={20} color="#483C32" />
            </View>
            <Text style={styles.infoText}>แก้ไขข้อมูล</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  // ส่วนของ Header
  container: {
    backgroundColor: "#f2bb14",
    height: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  // ปุ่มกลับไปยังหน้า Pet
  backButton: {
    padding: 4,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "black",
    textAlign: "center",
    flex: 1,
  },
  image: {
    width: "100%",
    height: 220,
  },
  placeholderImage: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F3",
  },
  /* การ์ดข้อมูลสัตว์เลี้ยง */
  infoCard: {
    marginTop: -20,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 12,
    paddingBottom: 6,
    shadowColor: "#333",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 15,
    color: "#483C32",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  // Gray section (เมนูด้านล่าง) 
  greenSection: {
    marginTop: 15,
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  grayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#E5E5E5FF",
    borderBottomWidth: 1,
    borderBottomColor: "#DFDFDFFF",
  },
  grayIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#D1CFC9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#483C32",
  },
  petName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    textAlign: "left",
    marginTop: 15,
    marginLeft: 5,
    paddingHorizontal: 16,
  },
  petBreed: {
    fontSize: 16,
    color: "#666",
    paddingHorizontal: 16,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 20,
  },
  infoBox: {
    width: "48%",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#FACE7F",
    textAlign: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  // ข้อมูลสัตว์เลี้ยงที่รับมาจาก User
  infoValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  // ส่วนที่แสดงการเชื่อมต่อ
  infoConnect: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7F0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  connectIcon: {
    marginRight: 10,
    marginTop: 2
  },
  connectText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  connectStatus: {
    fontSize: 13,
    color: "green", // แสดงถึงการ active
    marginTop: 2,
    marginLeft: 12,
  },

});