import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  emptyContainer: {
    marginTop: 50,
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
  },

  petCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFEFE",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },

  petImage: {
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

  connectedBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#009B4B",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  petName: {
    fontSize: 16,
    fontWeight: "700",
  },

  petDetail: {
    fontSize: 14,
    color: "#6B7280",
  },

  deviceTag: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#009B4B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },

  deviceTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
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