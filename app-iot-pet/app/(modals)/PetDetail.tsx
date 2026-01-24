import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { auth, db } from "../../firebase/firebase";
import { onSnapshot, collection, deleteDoc, doc } from "firebase/firestore";
import ProfileHeader from "@/components/ProfileHeader";

/* ================= TYPES ================= */

type Pet = {
  id: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  height: string;
  gender: string;
  photoURL?: string;
};

type DeviceMatch = {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  petId: string;
};

/* ================= SCREEN ================= */

export default function PetDetail() {
  const { pet } = useLocalSearchParams<{ pet: string }>();
  const petData: Pet | null = pet ? JSON.parse(pet) : null;
  const router = useRouter();

  const [deviceMatch, setDeviceMatch] = useState<DeviceMatch | null>(null);

  if (!petData) return null;

  /* ================= LOAD DEVICE MATCH ================= */

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(collection(db, "users", uid, "deviceMatches"), (snap) => {
      const match = snap.docs
        .map((d) => d.data() as DeviceMatch)
        .find((m) => m.petId === petData.id);

      setDeviceMatch(match ?? null);
    });
  }, [petData.id]);

  /* ================= ACTIONS ================= */

  const handleEdit = () => {
    router.push({
      pathname: "/(modals)/EditPet",
      params: { pet: JSON.stringify(petData) },
    });
  };

  const confirmDelete = () => {
    Alert.alert("ยืนยันการลบ", `ต้องการลบ ${petData.name} หรือไม่`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          if (!auth.currentUser) return;
          const uid = auth.currentUser.uid;
          await deleteDoc(doc(db, "users", uid, "pets", petData.id));
          router.push("/pet");
        },
      },
    ]);
  };

  /* ================= UI ================= */

  return (
    <>
      {/* ===== HEADER ===== */}
      <ProfileHeader
        title="ข้อมูลสัตว์เลี้ยง"
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Image */}
        {petData.photoURL ? (
          <Image source={{ uri: petData.photoURL }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="paw" size={48} color="#ccc" />
          </View>
        )}

        {/* Info */}
        <View style={styles.card}>
          <Text style={styles.petName}>{petData.name}</Text>
          <Text style={styles.petBreed}>{petData.breed}</Text>

          <View style={styles.infoGrid}>
            <InfoBox label="อายุ" value={`${petData.age} ปี`} />
            <InfoBox label="เพศ" value={petData.gender} />
            <InfoBox label="น้ำหนัก" value={petData.weight} />
            <InfoBox label="ส่วนสูง" value={petData.height} />
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <MenuRow
            icon={<MaterialIcons name="gps-fixed" size={20} color="#ffffff" />}
            title="การเชื่อมต่ออุปกรณ์"
            subtitle={deviceMatch?.deviceName}
            onPress={() => {
              if (!deviceMatch) {
                Alert.alert(
                  "ยังไม่มีอุปกรณ์",
                  "สัตว์เลี้ยงนี้ยังไม่ได้เชื่อมต่ออุปกรณ์"
                );
                return;
              }

              router.push({
                pathname: "/(modals)/PetMatch",
                params: {
                  device: JSON.stringify({
                    code: deviceMatch.deviceCode,
                    name: deviceMatch.deviceName,
                    type: deviceMatch.deviceType,
                  }),
                },
              });
            }}
          />

          <MenuRow
            icon={<MaterialIcons name="history" size={20} color="#ffffff" />}
            title="ประวัติเส้นทางย้อนหลัง"
            onPress={() => {}}
          />

          <MenuRow
            icon={<AntDesign name="edit" size={20} color="#ffffff" />}
            title="แก้ไขข้อมูล"
            onPress={handleEdit}
          />
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
          <Text style={styles.deleteText}>ลบข้อมูล</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

/* ================= SUB COMPONENTS ================= */

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    backgroundColor: "#F2F2F7",
  },
  image: {
    width: "100%",
    height: 280,
  },
  placeholderImage: {
    width: "100%",
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEFF4",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 20,
    padding: 20,
  },
  petName: {
    fontSize: 24,
    fontWeight: "700",
  },
  petBreed: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 4,
  },
  infoGrid: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: "#E6E6E6",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5EA",
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#f2bb14",
  },
  menuTitle: {
    fontSize: 16,
  },
  menuSubtitle: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#009B4B",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 2,
    overflow: "hidden",
  },
  deleteButton: {
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#DFDFDF",
    alignItems: "center",
  },
  deleteText: {
    color: "#E80C00",
    fontSize: 16,
    fontWeight: "500",
  },
});