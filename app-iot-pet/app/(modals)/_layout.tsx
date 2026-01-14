import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddPet" />
      <Stack.Screen name="Editprofile" />
      <Stack.Screen name="EditPet" />
      <Stack.Screen name="notification" />
      <Stack.Screen name="PetDetail" />
      <Stack.Screen name="PetMatch" />
    </Stack>
  );
}
