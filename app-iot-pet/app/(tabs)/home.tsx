import React from 'react';
import { Text, StyleSheet, SafeAreaView, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ParallaxScrollView from '@/components/ParallaxScrollView';

const noti = () => {
  router.push('/Notification');
};

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#f2bb14', dark: '#f2bb14' }}
      headerImage={
        <SafeAreaView style={styles.headerContainer}>
          <Text style={styles.headerText}>สวัสดี ! คุณ </Text>
          <TouchableOpacity style={styles.noti} onPress={noti}>
            <Ionicons name="notifications" size={24} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      }
    >
      {/* เนื้อหาใน body ของ HomeScreen ใส่ตรงนี้ */}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 175,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: "black",
    marginLeft: 20,
  },
  noti: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12, // เพื่อให้ไอคอนอยู่กึ่งกลาง
  },
});