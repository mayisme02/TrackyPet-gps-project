import React from 'react';
import { Text, StyleSheet, SafeAreaView } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import ThaiText from '@/components/ThaiText';

export default function Profiles() {
  return (
    <>
        <ParallaxScrollView
          headerBackgroundColor={{ light: '#f2bb14', dark: '#f2bb14' }}
          headerImage={
            <SafeAreaView style={styles.headerContainer}>
                <ThaiText style={styles.TextHeader}>บัญชีผู้ใช้</ThaiText>
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