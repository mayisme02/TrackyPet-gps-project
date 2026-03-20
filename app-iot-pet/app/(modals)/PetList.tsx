import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Pressable,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/firebase";
import {
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import ProfileHeader from "@/components/ProfileHeader";
import { styles } from "@/assets/styles/petList.styles";

interface Pet {
  id: string;
  name: string;
  breed: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
  photoURL?: string;
}

type DeviceMatch = {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  petId: string;
};

export default function Pets() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [deviceMap, setDeviceMap] = useState<Record<string, DeviceMatch>>({});

  /* ================= LOAD PETS ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "users", uid, "pets"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Pet, "id">),
      }));
      setPets(data);
    });
  }, []);

  /* ================= LOAD DEVICE MATCH ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(
      collection(db, "users", uid, "deviceMatches"),
      (snap) => {
        const map: Record<string, DeviceMatch> = {};
        snap.docs.forEach((d) => {
          const m = d.data() as DeviceMatch;
          map[m.petId] = m;
        });
        setDeviceMap(map);
      }
    );
  }, []);

  /* ================= RENDER ITEM ================= */
  const renderPetItem = ({ item }: { item: Pet }) => {
    const device = deviceMap[item.id];

    return (
      <Pressable
        style={styles.petCard}
        onPress={() =>
          router.push({
            pathname: "/(modals)/PetDetail",
            params: { pet: JSON.stringify(item) },
          })
        }
      >
        <View>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.petImage} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="pets" size={32} color="#aaa" />
            </View>
          )}
          {device && <View style={styles.connectedBadge} />}
        </View>

        <View style={styles.info}>
          <Text style={styles.petName}>{item.name}</Text>
          <Text style={styles.petDetail}>
            {item.breed} • {item.age} ปี • {item.gender}
          </Text>

          {device && (
            <View style={styles.deviceTag}>
              <Text style={styles.deviceTagText}>{device.deviceName}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <ProfileHeader
        title="สัตว์เลี้ยงของคุณ"
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
        }
        right={
          <TouchableOpacity onPress={() => router.push("/(modals)/AddPet")}>
            <MaterialIcons name="add" size={28} color="#000" />
          </TouchableOpacity>
        }
      />

      {pets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="dog" size={100} color="lightgray" />
          <Text style={styles.emptyText}>
            เพิ่มความน่ารักด้วยสัตว์เลี้ยงตัวแรกของคุณ
          </Text>
        </View>
      ) : (
        <FlatList
          data={pets}
          renderItem={renderPetItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        />
      )}
    </>
  );
}