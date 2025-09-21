import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function Editprofile() {
  const handleBack = () => {
    router.push('/(tabs)/profile');
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>แก้ไขโปรไฟล์</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#FFB800',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { fontSize: 18, fontWeight: 'bold', color: 'white' ,top: 10},
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 35,
    padding: 8,
  },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});