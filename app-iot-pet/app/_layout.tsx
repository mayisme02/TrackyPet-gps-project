import { Stack } from "expo-router";
import { HapticTab } from "../components/HapticTab";


export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(modals)" />
      
    </Stack>
  );
}