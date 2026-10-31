import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import {
  X,
  Flashlight,
  FlashlightOff,
  Scan,
  Keyboard,
  Camera,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

const { width, height } = Dimensions.get('window');

export default function BarcodeScanner({
  visible,
  onClose,
  onScan,
  title = 'Scan Barcode / SKU',
  subtitle = 'Align barcode within the target box',
}: BarcodeScannerProps) {
  const colors = useThemeStore((s) => s.colors);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setManualCode('');
      setTorch(false);
      if (Platform.OS !== 'web' && !permission?.granted) {
        requestPermission();
      }
    }
  }, [visible, permission?.granted]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    const rawData = result.data?.trim();
    if (!rawData) return;

    setScanned(true);
    onScan(rawData);
    onClose();
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Top Floating Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={22} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.titleWrapper}>
            <Text style={styles.screenTitle}>{title}</Text>
            <Text style={styles.screenSubtitle}>{subtitle}</Text>
          </View>

          {Platform.OS !== 'web' && permission?.granted ? (
            <TouchableOpacity
              style={[styles.controlBtn, torch && styles.controlBtnActive]}
              onPress={() => setTorch((prev) => !prev)}
              activeOpacity={0.7}
            >
              {torch ? (
                <Flashlight size={20} color="#0284c7" />
              ) : (
                <FlashlightOff size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* Camera Viewfinder (Native) or Web / Fallback Screen */}
        {Platform.OS !== 'web' && permission?.granted && !showManualInput ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'code93',
                  'itf14',
                  'codabar',
                  'qr',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Viewfinder Reticle Overlay */}
            <View style={styles.reticleOverlay}>
              <View style={styles.viewfinderBox}>
                {/* Corner Marks */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                {/* Laser scan line animation effect */}
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.scanHintText}>Point camera at product barcode</Text>
            </View>
          </View>
        ) : (
          <View style={styles.manualEntryContainer}>
            <View style={styles.manualIconBox}>
              <Scan size={44} color="#0284c7" />
            </View>

            <Text style={styles.manualTitle}>Barcode & SKU Input</Text>
            <Text style={styles.manualSubtitle}>
              {Platform.OS === 'web'
                ? 'Type or paste barcode/SKU below (Web Preview mode):'
                : 'Camera permission not granted. Enter code manually:'}
            </Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 890123456789 or SKU-1042"
                placeholderTextColor="#64748b"
                value={manualCode}
                onChangeText={setManualCode}
                autoFocus
                onSubmitEditing={handleManualSubmit}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.submitCodeBtn}
                onPress={handleManualSubmit}
                activeOpacity={0.8}
              >
                <Check size={18} color="#ffffff" />
                <Text style={styles.submitCodeBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {Platform.OS !== 'web' && !permission?.granted ? (
              <TouchableOpacity
                style={styles.grantPermissionBtn}
                onPress={requestPermission}
              >
                <Camera size={16} color="#0284c7" />
                <Text style={styles.grantPermissionBtnText}>Grant Camera Access</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Bottom Mode Switcher */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.modeToggleBtn}
            onPress={() => setShowManualInput((prev) => !prev)}
            activeOpacity={0.8}
          >
            {showManualInput ? (
              <>
                <Camera size={18} color="#ffffff" />
                <Text style={styles.modeToggleText}>Switch to Camera Viewfinder</Text>
              </>
            ) : (
              <>
                <Keyboard size={18} color="#ffffff" />
                <Text style={styles.modeToggleText}>Enter Barcode / SKU Manually</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#ffffff',
  },
  titleWrapper: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  reticleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  viewfinderBox: {
    width: Math.min(width * 0.78, 300),
    height: Math.min(width * 0.55, 200),
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38bdf8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  scanHintText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  manualEntryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  manualIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  manualSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '85%',
  },
  inputWrapper: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 360,
    gap: 10,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  submitCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    borderRadius: 12,
    height: 48,
  },
  submitCodeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  grantPermissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0c4a6e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  grantPermissionBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#27272a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  modeToggleText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
