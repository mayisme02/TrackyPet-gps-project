import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#885900",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    marginBottom: 20,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 15,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    color: "#333",
  },
  error: {
    color: "#C50000",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  success: {
    color: "#155724",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
    backgroundColor: "#d4edda",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c3e6cb",
  },
  btnReset: {
    backgroundColor: "#885900",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  backButton: {
    alignSelf: "center",
    marginTop: 20,
    padding: 10,
  },
  backLink: {
    fontSize: 16,
    color: "#885900",
    fontWeight: "700",
  },
});