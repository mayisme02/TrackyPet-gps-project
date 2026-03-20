import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  imageWrapper: {
    alignItems: "center",
    marginTop: 30,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: 130,
    height: 130,
    borderRadius: 100,
  },
  placeholderImage: {
    width: 130,
    height: 130,
    borderRadius: 100,
    backgroundColor: "#EAEAEA",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#DDDDDD",
    borderRadius: 20,
    padding: 6,
  },

  form: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  formGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },

  inputTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F2F2F2",
  },

  dropdown: {
    height: 50,
    backgroundColor: "#DEDEDE",
    borderRadius: 15,
    paddingHorizontal: 12,
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
  },
  placeholderStyle: {
    fontSize: 15,
    color: "#333",
  },
  selectedTextStyle: {
    fontSize: 15,
    marginLeft: 8,
    color: "#333",
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  gridItem: {
    width: "48%",
    marginBottom: 14,
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
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: "#885900",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});