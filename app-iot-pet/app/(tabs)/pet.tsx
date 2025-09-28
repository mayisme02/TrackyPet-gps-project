import React, { useEffect, useState } from "react";
import { Text, StyleSheet, SafeAreaView, View, TouchableOpacity, FlatList, Image } from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { useRouter } from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { auth, db } from "../../firebase/firebase";
import { onSnapshot, collection } from "firebase/firestore";

interface Pet {
  id: string;
  name: string;
  breed: string;
  gender: string;
  age: string;
  color: string;
  height: string;
  weight: string;
  photoURL?: string;
}

export default function Pets() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);

  // โหลดข้อมูลแบบ realtime
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = collection(db, "users", uid, "pets");

    // ฟังการเปลี่ยนแปลงแบบ realtime
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const petsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Pet, "id">),
      }));
      console.log("Pets fetched:", petsData);
      setPets(petsData);
    });

    // cleanup
    return () => unsubscribe();
  }, []);

  const renderPetItem = ({ item }: { item: Pet }) => (
    <View style={styles.petCard}>
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.petImage} />
      ) : (
        <FontAwesome6 name="dog" size={50} color={"gray"} />
      )}
      <View style={{ marginLeft: 12 }}>
        <Text style={styles.petName}>{item.name}</Text>
        <Text style={styles.petDetail}>
          {item.breed} • {item.age} ปี • {item.gender}
        </Text>
      </View>
    </View>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f2bb14", dark: "#f2bb14" }}
      headerImage={
        <SafeAreaView style={styles.headerContainer}>
          <Text style={styles.TextHeader}>สัตว์เลี้ยง</Text>
        </SafeAreaView>
      }
    >
      <View style={styles.AddPetHeader}>
        <Text style={styles.AddPetHeaderText}>สัตว์เลี้ยงของคุณ</Text>
        <Text style={styles.noOfItem}>{pets.length}</Text>
      </View>

      {pets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="dog" size={100} color={"lightgray"} />
          <Text style={styles.emptyText}>เพิ่มความน่ารักด้วยสัตว์เลี้ยงตัวแรกของคุณ</Text>
        </View>
      ) : (
        <FlatList
          data={pets}
          renderItem={renderPetItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/(tabs)/AddPet")}
      >
        <Text style={styles.addButtonText}>เพิ่ม</Text>
      </TouchableOpacity>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 175,
    justifyContent: "center",
    alignItems: "center",
  },
  TextHeader: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  AddPetHeader: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  AddPetHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  noOfItem: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#885900ff",
    paddingVertical: 10,
    borderRadius: 8,
    margin: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyContainer: {
    marginTop: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
  },
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  petName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  petDetail: {
    fontSize: 14,
    color: "#666",
  },
});
