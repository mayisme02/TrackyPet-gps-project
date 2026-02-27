import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  form: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    color: "#885900",
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "gray",
    marginBottom: 6,
    marginLeft: 3,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 10,
    paddingHorizontal: 10,
    borderColor: "#EFEFEF",
    borderWidth: 1,
  },
  icon: {
    marginRight: 10,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: "gray",
  },
  eyeButton: {
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  btnSignup: {
    backgroundColor: "#885900",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loginLink: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  linkText: {
    color: "#885900",
    fontWeight: "800",
  },
});