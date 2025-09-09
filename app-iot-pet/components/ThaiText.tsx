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
        'Mitr-Bold': require('../assets/fonts/Mitr-Bold.ttf'),
        'Mitr-Light': require('../assets/fonts/Mitr-Light.ttf'),
        'Mitr-Medium': require('../assets/fonts/Mitr-Medium.ttf'),
        'Mitr-Regular': require('../assets/fonts/Mitr-Regular.ttf'),
        'Mitr-SemiBold': require('../assets/fonts/Mitr-SemiBold.ttf'),
      });
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return <AppLoading />;
  }

  const fontFamily = `Mitr-${fontWeight}`;

  return (
    <Text style={[{ fontFamily }, style]}>
      {children}
    </Text>
  );
}
