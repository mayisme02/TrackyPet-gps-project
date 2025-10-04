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
    gender: string;
    photoURL?: string;
    dob?: string;
};

export default function PetDetail() {
    const router = useRouter();
    const { pet } = useLocalSearchParams<{ pet: string }>();
    const petData: Pet | null = pet ? JSON.parse(pet) : null;
    if (!petData) return null;

    const handleEdit = () => {
        console.log("Edit pet info:", petData.id);
        // router.push('/EditPetScreen'...) // ใส่ navigation ที่ต้องการ
    };

    const handleViewHistory = () => {
        console.log("View history of:", petData.id);
        // router.push('/RouteHistory'...) // ใส่ navigation ที่ต้องการ
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
                {/* รูปสัตว์เลี้ยง (เต็มความกว้าง) */}
                {petData.photoURL ? (
                    <Image source={{ uri: petData.photoURL }} style={styles.image} />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Text style={{ color: "#666" }}>{petData.name}</Text>
                    </View>
                )}

                {/* === White card: ข้อมูลสัตว์เลี้ยง === */}
                <View style={styles.infoCard}>
                    <View style={styles.petRow}>
                        <Text style={styles.petName}>{petData.name}  - </Text>
                        <Text style={styles.petBreed}>{petData.breed}</Text>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={[styles.infoBox]}>
                            <Text style={styles.infoLabel}>Age</Text>
                            <Text style={styles.infoValue}>{petData.age ? petData.age + " ปี" : "-"}</Text>
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

                {/* === Gray section: สถานะการเชื่อมต่อ ประวัติเส้นทาง แก้ไข === */}
                <View style={styles.greenSection}>
                    {/* สถานะการเชื่อมต่อ */}
                    <TouchableOpacity style={styles.grayRow} onPress={handleViewHistory}>
                        <View style={styles.grayIcon}>
                            <MaterialIcons name="device-unknown" size={20} color="#333"/>
                        </View>
                        <View style={styles.connectSection}>
                            <Text style={styles.grayText}>การเชื่อมต่ออุปกรณ์</Text>
                            <Text style={styles.connectStatus}>เชื่อมต่อแล้ว</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>

                    {/* ประวัติเส้นทาง */}
                    <TouchableOpacity style={styles.grayRow} onPress={handleViewHistory}>
                        <View style={styles.grayIcon}>
                            <MaterialIcons name="history" size={20} color="#333" />
                        </View>
                        <Text style={styles.grayText}>ดูประวัติเส้นทางย้อนหลัง</Text>
                        <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>

                    {/* แก้ไขข้อมูล */}
                    <TouchableOpacity style={styles.grayRow} onPress={handleEdit}>
                        <View style={styles.grayIcon}>
                            <AntDesign name="edit" size={20} color="#333" />
                        </View>
                        <Text style={styles.grayText}>แก้ไขข้อมูล</Text>
                        <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: "auto" }} />
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
    topHeaderTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "black",
        textAlign: "center",
        flex: 1,
    },
    image: {
        width: "100%",
        height: 250,
    },
    placeholderImage: {
        width: "100%",
        height: 220,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F3F3",
    },
    // ชื่อสัตว์เลี้ยงและสายพันธุ์
    petRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 10,
        marginTop: 5,
        marginLeft: 5
    },
    petName: {
        fontSize: 24,
        fontWeight: "700",
        color: "#333",
        textAlign: "left",
        paddingHorizontal: 16,
    },
    petBreed: {
        fontSize: 16,
        color: "#666",
        marginLeft: -10,
        marginTop: 5
    },
    /* White card */
    infoCard: {
        marginTop: -20,
        backgroundColor: "#fff",
        borderRadius: 12,
        marginHorizontal: 12,
        shadowColor: "#333",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
        overflow: "hidden",
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
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        padding: 20,
        marginBottom: 20
    },
    label: {
        fontSize: 15,
        color: "#333",
    },
    value: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
    },
    infoBox: {
        width: "48%",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 10,
        marginBottom: 12,
        backgroundColor: "#F7CB54FF",
        textAlign: "center",
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
        marginBottom: 6,
        textAlign: "center",
    },
    infoValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#000",
        textAlign: "center",
    },
    /* Green section (เมนูด้านล่าง) */
    greenSection: {
        marginTop: 12,
        marginHorizontal: 12,
        borderRadius: 12,
        overflow: "hidden",
    },
    grayRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#E9E9E9FF",
        borderBottomWidth: 1,
        borderBottomColor: "#E1E1E1FF",
    },
    grayIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "#DADADAFF",
        alignItems: "center",
        justifyContent: "center",
    },
    grayText: {
        marginLeft: 12,
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
    },
    connectSection: {
        flexDirection: "column",
    },
    connectStatus: {
        fontSize: 12,
        marginLeft: 12,
        marginTop: 3,
        color: "#329205FF"
    }
});