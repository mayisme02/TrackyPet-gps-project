import React from "react";
import { SafeAreaView, ScrollView, View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

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
};

export default function PetScreen() {
  const router = useRouter();
  const { pet } = useLocalSearchParams<{ pet: string }>();

  const petData: Pet | null = pet ? JSON.parse(pet) : null;
  if (!petData) return null;

  const handleEdit = () => {
    console.log("Edit pet info:", petData.id);
  };

  const handleViewHistory = () => {
    console.log("View history of:", petData.id);
  };

  return (
    <>
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ข้อมูลสัตว์เลี้ยง</Text>
        <View style={{ width: 26}} />
      </View>
      </SafeAreaView>

      <ScrollView>
        {/* Image */}
        {petData.photoURL ? (
          <Image source={{ uri: petData.photoURL }} style={styles.image} />
        ) : null}

        {/* Pet Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.petName}>{petData.name}</Text>
              <Text style={styles.petBreed}>{petData.breed}</Text>
            </View>
            <View style={styles.genderTag}>
              <Ionicons
                name={petData.gender === "female" ? "female" : "male"}
                size={18}
                color="#fff"
              />
            </View>
          </View>

          {/* About Section */}
          <View style={styles.aboutBox}>
            <Text style={styles.aboutText}>
              Age {"\n"}<Text style={styles.aboutValue}>{petData.age}</Text>
            </Text>
            <Text style={styles.aboutText}>
              Weight {"\n"}<Text style={styles.aboutValue}>{petData.weight}</Text>
            </Text>
            <Text style={styles.aboutText}>
              Height {"\n"}<Text style={styles.aboutValue}>{petData.height}</Text>
            </Text>
            <Text style={styles.aboutText}>
              Color {"\n"}<Text style={styles.aboutValue}>{petData.color}</Text>
            </Text>
          </View>

          {/* History */}
          <TouchableOpacity style={styles.history} onPress={handleViewHistory}>
            <MaterialIcons name="history" size={20} color="#333" />
            <Text style={styles.historyText}>ดูประวัติเส้นทางย้อนหลัง</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
    textAlign: "center",
    flex: 1,
  },
  image: { 
    width: "100%", 
    height: 250,
  },
  card: { 
    marginTop: -20, 
    backgroundColor: "#fff", 
    borderRadius: 20, 
    padding: 16, 
    marginHorizontal: 12, 
    shadowColor: "#333", 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 3
  },
  cardHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  petName: { 
    fontSize: 26, 
    fontWeight: "700", 
    color: "#333" 
  },
  petBreed: { 
    fontSize: 16, 
    color: "#555", 
    marginTop: 7
  },
  genderTag: { 
    backgroundColor: "#EC51A9FF", 
    borderRadius: 20, 
    padding: 8 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "600", 
    marginTop: 20, 
    marginBottom: 12 
  },
  aboutBox: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 20
  },
  aboutText: { 
    backgroundColor: "#F1BB5CFF", 
    padding: 12, 
    borderRadius: 12, 
    textAlign: "center", 
    width: 80, 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#333", 
    marginTop: 20,
    shadowColor: "#333", 
    shadowOpacity: 0.1, 
    shadowRadius: 6,
  },
  aboutValue: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#000" 
  },
  history: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  historyText: { 
    marginLeft: 6, 
    textDecorationLine: "underline", 
    color: "#333" 
  },
});