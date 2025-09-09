import { Text } from 'react-native';
import { StyleSheet } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function HomeScreen() {
  return (
    <>
        <ParallaxScrollView
          headerBackgroundColor={{ light: '#f2bb14', dark: '#f2bb14' }}
          headerImage={
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>
                {/* Home Header */}
            </Text>
          }>
        </ParallaxScrollView>
      </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
}); 
