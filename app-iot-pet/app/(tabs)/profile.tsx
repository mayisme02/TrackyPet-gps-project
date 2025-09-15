import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function Profile() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>บัญชีผู้ใช้</Text>
      </View>

      {/* Profile Image */}
      <Image
        source={{ uri: 'https://i.pravatar.cc/300' }} // แทนที่ด้วยรูปจริง
        style={styles.profileImage}
      />

      {/* Card */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
          <Ionicons name="pencil" size={20} color="black" />
          <Text style={{ marginLeft: 4 }}>แก้ไข</Text>
        </TouchableOpacity>

        <Text style={styles.userLabel}>USER</Text>

        {/* Email */}
        <View style={styles.row}>
          <MaterialIcons name="email" size={20} color="black" />
          <Text style={styles.infoText}> iamauser@gmail.com</Text>
        </View>

        {/* Phone */}
        <View style={styles.row}>
          <MaterialIcons name="phone" size={20} color="black" />
          <Text style={styles.infoText}> 0758519048</Text>
        </View>

        {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="red" />
        <Text style={{ color: 'red', marginLeft: 6 }}>ออกจากระบบ</Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

        const handleLogout = () => {
          router.replace('/Login');
        };
        const handleEditProfile = () => {
          router.push('./Editprofile');
        }



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#FFB800',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  profileImage: { width: '100%', height: 500, marginTop: -50 },
  card: {
    backgroundColor: '#fff',
    marginTop: -40,
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  editBtn: { flexDirection: 'row', alignSelf: 'flex-end', marginBottom: 10 },
  userLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  infoText: { fontSize: 16 },
  logoutBtn: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: '#FFB800',
    width: '100%',
    height: 70,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 12, color: 'white', marginTop: 3 },
  active: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
  }
});