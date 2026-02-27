import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  body: {
    padding: 20,
  },

  profileSection: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },

  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 80,
    backgroundColor: "#eee",
  },

  imagePlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 80,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },

  editIcon: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 6,
    elevation: 3,
  },

  username: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 10,
    color: "#333",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    elevation: 2,
  },

  cardTitle: {
    fontWeight: "600",
    fontSize: 16,
    color: "#4a3b2d",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#F6F7F9",
    borderWidth: 1,
    borderColor: "#F1F1F1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    fontSize: 14,
    color: "#111",
  },

  uploading: {
    alignItems: "center",
    marginVertical: 10,
  },

  uploadingText: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },

  saveBtn: {
    backgroundColor: "#885900",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },

  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});