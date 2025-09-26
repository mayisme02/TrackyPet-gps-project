import React, { useState, useEffect } from 'react';
import { View,Text,TextInput,TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator} from 'react-native';
import { Link, router } from 'expo-router';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth,db } from '../firebase/firebase';
import { doc, getDoc } from "firebase/firestore";

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotLink, setShowForgotLink] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
    const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCred.user;

    // ดึงข้อมูลจาก Firestore
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const profile = snap.data();

      // ส่งข้อมูลไป Profile
      router.replace({
        pathname: "/(tabs)/profile",
        params: {
          username: profile.username,
          email: profile.email,
          telephone: profile.telephone,
          avatarUrl: profile.avatarUrl ?? "",
        },
      });
    } else {
      Alert.alert("ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล");
    }
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.code === "auth/wrong-password") {
      setErrorMessage("รหัสผ่านไม่ถูกต้อง");
    } else if (error.code === "auth/user-not-found") {
      setErrorMessage("ไม่พบบัญชีผู้ใช้นี้");
    } else {
      setErrorMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  } finally {
    setIsLoading(false);
  }
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

  const handleForgotPassword = () => {
    router.push('./resetpasswordScreen');
  };

  

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
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

});