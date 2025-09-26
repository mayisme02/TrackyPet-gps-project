import React from 'react';
import { Text, StyleSheet, SafeAreaView, View, TouchableOpacity  } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { useRouter } from 'expo-router';  
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

export default function Pets() {
  const router = useRouter(); 
  const pets = []; 

  return (
    <>
       <ParallaxScrollView
        headerBackgroundColor={{ light: '#f2bb14', dark: '#f2bb14' }}
        headerImage={
          <SafeAreaView style={styles.headerContainer}>
            <Text style={styles.TextHeader}>สัตว์เลี้ยง</Text>
          </SafeAreaView>
        }>
        <View style={styles.AddPetHeader}>
          <Text style={styles.AddPetHeaderText}>สัตว์เลี้ยงของคุณ</Text>
        </View>

        {pets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="dog" size={100} color={'lightgray'}/>
            <Text style={styles.emptyText}>เพิ่มความน่ารักด้วยสัตว์เลี้ยงตัวแรกของคุณ</Text>
          </View>
        ) : (
          <View>
            {/* ถ้ามีสัตว์เลี้ยงแล้วจะ render list ตรงนี้ */}
          </View>
        )}

        <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => router.push('/(tabs)/AddPet')}>
            <Text style={styles.addButtonText}>เพิ่ม</Text>
        </TouchableOpacity>

      </ParallaxScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 175,
    justifyContent: 'center',
    alignItems: 'center',
  },
  TextHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  AddPetHeader: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  AddPetHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#885900ff',
    paddingVertical: 10,
    borderRadius: 8,
    margin: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    marginTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#888',
  },
});