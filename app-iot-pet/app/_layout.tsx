import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="Login" />
      <Stack.Screen name="Register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="Resetpassword" />
      <Stack.Screen name="AddPet" />
    </Stack>
  );
}
