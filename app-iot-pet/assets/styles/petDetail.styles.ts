import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    backgroundColor: "#F2F2F7",
  },
  image: {
    width: "100%",
    height: 280,
  },
  placeholderImage: {
    width: "100%",
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEFF4",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 20,
    padding: 20,
  },
  petName: {
    fontSize: 24,
    fontWeight: "700",
  },
  petBreed: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 4,
  },
  infoGrid: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: "#E6E6E6",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5EA",
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#f2bb14",
  },
  menuTitle: {
    fontSize: 16,
  },
  menuSubtitle: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#009B4B",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 2,
    overflow: "hidden",
  },
  deleteButton: {
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#DFDFDF",
    alignItems: "center",
  },
  deleteText: {
    color: "#E80C00",
    fontSize: 16,
    fontWeight: "500",
  },
});