import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 8,
    color: "#111827",
    paddingHorizontal: 16,
  },

  empty: {
    textAlign: "center",
    marginTop: 80,
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "700",
  },

  cardFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  unreadBg: {
    backgroundColor: "#E8F8FF",
  },

  disabledCard: {
    opacity: 0.7,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F5E6C8",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
  },

  timeAgo: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    fontWeight: "700",
  },

  openingText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
});