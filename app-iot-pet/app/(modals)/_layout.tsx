import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddPet" />
      <Stack.Screen name="EditPet" />
      <Stack.Screen name="EditProfile" />
      <Stack.Screen name="Notification" />
      <Stack.Screen name="PetProfile" />
    </Stack>
  );
}