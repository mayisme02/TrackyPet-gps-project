import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(202, 133, 63, 0.2)",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    marginTop: "80%",
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
  error: {
    color: "#C50000",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  forgotText: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
    color: "gray",
  },
  linkText: {
    color: "#885900",
    fontWeight: "800",
  },
  signupText: {
    textAlign: "center",
    marginTop: 25,
    fontSize: 16,
    color: "gray",
  },
  loginButton: {
    backgroundColor: "#885900",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
});