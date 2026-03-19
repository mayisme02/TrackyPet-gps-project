import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1 },

  petMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F4C430",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  petImage: { width: 46, height: 46, borderRadius: 23 },
  pawMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFD65D",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },

  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  addFab: {
    position: "absolute",
    bottom: 160,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#905b0d",
    justifyContent: "center",
    alignItems: "center",
  },
  geofenceFab: {
    position: "absolute",
    bottom: 230,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#c62828",
    justifyContent: "center",
    alignItems: "center",
  },

  geofencePanel: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 12,
  },
  geofenceTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  geofenceActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  geofenceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  geofenceCancelBtn: {
    backgroundColor: "#E5E7EB",
  },

  geofenceConfirmBtn: {
    backgroundColor: "#905b0dff",
  },

  geofenceCancelText: {
    color: "#374151",
    fontWeight: "600",
  },

  geofenceConfirmText: {
    color: "#fff",
    fontWeight: "600",
  },

  confirmBtn: {
    marginTop: 12,
    backgroundColor: "#1a73e8",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  calloutWrapper: {
    alignItems: "center",
  },

  calloutHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e0e0e0",
    marginBottom: 8,
  },
  calloutCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 280,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: "#1a73e8",
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  row: {
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
  },
  monoText: {
    fontSize: 14,
    color: "#444",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  boldText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  modalRow: { flexDirection: "row", gap: 10 },
  submitBtn: {
    flex: 1,
    backgroundColor: "#905b0d",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 16 },

  geoBottomSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    paddingVertical: 20,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  geoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
    textAlign: "center",
  },

  geoActionRow: {
    flexDirection: "row",
    gap: 10,
  },

  geoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  geoCancel: {
    backgroundColor: "#E5E7EB",
  },

  geoSave: {
    backgroundColor: "#905b0dff",
  },

  geoUndo: {
    backgroundColor: "#F3F4F6",
  },

  geoCancelText: {
    color: "#374151",
    fontWeight: "600",
  },

  geoUndoText: {
    color: "#111827",
    fontWeight: "600",
  },

  geoSaveText: {
    color: "#fff",
    fontWeight: "700",
  },

  topFabContainer: {
    position: "absolute",
    right: 16,
    flexDirection: "column",
    gap: 12,
    zIndex: 20,
  },

  topFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  geoSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 10,
  },
  geoSaveDisabled: {
    backgroundColor: "#AE9367",
  },
  geoHint: {
    fontSize: 12,
    color: "#DC2626",
    textAlign: "center",
    marginTop: 6,
  },
  topRightControls: {
    position: "absolute",
    right: 16,
    flexDirection: "column",
    gap: 12,
    zIndex: 30,
  },

  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
  },

  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  sheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  sheetText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },

  sheetSubText: {
    marginTop: 4,
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "700",
  },

  saveFilterBtn: {
    marginTop: 14,
    backgroundColor: "#905b0dff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveFilterBtnDisabled: {
    backgroundColor: "#AE9367",
  },
  saveFilterText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
  },
  saveFilterHint: {
    marginTop: 8,
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "700",
  },

  presetRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },

  presetChipActive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#905b0d",
  },

  presetChipText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#374151",
  },

  presetChipTextActive: {
    color: "#905b0d",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  timeLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "800",
    marginBottom: 6,
  },

  timeBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
  },

  timeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  routeHint: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
    fontWeight: "700",
  },

  continueBtn: {
    backgroundColor: "#905b0dff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  continueText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  recordingText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#008917",
  },
});