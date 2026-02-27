import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { Feather } from '@expo/vector-icons';
import { styles } from "@/assets/styles/resetPassword.styles";

interface FirebaseAuthError extends Error {
  code: string;
}

function isFirebaseAuthError(error: unknown): error is FirebaseAuthError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setMessage('');
    setError('');

    if (!email.trim()) {
      setError('กรุณากรอกอีเมล');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setMessage('ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว');
      setEmail('');

      Alert.alert(
        'สำเร็จ',
        'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว กรุณาตรวจสอบอีเมลของคุณ',
        [{ text: 'ตกลง', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Reset password error:', err);
      let errorMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';

      if (isFirebaseAuthError(err)) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = 'ไม่พบบัญชีผู้ใช้นี้';
            break;
          case 'auth/invalid-email':
            errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'ปัญหาเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
            break;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <ImageBackground
      source={require('../../assets/images/homecover.jpg')} // ใส่ path รูปหมาของคุณ
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>รีเซ็ตรหัสผ่าน</Text>
          <Text style={styles.subtitle}>
            กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
          </Text>

          <View style={styles.form}>
            <View style={styles.inputWithIcon}>
              <Feather name="mail" size={20} color="gray" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.success}>{message}</Text> : null}

            <TouchableOpacity
              style={[styles.btnReset, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>ส่งลิงก์รีเซ็ตรหัสผ่าน</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleBackToLogin} style={styles.backButton}>
            <Text>
              กลับไปหน้า <Text style={styles.backLink}>เข้าสู่ระบบ</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
