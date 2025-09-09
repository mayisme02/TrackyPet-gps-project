import React from 'react';
import { Text } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function Devices() {
  return (
    <>
        <ParallaxScrollView
          headerBackgroundColor={{ light: '#f2bb14', dark: '#f2bb14' }}
          headerImage={
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>
                {/* Devices Header */}
            </Text>
          }>
        </ParallaxScrollView>
      </>
  );
} 
