import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { RectButton, Swipeable } from "react-native-gesture-handler";

interface PetItemProps {
  title: string;
  onDelete?: () => void;
  onPress?: () => void;
}

const PetItem: React.FC<PetItemProps> = ({ title, onDelete, onPress }) => {
  // render เฉพาะ swipe ด้านขวา -> ซ้าย
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    return (
      <View style={styles.rightActionWrapper}>
        <RectButton style={styles.deleteButton} onPress={onDelete}>
          <FontAwesome6 name="trash" size={22} color="#fff" />
        </RectButton>
      </View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      enableTrackpadTwoFingerGesture
    >
      <View style={styles.cardWrapper}>
        <Pressable style={styles.container} onPress={onPress}>
          <MaterialCommunityIcons name="dog" size={24} color="black" />
          <Text style={styles.title}>{title}</Text>
        </Pressable>
      </View>
    </Swipeable>
  );
};
export default PetItem;

const styles = StyleSheet.create({
  cardWrapper: {
    width: "90%",
    alignSelf: "center",
    marginVertical: 10,
  },
  container: {
    flexDirection: "row",
    backgroundColor: "#D4D4D4",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
  },
  title: {
    flex: 1,
    marginLeft: 10,
    fontSize: 17,
    fontWeight: "500",
  },
  rightActionWrapper: {
    justifyContent: "center",
    marginVertical: 10,
    borderRadius: 10,
    overflow: "hidden",
    width: 70,
    alignSelf: "center",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#C21F04",
    justifyContent: "center",
    alignItems: "center",
  },
});