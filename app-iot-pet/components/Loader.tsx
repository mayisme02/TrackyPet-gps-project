import React from "react";
import { View, ActivityIndicator } from "react-native";
import COLORS from "../assets/constants/color";

type LoaderProps = {
  size?: "small" | "large" | number; // React Native รองรับ "small" | "large" | number
};

export default function Loader({ size = "large" }: LoaderProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
      }}
    >
      <ActivityIndicator size={size} color={COLORS.primary} />
    </View>
  );
}
