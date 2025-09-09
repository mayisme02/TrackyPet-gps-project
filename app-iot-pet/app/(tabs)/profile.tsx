import React from 'react';
import { Text, StyleSheet, SafeAreaView } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function Profiles() {
  return (
    <>
        <ParallaxScrollView
          headerBackgroundColor={{ light: '#f2bb14', dark: '#f2bb14' }}
          headerImage={
            <SafeAreaView style={styles.headerContainer}>
                <Text style={styles.TextHeader}>บัญชีผู้ใช้</Text>
            </SafeAreaView>
          }>
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
});