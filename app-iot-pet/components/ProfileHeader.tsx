import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileHeaderProps = {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export default function ProfileHeader({
  title,
  left,
  right,
}: ProfileHeaderProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.container}>
        {/* LEFT */}
        <View style={styles.side}>{left}</View>

        {/* TITLE */}
        <Text style={styles.title}>{title}</Text>

        {/* RIGHT */}
        <View style={styles.side}>{right}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#f2bb14",
  },
  container: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  side: {
    width: 32, 
    alignItems: "flex-end",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
});