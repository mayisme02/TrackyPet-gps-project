// styles/signup.styles.js
import { StyleSheet } from "react-native";
import COLOR from "../constants/color";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLOR.background,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: COLOR.cardBackground,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLOR.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLOR.border,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "JetBrainsMono-Medium",
    color: COLOR.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLOR.textSecondary,
    textAlign: "center",
  },
  formContainer: { marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLOR.textPrimary,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLOR.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: 48,
    color: COLOR.textDark,
  },
  eyeIcon: { padding: 8 },
  button: {
    backgroundColor: COLOR.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: COLOR.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: COLOR.white,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: COLOR.textSecondary,
    marginRight: 5,
  },
  link: {
    color: COLOR.primary,
    fontWeight: "600",
  },
});

export default styles;