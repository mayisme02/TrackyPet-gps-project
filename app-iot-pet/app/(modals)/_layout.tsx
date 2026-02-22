import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddPet" />
      <Stack.Screen name="Editprofile" />
      <Stack.Screen name="EditPet" />
      <Stack.Screen name="pet" />
      <Stack.Screen name="PetDetail" />
      <Stack.Screen name="PetMatch" />
      <Stack.Screen name="RouteHistory" />
      <Stack.Screen name="RouteHistoryList" />
      <Stack.Screen name="RouteHistoryPet" />
    </Stack>
  );
}
