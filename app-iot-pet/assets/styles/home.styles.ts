import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  header: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6E6E6",
    justifyContent: "center",
    alignItems: "center",
  },

  greeting: {
    marginLeft: 14,
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1F1F",
    flex: 1,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionHeader: {
    marginTop: 20,
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f2bb14",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  emptyCardLarge: {
    minHeight: 170,
    justifyContent: "center",
  },

  emptyCardMedium: {
    minHeight: 150,
    justifyContent: "center",
  },

  emptyCardSmall: {
    minHeight: 120,
    justifyContent: "center",
  },

  petBox: {
    alignItems: "center",
    marginRight: 16,
  },

  petImg: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },

  petPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
    alignItems: "center",
  },

  petName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
  },

  gpsBadge: {
    position: "absolute",
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#47AA00",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    right: -2,
    bottom: -2,
    justifyContent: "center",
    alignItems: "center",
  },

  gpsText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  deviceImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },

  deviceName: {
    fontSize: 16,
    fontWeight: "600",
  },

  status: {
    flexDirection: "row",
    alignItems: "center",
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#47AA00",
    marginRight: 6,
  },

  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  petMarkerPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5E6C8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  markerPetImg: {
    width: 45,
    height: 45,
    borderRadius: 20,
  },

  miniPin: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#f2bb14",
    borderRadius: 8,
    padding: 2,
  },

  locationText: {
    fontSize: 15,
    fontWeight: "600",
  },

  locationSubText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },

  locationTime: {
    marginTop: 4,
    fontSize: 13,
    color: "#888",
  },

  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2bb14",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  mapBtnText: {
    marginLeft: 6,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  emptyCenterLarge: {
    minHeight: 140,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  emptyCenterMedium: {
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  emptyCenterSmall: {
    minHeight: 90,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#7A7A7A",
    textAlign: "center",
  },

  emptyActionBtn: {
    marginTop: 14,
    backgroundColor: "#f2bb14",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },

  emptyActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  routeCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  routeContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  routeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },

  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5B400",
    justifyContent: "center",
    alignItems: "center",
  },

  routeImage: {
    width: 60,
    height: 60,
    marginRight: 16,
    borderRadius: 8,
  },

  loadingLocationBox: {
    minHeight: 90,
    justifyContent: "center",
    alignItems: "center",
  },
});