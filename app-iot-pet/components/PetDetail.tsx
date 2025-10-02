import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function PetScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // แปลงทุกค่าให้เป็น string ปลอดภัย
    const id = Array.isArray(params.id) ? params.id[0] : params.id || "";
    const name = Array.isArray(params.name) ? params.name[0] : params.name || "";
    const breed = Array.isArray(params.breed) ? params.breed[0] : params.breed || "";
    const age = Array.isArray(params.age) ? params.age[0] : params.age || "";
    const weight = Array.isArray(params.weight) ? params.weight[0] : params.weight || "";
    const height = Array.isArray(params.height) ? params.height[0] : params.height || "";
    const gender = Array.isArray(params.gender) ? params.gender[0] : params.gender || "";
    const imageUri = Array.isArray(params.image) ? params.image[0] : params.image || "";

    const handleEdit = () => {
        console.log("Edit pet info:", id);
    };

    const handleViewHistory = () => {
        console.log("View history of:", id);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header with Back button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pet</Text>
                <View style={{ width: 26 }} />
            </View>

            {/* Image */}
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}

            {/* Pet Info */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.petName}>{name}</Text>
                        <Text style={styles.petBreed}>{breed}</Text>
                    </View>
                    <View style={styles.genderTag}>
                        <Ionicons
                            name={gender === "female" ? "female" : "male"}
                            size={18}
                            color="#fff"
                        />
                    </View>
                </View>

                {/* About Section */}
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.aboutBox}>
                    <Text style={styles.aboutText}>
                        Age {"\n"}<Text style={styles.aboutValue}>{age}</Text>
                    </Text>
                    <Text style={styles.aboutText}>
                        Weight {"\n"}<Text style={styles.aboutValue}>{weight}</Text>
                    </Text>
                    <Text style={styles.aboutText}>
                        Height {"\n"}<Text style={styles.aboutValue}>{height}</Text>
                    </Text>
                </View>

                {/* History link */}
                <TouchableOpacity style={styles.history} onPress={handleViewHistory}>
                    <MaterialIcons name="history" size={20} color="#333" />
                    <Text style={styles.historyText}>ดูประวัติเส้นทางย้อนหลัง</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f8f8"
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    headerTitle: { 
        fontSize: 18, 
        fontWeight: "600", 
        color: "#333" 
    },
    image: {
        width: "100%",
        height: 250,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    card: {
        marginTop: -20,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    petName: { 
        fontSize: 22, 
        fontWeight: "700", 
        color: "#333" 
    },
    petBreed: { 
        fontSize: 16,
        color: "#555", 
        marginTop: 4 
    },
    genderTag: {
        backgroundColor: "#e17055",
        borderRadius: 20,
        padding: 8,
    },
    sectionTitle: { fontSize: 18, 
        fontWeight: "600", 
        marginTop: 20,
        marginBottom: 12 
    },
    aboutBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    aboutText: {
        backgroundColor: "#fcd34d",
        padding: 12,
        borderRadius: 12,
        textAlign: "center",
        width: 80,
        fontSize: 13,
        fontWeight: "600",
        color: "#333",
    },
    aboutValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#000",
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