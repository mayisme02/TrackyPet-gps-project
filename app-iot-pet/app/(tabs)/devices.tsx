import React from 'react';
import { Text, StyleSheet, SafeAreaView, View } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function Devices() {
  return (
    <>
        <ParallaxScrollView
          headerBackgroundColor={{ light: '#f2bb14', dark: '#f2bb14' }}
          headerImage={
           <SafeAreaView style={styles.headerContainer}>
              <Text style={styles.TextHeader}>อุปกรณ์</Text>
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
    fontSize: 20, 
    fontWeight: 'bold', 
    color: 'black',
    textAlign: 'center',
  },
});
