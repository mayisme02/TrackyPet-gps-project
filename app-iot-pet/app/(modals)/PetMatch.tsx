import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
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
} from "firebase/firestore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

type Device = {
  id: string;
  code: string;
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
  const parsedDevice: Device = JSON.parse(device as string);

  const [pets, setPets] = useState<Pet[]>([]);
  const [currentMatch, setCurrentMatch] = useState<any>(null);

  /* =====================
     LOAD PETS
  ====================== */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "users", uid, "pets"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setPets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, []);

  /* =====================
     LOAD CURRENT MATCH
  ====================== */
  useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const ref = doc(db, "users", uid, "deviceMatches", parsedDevice.code);

    return onSnapshot(ref, (snap) => {
      setCurrentMatch(snap.exists() ? snap.data() : null);
    });
  }, []);

  const petAlreadyUsed = async (petId: string) => {
    const uid = auth.currentUser!.uid;
    const snap = await getDocs(
      collection(db, "users", uid, "deviceMatches")
    );

    return snap.docs.some(
      (d) => d.data().petId === petId && d.id !== parsedDevice.code
    );
  };

  const onSelectPet = async (pet: Pet) => {
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
                deviceName: parsedDevice.name,
                petId: pet.id,
                petName: pet.name,
                photoURL: pet.photoURL || null,
                status: "CONNECTED",
                updatedAt: serverTimestamp(),
              }
            );
          },
        },
      ]
    );
  };

  const onPressStatus = () => {
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

  const statusText = currentMatch ? "เชื่อมต่อแล้ว" : "ไม่ได้เชื่อมต่อ";
  const isDisconnected = !currentMatch;

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={26} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>รายละเอียดของอุปกรณ์</Text>
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        <Text style={styles.sectionTitle}>อุปกรณ์</Text>

        <View style={styles.deviceCard}>
          <View style={styles.deviceRow}>
            <View style={styles.leftBlock}>
              {currentMatch?.photoURL ? (
                <Image
                  source={{ uri: currentMatch.photoURL }}
                  style={styles.petAvatar}
                />
              ) : (
                <View style={styles.emptyAvatar}>
                  <MaterialIcons name="pets" size={26} color="#999" />
                </View>
              )}
              <Text style={styles.deviceName}>{parsedDevice.name}</Text>
            </View>

            <TouchableOpacity onPress={currentMatch ? onPressStatus : undefined}>
              <View
                style={[
                  styles.deviceStatusPill,
                  isDisconnected && styles.deviceStatusPillInactive,
                ]}
              >
                <View
                  style={[
                    styles.deviceStatusDot,
                    isDisconnected && styles.deviceStatusDotInactive,
                  ]}
                />
                <Text
                  style={[
                    styles.deviceStatusText,
                    isDisconnected && styles.deviceStatusTextInactive,
                  ]}
                >
                  {statusText}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>เลือกสัตว์เลี้ยง</Text>

        <FlatList
          data={pets}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const isConnected = currentMatch?.petId === item.id;

            return (
              <TouchableOpacity
                disabled={isConnected}
                onPress={() => onSelectPet(item)}
                style={[
                  styles.petCard,
                  isConnected && styles.petCardActive,
                ]}
              >
                <View style={styles.petLeft}>
                  {item.photoURL ? (
                    <Image
                      source={{ uri: item.photoURL }}
                      style={styles.petImage}
                    />
                  ) : (
                    <View style={styles.emptyAvatarSmall}>
                      <MaterialIcons name="pets" size={22} color="#999" />
                    </View>
                  )}
                  <Text style={styles.petName}>{item.name}</Text>
                </View>

                {isConnected && (
                  <View style={styles.petDotWrapper}>
                    <View style={styles.petDot} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#f2bb14" },
  header: {
    backgroundColor: "#f2bb14",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "700",
    marginLeft: 12,
    fontSize: 20,
    color: "black",
    textAlign: "center",
    flex: 1,
  },

  container: { padding: 16 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  deviceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  deviceName: { fontSize: 17, fontWeight: "700" },

  deviceStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e7f9ef",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deviceStatusPillInactive: {
    backgroundColor: "#f1f1f1",
  },

  deviceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  deviceStatusDotInactive: {
    backgroundColor: "#9ca3af",
  },

  deviceStatusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#22c55e",
  },
  deviceStatusTextInactive: {
    color: "#6b7280",
  },

  petCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
  },
  petCardActive: {
    backgroundColor: "#F6FFFA",
    borderWidth: 1,
    borderColor: "#60D78C",
  },
  petLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  petName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  petDotWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#86efac",
    justifyContent: "center",
    alignItems: "center",
  },
  petDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },

  petAvatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
  },
  emptyAvatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },
  petImage: {
    width: 55,
    height: 55,
    borderRadius: 30,
  },
  emptyAvatarSmall: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },
});