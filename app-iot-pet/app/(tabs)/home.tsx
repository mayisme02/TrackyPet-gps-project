import { Text } from 'react-native';
import { StyleSheet } from 'react-native';
import { View, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const noti = () => {
  router.push('./notification');
}

export default function HomeScreen() {
  return(
 <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>HELLO !</Text>
        <TouchableOpacity style={styles.noti} onPress={noti}>
                  <Ionicons name="notifications" size={24} color="#fff" />
                </TouchableOpacity>
      </View>
    </SafeAreaView>);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#FFB800',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noti:{
    position: 'absolute',
    right: 16,
    top: 50,
  },
  headerText: { fontSize: 18, fontWeight: 'bold', color: 'white' ,top: 50,position: 'absolute', left: 16},
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
