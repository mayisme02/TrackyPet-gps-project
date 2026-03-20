import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { auth, db } from "../../firebase/firebase";
import { onSnapshot, collection, deleteDoc, doc } from "firebase/firestore";
import ProfileHeader from "@/components/ProfileHeader";
import { styles } from "@/assets/styles/petDetail.styles";

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

export default function PetDetail() {
  const router = useRouter();
  const { pet } = useLocalSearchParams<{ pet: string }>();
  const petData: Pet | null = pet ? JSON.parse(pet) : null;

  const [deviceMatch, setDeviceMatch] = useState<DeviceMatch | null>(null);

  if (!petData) return null;

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

  const handleEdit = () => {
    router.push({
      pathname: "/(modals)/EditPet",
      params: { pet: JSON.stringify(petData) },
    });
  };

  const handleRouteHistory = () => {
    router.push({
      pathname: "/(modals)/RouteHistoryPet",
      params: {
        petId: petData.id,
        petName: petData.name,
        photoURL: petData.photoURL ?? "",
      },
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
          router.push("/PetList");
        },
      },
    ]);
  };

  return (
    <>
      <ProfileHeader
        title="ข้อมูลสัตว์เลี้ยง"
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {petData.photoURL ? (
          <Image source={{ uri: petData.photoURL }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="paw" size={48} color="#ccc" />
          </View>
        )}

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
            onPress={handleRouteHistory}
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