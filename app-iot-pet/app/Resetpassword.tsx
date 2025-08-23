import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/firebase';

// Type definition สำหรับ Firebase Auth Error
interface FirebaseAuthError extends Error {
  code: string;
}

// Type guard function เพื่อตรวจสอบว่าเป็น Firebase Auth Error หรือไม่
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

    // ตรวจสอบรูปแบบอีเมล
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
      
      // แสดง Alert แทน message เพื่อให้เด่นชัดขึ้น
      Alert.alert(
        'สำเร็จ',
        'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว กรุณาตรวจสอบอีเมลของคุณ',
        [
          {
            text: 'ตกลง',
            onPress: () => router.back(),
          }
        ]
      );
    } catch (err) {
      console.error('Reset password error:', err);
      
      let errorMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      
      // ใช้ type guard function ในการตรวจสอบ
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
          default:
            errorMessage = `เกิดข้อผิดพลาด: ${err.message}`;
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.resetCard}>
          <Text style={styles.title}>รีเซ็ตรหัสผ่าน</Text>
          <Text style={styles.subtitle}>
            กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.icon}>📧</Text>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {message ? (
              <Text style={styles.successText}>{message}</Text>
            ) : null}

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
            <Text style={styles.backLink}>← กลับไปหน้าเข้าสู่ระบบ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  resetCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  icon: {
    fontSize: 20,
    padding: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 15,
    paddingRight: 15,
    color: '#333',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#f8d7da',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  successText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#d4edda',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  btnReset: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 20,
    padding: 10,
  },
  backLink: {
    fontSize: 16,
    color: '#0a7ea4',
    fontWeight: '600',
    textAlign: 'center',
  },
});