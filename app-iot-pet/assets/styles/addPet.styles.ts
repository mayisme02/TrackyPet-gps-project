import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    padding: 20,
  },

  imagePickerWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },

  inputImg: {
    height: 160,
    width: 160,
    backgroundColor: "#E7E7E7",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  nameTitle: {
    marginBottom: 16,
  },

  inputTitle: { 
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D3D3D3",
  },

  dropdown: {
    height: 50,
    backgroundColor: "#DEDEDE",
    borderRadius: 15,
    paddingHorizontal: 12,
  },

  placeholderStyle: {
    fontSize: 15,
    color: "#555",
  },

  selectedTextStyle: {
    fontSize: 15,
    color: "#333",
    marginLeft: 5,
  },

  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 3,
  },

  dropdownItemContainer: {
    borderBottomWidth: 0.5,
    borderColor: "#eee",
    paddingVertical: 4,
  },

  dropdownItemText: {
    fontSize: 15,
    color: "#333",
  },

  imageStyle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 5,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  gridItem: {
    width: "48%",
    marginBottom: 12,
  },

  genderBox: {
    flexDirection: "row",
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    overflow: "hidden",
    height: 48,
    borderWidth: 1,
    borderColor: "#D3D3D3",
  },

  genderOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  genderOptionSelected: {
    backgroundColor: "#F2BB14",
  },

  genderLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },

  genderLabelSelected: {
    color: "#333",
    fontWeight: "600",
  },

  addButton: {
    backgroundColor: "#885900",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  addButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});