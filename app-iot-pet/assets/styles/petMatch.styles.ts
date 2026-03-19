import { StyleSheet } from "react-native";

// CONSTANTS
export const AVATAR_SIZE = 48;
export const ROW_HEIGHT = 64;
export const CARD_PADDING = 16;
export const ACTIVE_INSET = 8;

export const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },

  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F7F8FA",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: CARD_PADDING,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  deviceTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  deviceImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },

  deviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  deviceDesc: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
  },

  deviceBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  petRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  petAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },

  petAvatarEmpty: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  petName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  recordingHint: {
    marginTop: 2,
    color: "#47AA00",
    fontWeight: "700",
    fontSize: 12,
  },

  statusPill: {
    backgroundColor: "#47AA00",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusPillInactive: {
    backgroundColor: "#F1F5F9",
  },

  statusPillLocked: {
    opacity: 0.6,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#ffffff",
  },

  statusTextInactive: {
    color: "#6B7280",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },

  petItem: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  petItemActive: {
    backgroundColor: "#FDFFF9",
    borderWidth: 0.5,
    borderRadius: 12,
    borderColor: "#47AA00",
    marginHorizontal: -(CARD_PADDING - ACTIVE_INSET),
    paddingHorizontal: CARD_PADDING - ACTIVE_INSET,
  },

  petItemDisabled: {
    opacity: 0.6,
  },

  petItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  petDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginLeft: AVATAR_SIZE + 12,
  },
});