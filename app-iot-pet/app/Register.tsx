import React, { useState } from "react";
import {
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import styles from "../assets/styles/signup.styles";
import { Ionicons } from "@expo/vector-icons";
import { COLOR } from "../assets/constants/color"
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { JSX } from "react/jsx-runtime";

type RegisterResult = {
  success: boolean;
  error?: string;
};

export default function Register(): JSX.Element {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const { user, isLoading, register, token } = useAuthStore() as {
    user: { username: string; email: string; profileImage?: string } | null;
    isLoading: boolean;
    token: string | null;
    register: (username: string, email: string, password: string) => Promise<RegisterResult>;
  };

  const router = useRouter();

  const handleSignUp = async () => {
    const result = await register(username, email, password);

    if (!result.success) {
      Alert.alert("Error", result.error || "Registration failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Pet Tracker</Text>
            <Text style={styles.subtitle}>ตามหาสัตว์เลี้ยงของคุณ</Text>
          </View>

          <View style={styles.formContainer}>
            {/* USERNAME INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLOR.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="johndoe"
                  placeholderTextColor={COLOR.placeholderText}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* EMAIL INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLOR.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="johndoe@gmail.com"
                  value={email}
                  placeholderTextColor={COLOR.placeholderText}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* PASSWORD INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLOR.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="******"
                  placeholderTextColor={COLOR.placeholderText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={COLOR.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* SIGNUP BUTTON */}
            <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* FOOTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.link}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
