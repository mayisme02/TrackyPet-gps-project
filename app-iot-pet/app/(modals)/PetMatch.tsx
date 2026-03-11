import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  where,
  limit,
} from "firebase/firestore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";
import ProfileHeader from "@/components/ProfileHeader";
import {
  styles,
  AVATAR_SIZE,
  CARD_PADDING,
  ACTIVE_INSET,
} from "@/assets/styles/petMatch.styles";

// TYPES
type UserDevice = {
  id: string;
  code: string;
  type?: string;
  name: string;
};

type Pet = {
  id: string;
  name: string;
  photoURL?: string;
};

export default function PetMatch() {
  const router = useRouter();
  const { device } = useLocalSearchParams();
  const parsedDevice: UserDevice = JSON.parse(device as string);

  const deviceType =
    (parsedDevice.type && DEVICE_TYPES[parsedDevice.type]) ||
    DEVICE_TYPES["GPS_TRACKER_A7670"];

  const [pets, setPets] = useState<Pet[]>([]);
  const [currentMatch, setCurrentMatch] = useState<any>(null);

  const [recordingForThisPet, setRecordingForThisPet] = useState<{
    routeId: string;
    petId: string;
    deviceCode: string | null;
  } | null>(null);

  /* ================= LOAD PETS ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(
      query(collection(db, "users", uid, "pets"), orderBy("createdAt", "asc")),
      (snap) =>
        setPets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    );
  }, []);

  /* ================= LOAD CURRENT MATCH ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(
      doc(db, "users", uid, "deviceMatches", parsedDevice.code),
      (snap) => setCurrentMatch(snap.exists() ? snap.data() : null)
    );
  }, [parsedDevice.code]);

  /* ================= RECORDING LISTENER (ONLY THIS PET) ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const petId = currentMatch?.petId as string | undefined;
    if (!petId) {
      setRecordingForThisPet(null);
      return;
    }

    const qRec = query(
      collection(db, "users", uid, "routeHistories"),
      where("status", "==", "recording"),
      where("petId", "==", petId),
      where("deviceCode", "==", parsedDevice.code),
      limit(1)
    );

    return onSnapshot(qRec, (snap) => {
      if (snap.empty) {
        setRecordingForThisPet(null);
        return;
      }

      const d = snap.docs[0];
      const data: any = d.data();

      setRecordingForThisPet({
        routeId: d.id,
        petId: data?.petId,
        deviceCode: data?.deviceCode ?? null,
      });
    });
  }, [currentMatch?.petId, parsedDevice.code]);

  const guardIfRecordingThisPet = () => {
    if (!recordingForThisPet) return false;

    Alert.alert(
      "กำลังบันทึกเส้นทางอยู่",
      "ไม่สามารถเปลี่ยนสัตว์เลี้ยงระหว่างบันทึกเส้นทางได้"
    );
    return true;
  };

  /* ================= CHECK PET USED ================= */
  const petAlreadyUsed = async (petId: string) => {
    const uid = auth.currentUser!.uid;

    const q = query(
      collection(db, "users", uid, "deviceMatches"),
      where("petId", "==", petId),
      limit(1)
    );
    const snap = await getDocs(q);

    if (snap.empty) return false;

    const matchedDocId = snap.docs[0].id;
    return matchedDocId !== parsedDevice.code;
  };

  /* ================= SELECT PET ================= */
  const onSelectPet = async (pet: Pet) => {
    if (guardIfRecordingThisPet()) return;

    if (currentMatch?.petId === pet.id) return;

    if (await petAlreadyUsed(pet.id)) {
      Alert.alert("ไม่สามารถเชื่อมต่อ", "สัตว์เลี้ยงนี้ถูกใช้งานแล้ว");
      return;
    }

    Alert.alert(
      "ยืนยันการเชื่อมต่อ",
      `เชื่อมต่อ ${parsedDevice.name} กับ ${pet.name}?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          onPress: async () => {
            const uid = auth.currentUser!.uid;
            await setDoc(
              doc(db, "users", uid, "deviceMatches", parsedDevice.code),
              {
                deviceCode: parsedDevice.code,
                deviceType: parsedDevice.type ?? "GPS_TRACKER_A7670",
                deviceName: parsedDevice.name,
                petId: pet.id,
                petName: pet.name,
                photoURL: pet.photoURL || null,
                status: "CONNECTED",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          },
        },
      ]
    );
  };

  /* ================= DISCONNECT ================= */
  const onPressStatus = () => {
    if (guardIfRecordingThisPet()) return;

    if (!currentMatch) return;

    Alert.alert(
      "ยกเลิกการเชื่อมต่อ",
      `ต้องการยกเลิกการเชื่อมต่อกับ ${currentMatch.petName} หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          style: "destructive",
          onPress: async () => {
            const uid = auth.currentUser!.uid;
            await deleteDoc(
              doc(db, "users", uid, "deviceMatches", parsedDevice.code)
            );
          },
        },
      ]
    );
  };

  const isLocked = !!recordingForThisPet;

  return (
    <>
      <ProfileHeader
        title="รายละเอียดอุปกรณ์"
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.deviceTop}>
            <Image
              source={{ uri: deviceType.image.uri }}
              style={styles.deviceImage}
            />
            <View style={styles.flex1}>
              <Text style={styles.deviceName}>{parsedDevice.name}</Text>
              <Text style={styles.deviceDesc}>{deviceType.description}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.deviceBottom}>
            <View style={styles.petRow}>
              {currentMatch?.photoURL ? (
                <Image
                  source={{ uri: currentMatch.photoURL }}
                  style={styles.petAvatar}
                />
              ) : (
                <View style={styles.petAvatarEmpty}>
                  <MaterialIcons name="pets" size={22} color="#9CA3AF" />
                </View>
              )}
              <View>
                <Text style={styles.petName}>
                  {currentMatch?.petName ?? "ว่าง"}
                </Text>

                {isLocked && (
                  <Text style={styles.recordingHint}>
                    กำลังบันทึกเส้นทาง…
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity onPress={currentMatch ? onPressStatus : undefined}>
              <View
                style={[
                  styles.statusPill,
                  !currentMatch && styles.statusPillInactive,
                  isLocked && styles.statusPillLocked,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    !currentMatch && styles.statusTextInactive,
                  ]}
                >
                  {currentMatch ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>เลือกสัตว์เลี้ยง</Text>

        <View style={styles.card}>
          {pets.map((item, index) => {
            const active = currentMatch?.petId === item.id;
            const isLast = index === pets.length - 1;

            return (
              <View key={item.id}>
                <TouchableOpacity
                  disabled={active || isLocked}
                  onPress={() => onSelectPet(item)}
                  style={[
                    styles.petItem,
                    active && styles.petItemActive,
                    isLocked && !active && styles.petItemDisabled,
                  ]}
                >
                  <View style={styles.petRow}>
                    {item.photoURL ? (
                      <Image
                        source={{ uri: item.photoURL }}
                        style={styles.petAvatar}
                      />
                    ) : (
                      <View style={styles.petAvatarEmpty}>
                        <MaterialIcons name="pets" size={22} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.petItemName}>{item.name}</Text>
                  </View>

                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#009B4B"
                    />
                  )}
                </TouchableOpacity>

                {!isLast && <View style={styles.petDivider} />}
              </View>
            );
          })}
        </View>
      </View>
    </>
  );
}