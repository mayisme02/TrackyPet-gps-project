import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function Devices() {
  const [modalVisible, setModalVisible] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const openModal = () => {
    setCode('');
    setError('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setError('');
  };

  const handleConfirm = () => {
    // ตัวอย่าง validation: ไม่ให้เป็นค่าว่าง
    if (!code.trim()) {
      setError('กรุณาป้อนรหัสอุปกรณ์');
      return;
    }

    // TODO: ส่ง code ไปใช้งานจริง (API / navigation) ที่นี่
    console.log('Confirmed device code:', code);

    // ปิด modal หลังยืนยัน
    setModalVisible(false);
  };

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#f2bb14', dark: '#f2bb14' }}
        headerImage={
          <SafeAreaView style={styles.headerContainer}>
            <Text style={styles.TextHeader}>อุปกรณ์</Text>
          </SafeAreaView>
        }
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.addButton} onPress={openModal}>
            <Text style={styles.addButtonText}>เพิ่มอุปกรณ์</Text>
          </TouchableOpacity>
        </View>
      </ParallaxScrollView>

      {/* Modal popup สำหรับกรอกรหัส */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>กรอกรหัสเพื่อเชื่อมต่ออุปกรณ์</Text>

              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  if (error) setError('');
                }}
                placeholder="เช่น ABCD-1234"
                placeholderTextColor="#999"
                style={styles.input}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>ยืนยัน</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 175,
    justifyContent: 'center',
    alignItems: 'center',
  },
  TextHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },

  addButton: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#000C78FF',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Modal styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,

  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginTop: 8
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#081160FF',
    marginTop: 8
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
