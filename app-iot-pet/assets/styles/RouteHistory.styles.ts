import { StyleSheet, Platform } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
  },

  mapWrap: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },

  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  topRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 40,
  },

  placeholder: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: "#EEF2F7",
    justifyContent: "center",
    alignItems: "center",
  },

  petName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  range: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    lineHeight: 18,
  },

  subMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
  },

  metricsRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  metricItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  metricIconTop: {
    width: 22,
    height: 22,
    marginBottom: 8,
  },

  metricLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },

  metricValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "900",
    textAlign: "center",
  },

  calloutWrapper: {
    alignItems: "center",
  },

  calloutHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },

  calloutCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 10,
  },

  rowLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  icon: {
    fontSize: 16,
    marginRight: 8,
  },

  text: {
    fontSize: 14.5,
    color: "#333",
    fontWeight: "700",
  },

  monoText: {
    fontSize: 14,
    color: "#444",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
  },

  mapPin: {
    width: 28,
    height: 28,
  },

  directionArrowWrap: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FDE6B8",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  playButton: {
    position: "absolute",
    zIndex: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  playButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  animatedPetOuter: {
    width: 42,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },

  headingArrow: {
    position: "absolute",
    top: -2,
    zIndex: 2,
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  animatedPetWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: "hidden",
  },

  animatedPetAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});