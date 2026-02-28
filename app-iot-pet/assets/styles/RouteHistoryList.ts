import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  calendarWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    marginTop: 10,
  },
  calendar: {
    borderRadius: 14,
    overflow: "hidden",
    paddingBottom: 20,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 90,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#888",
    fontWeight: "600",
    textAlign: "center",
  },

  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFEFE",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },

  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  statusDone: {
    backgroundColor: "#E8F7EE",
  },

  statusRecording: {
    backgroundColor: "#EAFEFF",
  },

  statusText: {
    fontSize: 12.5,
    fontWeight: "900",
  },

  statusTextDone: {
    color: "#166534",
  },

  statusTextRecording: {
    color: "#126D9A",
  },

  range: {
    fontSize: 13.5,
    color: "#6B7280",
    fontWeight: "600",
    lineHeight: 18,
  },

  chevronWrap: {
    paddingLeft: 8,
  },

  hiddenContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 14,
    paddingRight: 16,
  },

  deleteButton: {
    width: 75,
    height: "100%",
    backgroundColor: "#C21F04",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
});