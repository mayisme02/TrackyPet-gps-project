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
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { auth, db } from '../../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';

export default function Register() {
  const [username, setUsername] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        username,
        telephone,
        email,
      });

      Alert.alert('สำเร็จ', 'ลงทะเบียนสำเร็จ! กำลังนำคุณไปยังหน้าแท็บ');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('ข้อผิดพลาด', 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น');
      } else {
        Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  const handleLoginLink = () => {
    router.replace('/(auth)/Login');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/homecover.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.form}>
            <Text style={styles.appTitle}>สมัครสมาชิก</Text>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ชื่อผู้ใช้</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="user" size={20} color="gray" style={styles.icon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="กรอกชื่อผู้ใช้ของคุณ"
                  placeholderTextColor="gray"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            {/* Telephone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>เบอร์โทรศัพท์</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="phone" size={20} color="gray" style={styles.icon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="กรอกเบอร์โทรศัพท์"
                  placeholderTextColor="gray"
                  value={telephone}
                  onChangeText={setTelephone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>อีเมล</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="mail" size={20} color="gray" style={styles.icon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="กรอกอีเมลของคุณ"
                  placeholderTextColor="gray"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสผ่าน</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="lock" size={20} color="gray" style={styles.icon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="ป้อนรหัสผ่าน (อย่างน้อย 6 ตัว)"
                  placeholderTextColor="gray"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(prev => !prev)}
                  style={styles.eyeButton}
                >
                  <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="gray" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.btnSignup} onPress={handleSubmit}>
              <Text style={styles.btnText}>ลงทะเบียน</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLoginLink}>
              <Text style={styles.loginLink}>
                มีบัญชีผู้ใช้อยู่แล้ว? <Text style={styles.linkText}>เข้าสู่ระบบ</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    color: '#885900ff',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'gray',
    marginBottom: 6,
    marginLeft: 3,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderColor: 'lightgray',
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
  btnSignup: {
    backgroundColor: '#885900ff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  linkText: {
    color: '#885900ff',
    fontWeight: '800',
  },
});