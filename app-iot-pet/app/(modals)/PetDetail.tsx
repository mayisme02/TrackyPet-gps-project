import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
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
import {
    onSnapshot,
    collection,
    query,
    orderBy,
    deleteDoc,
    doc,
} from "firebase/firestore";

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
    const { pet } = useLocalSearchParams<{ pet: string }>();
    const petData: Pet | null = pet ? JSON.parse(pet) : null;
    const router = useRouter();
    const [pets, setPets] = useState<Pet[]>([]);

    if (!petData) return null;

    const handleEdit = () => {
        router.push({
            pathname: "/(modals)/EditPet",
            params: { pet: JSON.stringify(petData) },
        });
    };

    // โหลดข้อมูลแบบ realtime
    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const q = query(
            collection(db, "users", uid, "pets"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const petsData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<Pet, "id">),
            }));
            setPets(petsData);
        });

        return () => unsubscribe();
    }, []);

    // ฟังก์ชันลบสัตว์เลี้ยง
    const handleDelete = async (petId: string, petName: string) => {
        try {
            if (!auth.currentUser) return;
            const uid = auth.currentUser.uid;
            await deleteDoc(doc(db, "users", uid, "pets", petId));
            console.log("Pet deleted:", petId);

            // หลังจากลบแล้วแสดง Popup และกลับไปหน้า pet.tsx
            Alert.alert(
                "ลบสำเร็จ",
                `ข้อมูลสัตว์เลี้ยง "${petName}" ถูกลบเรียบร้อยแล้ว`,
                [
                    {
                        text: "ตกลง",
                        onPress: () => router.push("/pet"), // กลับไปหน้า pet.tsx
                    },
                ]
            );
        } catch (error) {
            console.error("Error deleting pet:", error);
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบสัตว์เลี้ยงได้ โปรดลองอีกครั้ง");
        }
    };

    // ฟังก์ชันยืนยันก่อนลบ
    const confirmDelete = (petId: string, petName: string) => {
        Alert.alert(
            "ยืนยันการลบ",
            `คุณแน่ใจหรือไม่ว่าต้องการลบ ${petName}?`,
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ลบ",
                    style: "destructive",
                    onPress: () => handleDelete(petId, petName),
                },
            ]
        );
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
                    <Text style={styles.topHeaderTitle}>ข้อมูลสัตว์เลี้ยง</Text>
                    <View style={{ width: 26 }} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
                {/* รูปสัตว์เลี้ยง */}
                {petData.photoURL ? (
                    <Image source={{ uri: petData.photoURL }} style={styles.image} />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Text style={{ color: "#666" }}>{petData.name}</Text>
                    </View>
                )}

                {/* การ์ดข้อมูลสัตว์ */}
                <View style={styles.infoCard}>
                    <View style={styles.petRow}>
                        <Text style={styles.petName}>{petData.name} - </Text>
                        <Text style={styles.petBreed}>{petData.breed}</Text>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>อายุ</Text>
                            <Text style={styles.infoValue}>{petData.age ? petData.age + " ปี" : "-"}</Text>
                        </View>

                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>เพศ</Text>
                            <Text style={styles.infoValue}>{petData.gender || "-"}</Text>
                        </View>

                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>น้ำหนัก</Text>
                            <Text style={styles.infoValue}>{petData.weight || "-"}</Text>
                        </View>

                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>ส่วนสูง</Text>
                            <Text style={styles.infoValue}>{petData.height || "-"}</Text>
                        </View>
                    </View>
                </View>

                {/* ส่วนเมนูสีขาว */}
                <View style={styles.graySection}>
                    <TouchableOpacity style={styles.grayRow} onPress={handleViewHistory}>
                        <View style={styles.grayIcon}>
                            <MaterialIcons name="device-unknown" size={20} color="#333" />
                        </View>
                        <View style={styles.connectSection}>
                            <Text style={styles.connectText}>การเชื่อมต่ออุปกรณ์</Text>
                            <Text style={styles.connectStatus}>เชื่อมต่อแล้ว</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.grayRow} onPress={handleViewHistory}>
                        <View style={styles.grayIcon}>
                            <MaterialIcons name="history" size={20} color="#333" />
                        </View>
                        <Text style={styles.grayText}>ดูประวัติเส้นทางย้อนหลัง</Text>
                        <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.grayRow} onPress={handleEdit}>
                        <View style={styles.grayIcon}>
                            <AntDesign name="edit" size={20} color="#333" />
                        </View>
                        <Text style={styles.grayText}>แก้ไขข้อมูล</Text>
                        <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>
                </View>

                {/* ปุ่มลบ */}
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(petData.id, petData.name)}
                >
                    <AntDesign name="delete" size={20} color="#fff" />
                    <Text style={styles.deleteText}>ลบข้อมูลสัตว์เลี้ยง</Text>
                </TouchableOpacity>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#f2bb14",
        height: 120,
        justifyContent: "center",
        paddingHorizontal: 16,
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
        height: 250,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F3F3",
    },
    petRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 10,
        marginTop: 5,
        marginLeft: 5,
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
        marginTop: 5,
    },
    infoGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingBottom: 16,
        marginTop: 15,
    },
    infoBox: {
        flex: 1,
        backgroundColor: "#f2bb14",
        borderRadius: 14,
        paddingVertical: 12,
        marginHorizontal: 4,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#333",
    },
    infoCard: {
        marginTop: -20,
        backgroundColor: "#fff",
        borderRadius: 16,
        marginHorizontal: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        overflow: "hidden",
        paddingVertical: 10,
    },
    graySection: {
        marginTop: 10,
        marginHorizontal: 16,
        borderRadius: 16,
    },
    grayRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    grayIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#EAEAEAFF",
        alignItems: "center",
        justifyContent: "center",
    },
    grayText: {
        marginLeft: 12,
        fontSize: 15,
        fontWeight: "600",
        color: "#4E342E",
    },
    connectSection: {
        flexDirection: "column",
        marginLeft: 12,
    },
    connectText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#4E342E",
    },
    connectStatus: {
        fontSize: 12,
        color: "#2E7D32",
        marginTop: 2,
    },
    deleteButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#D32929FF",
        marginHorizontal: 16,
        marginTop: 20,
        paddingVertical: 14,
        borderRadius: 14,
    },
    deleteText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
        marginLeft: 8,
    },
});