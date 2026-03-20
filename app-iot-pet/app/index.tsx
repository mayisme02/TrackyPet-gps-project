import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { styles } from "@/assets/styles/index.styles";

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.replace('/(auth)/Login');
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/01.png')}
        style={styles.dogImg}
        resizeMode="contain"
      />
      
      <Text style={styles.title}>Hey! Welcome</Text>
      <Text style={styles.subtitle}>
        While You Sit And Stay - We'll Go Out And Play
      </Text>
      
      <TouchableOpacity style={styles.btn} onPress={handleGetStarted}>
        <Text style={styles.btnText}>GET STARTED</Text>
      </TouchableOpacity>
    </View>
  );
}