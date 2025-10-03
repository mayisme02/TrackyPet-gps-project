import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="Login" />
      <Stack.Screen name="Register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="Resetpassword" />
      <Stack.Screen name="PetProfile" />
      <Stack.Screen name="Notification" />
      <Stack.Screen name="EditProfile" />
      <Stack.Screen name="EditPet" />
      <Stack.Screen name="AddPet" />
    </Stack>
  );
}
