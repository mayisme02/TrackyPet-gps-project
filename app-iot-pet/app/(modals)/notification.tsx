import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function notification() {
    const router = useRouter();
    const handleBack = () => {
        router.push('/(tabs)/home');
    }
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                          <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                <Text style={styles.headerText}>การแจ้งเตือน</Text>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFB800' },
    header: {
        backgroundColor: '#FFB800',
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        top: 50,
    },
    headerText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
    body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});