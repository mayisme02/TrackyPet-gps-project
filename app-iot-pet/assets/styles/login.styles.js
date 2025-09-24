// styles/login.styles.js
import { StyleSheet, Dimensions } from "react-native";
import COLOR from "../constants/color";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background || "#fff", // fallback กัน error
    padding: 20,
    justifyContent: "center",
  },
  scrollViewStyle: {
    flex: 1,
    backgroundColor: COLOR.background || "#fff",
  },
  topIllustration: {
    alignItems: "center",
    width: "100%",
  },
  illustrationImage: {
    width: width * 0.75,
    height: width * 0.75,
  },
  card: {
    backgroundColor: COLOR.cardBackground || "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: COLOR.black || "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLOR.border || "#ddd",
    marginTop: -24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLOR.textPrimary || "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLOR.textSecondary || "#666",
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLOR.textPrimary || "#000",
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLOR.inputBackground || "#f5f5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.border || "#ddd",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: COLOR.textDark || "#000",
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: COLOR.primary || "#6200ee",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: COLOR.black || "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: COLOR.white || "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: COLOR.textSecondary || "#666",
    marginRight: 5,
  },
  link: {
    color: COLOR.primary || "#6200ee",
    fontWeight: "600",
  },
});

export default styles;
