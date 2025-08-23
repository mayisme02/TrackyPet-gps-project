import React, { useState, useEffect } from 'react';
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
import { Link, router } from 'expo-router';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotLink, setShowForgotLink] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Cooldown timer for too many requests
  useEffect(() => {
    let timer: number;
if (isCooldown && cooldownTime > 0) {
  timer = setTimeout(() => setCooldownTime(cooldownTime - 1), 1000);
} else if (cooldownTime === 0) {
  setIsCooldown(false);
  setErrorMessage('');
}
return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isCooldown, cooldownTime]);

  const handleEmailLogin = async () => {
    if (isCooldown) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('รูปแบบอีเมลไม่ถูกต้อง');
      setShowForgotLink(false);
      return;
    }

    if (!password.trim()) {
      setErrorMessage('กรุณาใส่รหัสผ่าน');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setErrorMessage('');
      setShowForgotLink(false);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/wrong-password') {
        setErrorMessage('รหัสผ่านไม่ถูกต้อง');
        setShowForgotLink(true);
      } else if (error.code === 'auth/user-not-found') {
        setErrorMessage('ไม่พบบัญชีผู้ใช้นี้');
      } else if (error.code === 'auth/too-many-requests') {
        setErrorMessage('กรุณารอ 30 วินาที แล้วลองใหม่');
        setIsCooldown(true);
        setCooldownTime(30);
        setShowForgotLink(true);
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('อีเมลไม่ถูกต้อง');
      } else {
        setErrorMessage('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsLoading(false);
    }
    await signInWithEmailAndPassword(auth, email.trim(), password);
    setErrorMessage('');
    setShowForgotLink(false);
    router.replace('/(tabs)/home');
  };

  const handleGoogleLogin = async () => {
    if (isCooldown) return;
    Alert.alert(
      'Google Login',
      'Google Sign-In will be implemented with Firebase Auth',
      [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
    );
  };

  const handleFacebookLogin = async () => {
    if (isCooldown) return;
    Alert.alert(
      'Facebook Login',
      'Facebook Sign-In will be implemented with Firebase Auth',
      [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
    );
  };

  const handleForgotPassword = () => {
    router.push('./resetpassword');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>เข้าสู่ระบบ</Text>
          <View style={styles.form}>
            <TextInput
              style={[styles.input, isCooldown && styles.inputDisabled]}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isCooldown}
            />
            <TextInput
              style={[styles.input, isCooldown && styles.inputDisabled]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isCooldown}
            />

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            {showForgotLink && (
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>
                  ลืมรหัสผ่าน? <Text style={styles.linkText}>เปลี่ยนรหัสผ่าน</Text>
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.loginButton, (isCooldown || isLoading) && styles.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={isCooldown || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {isCooldown ? `กรุณารอสักครู่ (${cooldownTime} วินาที)` : 'LOGIN'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Link href="/Register" asChild>
            <TouchableOpacity>
              <Text style={styles.signupText}>
                ยังไม่มีบัญชีผู้ใช้? <Text style={styles.linkText}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or connect with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton, isCooldown && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isCooldown}
          >
            <Text style={styles.socialButtonText}>Login with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.facebookButton, isCooldown && styles.buttonDisabled]}
            onPress={handleFacebookLogin}
            disabled={isCooldown}
          >
            <Text style={styles.socialButtonText}>Login with Facebook</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
    loginCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7D4E34',
    fontWeight: '600',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#7D4E34',
  },
  form: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#D4D4D4',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputDisabled: {
    backgroundColor: '#f1f1f1',
    color: '#999',
  },
  error: {
    color: '#dc3545',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  forgotText: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    color: '#7D4E34',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#7D4E34',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  signupText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
    color: '#666',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#666',
  },
  socialButton: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: '#ffbf0eff',
    borderColor: '#e9ecef',
  },
  facebookButton: {
    backgroundColor: '#ffbf0eff',
    borderColor: '#e9ecef',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});