import React, { useState, useEffect, ReactNode } from 'react';
import { Text, TextStyle } from 'react-native';
import * as Font from 'expo-font';
import AppLoading from 'expo-app-loading';

interface ThaiTextProps {
  children: ReactNode;
  style?: TextStyle;
  fontWeight?: 'Regular' | 'Medium' | 'Bold';
}

export default function ThaiText({
  children,
  style,
  fontWeight = 'Regular',
}: ThaiTextProps) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        'Fredoka': require('../assets/fonts/Fredoka-VariableFont.ttf'),
      });
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return <AppLoading />;
  }

  const fontFamily = `Fredoka-${fontWeight}`;

  return (
    <Text style={[{ fontFamily }, style]}>
      {children}
    </Text>
  );
}
