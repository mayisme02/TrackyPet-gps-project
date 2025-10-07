import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { Link, router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/firebase';
import { doc, getDoc } from "firebase/firestore";
import { Feather } from '@expo/vector-icons'; 

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);

  // cooldown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isCooldown && cooldownTime > 0) {
      timer = setTimeout(() => setCooldownTime(prev => prev - 1), 1000);
    } else if (isCooldown && cooldownTime === 0) {
      setIsCooldown(false);
      setWrongCount(0);
      setErrorMessage('');
    }
    return () => clearTimeout(timer);
  }, [isCooldown, cooldownTime]);

  const handleEmailLogin = async () => {
    if (isCooldown) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('รูปแบบอีเมลไม่ถูกต้อง');
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

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const profile = snap.data();
        router.replace({
          pathname: "/(tabs)/home",
          params: {
            username: profile.username,
            email: profile.email,
            telephone: profile.telephone,
            avatarUrl: profile.avatarUrl ?? "",
          },
        });
      } else {
        setErrorMessage("ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล");
      }
      setWrongCount(0); // login สำเร็จ reset counter
    } catch (error: any) {
      console.error("Login error:", error);
      let msg = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
      if (error.code === "auth/wrong-password") msg = "รหัสผ่านไม่ถูกต้อง";
      else if (error.code === "auth/user-not-found") msg = "ไม่พบบัญชีผู้ใช้นี้";

      setErrorMessage(msg);

      setWrongCount(prev => prev + 1);

      if (wrongCount + 1 >= 3) {
        setIsCooldown(true);
        setCooldownTime(10);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/Resetpassword');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ImageBackground
        source={require('../../assets/images/petcover.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.appTitle}>Pet  IoT</Text>
          <View style={styles.form}>
            {/* Email input */}
            <View style={{ marginBottom: 20 }}>
              <View style={styles.inputWithIcon}>
                <Feather name="mail" size={20} color="gray" style={styles.icon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="อีเมล"
                  placeholderTextColor="gray"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isCooldown}
                />
              </View>
            </View> 

            {/* Password input */}
            <View style={{ marginBottom: 10 }}>
              <View style={styles.inputWithIcon}>
                <Feather name="lock" size={20} color="gray" style={styles.icon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="รหัสผ่าน"
                  placeholderTextColor="gray"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isCooldown}
                />
                <TouchableOpacity onPress={() => setShowPassword(prev => !prev)} style={styles.eyeButton}>
                  <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="gray" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot password link อยู่ใต้ password ตลอด */}
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>
                ลืมรหัสผ่าน? <Text style={styles.linkText2}>เปลี่ยนรหัสผ่าน</Text>
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, (isCooldown || isLoading) && styles.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={isCooldown || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {isCooldown ? `กรุณารอสักครู่ (${cooldownTime} วินาที)` : 'เข้าสู่ระบบ'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <Link href="/(auth)/Register" asChild>
            <TouchableOpacity>
              <Text style={styles.signupText}>
                ยังไม่มีบัญชีผู้ใช้? <Text style={styles.linkText}>ลงทะเบียน</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(202, 133, 63, 0.25)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    marginTop: '90%',
  },
  form: {
    backgroundColor: 'rgba(240,240,240,0.9)',
    borderRadius: 16,
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginHorizontal: 10,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 9,
    marginBottom: 15,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
  },
  icon: {
    marginRight: 10,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: 'gray',
  },
  eyeButton: {
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  error: {
    color: '#C50000FF',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  forgotText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
    color: 'gray',
  },
  linkText: {
    color: '#FFCC00FF',
    fontWeight: '800',
  },
  linkText2: {
    color: '#885900ff',
    fontWeight: '800',
  },
  signupText: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  loginButton: {
    backgroundColor: '#885900ff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});
