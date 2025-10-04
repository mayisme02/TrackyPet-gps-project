import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.replace('/Login');
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

const { height, width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffbf0eff',
    minHeight: height,
    width: width,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  imagePlaceholderText: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  btn: {
    backgroundColor: '#905b0dff',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dogImg: {
    height: 300,
  }
});