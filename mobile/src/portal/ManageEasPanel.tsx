import { useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SYMBOLS as PRESET_SYMBOLS, useAppState } from '../AppState';
import { compressEaPicture } from '../eaPicture';

const ACCENT = '#7C5CFF';
const fallbackMascot = require('../../assets/mascot.jpg');
const QUICK_PRESETS = PRESET_SYMBOLS.slice(0, 8);

async function uriToDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const res = await fetch(uri);
  const blob = await res.blob();
  if (typeof FileReader === 'undefined') {
    throw new Error('FileReader unavailable');
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function pickWebFile(accept: string, capture?: string): Promise<string | null> {
  if (typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', capture);
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || '') || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.oncancel = () => {
      if (input.parentNode) document.body.removeChild(input);
      resolve(null);
    };
    input.click();
  });
}

export function ManageEasPanel() {
  const { eas, addEa } = useAppState();
  const [name, setName] = useState('');
  const [pictureDataUrl, setPictureDataUrl] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolDraft, setSymbolDraft] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const picking = useRef(false);

  const normalizeSymbol = (raw: string) =>
    raw.trim().toUpperCase().replace(/\s+/g, '');

  const addSymbolsFromText = (raw: string) => {
    const parts = raw
      .split(/[,;\s]+/)
      .map(normalizeSymbol)
      .filter(Boolean);
    if (parts.length === 0) return;
    setSymbols((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.includes(p)) next.push(p);
      }
      return next;
    });
    setSymbolDraft('');
  };

  const removeSymbol = (sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
  };

  const togglePreset = (sym: string) => {
    setSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym],
    );
  };

  const applyPickedUri = async (uri: string | null) => {
    if (!uri) return;
    setBusy(true);
    try {
      const dataUrl = await uriToDataUrl(uri);
      const compressed = (await compressEaPicture(dataUrl)) || dataUrl;
      setPictureDataUrl(compressed);
      setSavedMsg('');
    } catch {
      setSavedMsg('Could not read that image — try another file.');
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    if (picking.current) return;
    picking.current = true;
    try {
      if (Platform.OS === 'web') {
        const data = await pickWebFile('image/*');
        if (data) {
          setPictureDataUrl((await compressEaPicture(data)) || data);
        }
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setSavedMsg('Photo library permission is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg';
        const raw = `data:${mime};base64,${asset.base64}`;
        setPictureDataUrl((await compressEaPicture(raw)) || raw);
      } else {
        await applyPickedUri(asset.uri);
      }
    } finally {
      picking.current = false;
    }
  };

  const pickFromCamera = async () => {
    if (picking.current) return;
    picking.current = true;
    try {
      if (Platform.OS === 'web') {
        // Prefer camera capture on mobile Safari; desktop falls back to file
        const data = await pickWebFile('image/*', 'environment');
        if (data) {
          setPictureDataUrl((await compressEaPicture(data)) || data);
        }
        return;
      }
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setSavedMsg('Camera permission is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg';
        const raw = `data:${mime};base64,${asset.base64}`;
        setPictureDataUrl((await compressEaPicture(raw)) || raw);
      } else {
        await applyPickedUri(asset.uri);
      }
    } finally {
      picking.current = false;
    }
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setSavedMsg('EA NAME is required.');
      return;
    }
    if (!pictureDataUrl) {
      setSavedMsg('Upload a PICTURE FOR EA (camera, gallery, or file).');
      return;
    }
    if (symbols.length === 0) {
      setSavedMsg('Pick at least one symbol.');
      return;
    }
    setBusy(true);
    try {
      const pictureUri =
        (await compressEaPicture(pictureDataUrl)) || pictureDataUrl;
      await addEa({
        name: trimmed,
        pictureUri,
        symbols: [...symbols],
      });
      setSavedMsg(`Saved robot “${trimmed}” with your uploaded picture.`);
      setName('');
      setPictureDataUrl(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.h2}>Create a robot</Text>
        <Text style={styles.hint}>
          Upload your own EA picture from camera, gallery, or a file — then name
          it, pick symbols, and save.
        </Text>

        <Text style={styles.label}>EA NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Edges Scalper XAU"
          placeholderTextColor="#6B7280"
          style={styles.input}
          autoCorrect={false}
          accessibilityLabel="EA NAME"
        />

        <Text style={styles.label}>PICTURE FOR EA</Text>
        <View style={styles.previewRow}>
          <View style={styles.previewWrap}>
            {pictureDataUrl ? (
              <Image
                source={{ uri: pictureDataUrl }}
                style={styles.preview}
                accessibilityLabel="uploaded EA picture"
              />
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="image-outline" size={28} color="#6B7280" />
                <Text style={styles.previewEmptyText}>No image</Text>
              </View>
            )}
          </View>
          <View style={styles.uploadBtns}>
            <Pressable
              style={styles.uploadBtn}
              onPress={pickFromCamera}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Take photo with camera"
            >
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.uploadBtnText}>Camera</Text>
            </Pressable>
            <Pressable
              style={styles.uploadBtn}
              onPress={pickFromLibrary}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Choose from gallery or file"
            >
              <Ionicons name="images-outline" size={18} color="#fff" />
              <Text style={styles.uploadBtnText}>Gallery / File</Text>
            </Pressable>
            {pictureDataUrl ? (
              <Pressable
                onPress={() => setPictureDataUrl(null)}
                accessibilityLabel="Clear picture"
              >
                <Text style={styles.clearPic}>Clear picture</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.label}>SYMBOLS</Text>
        <Text style={styles.hint}>
          Type any symbol (e.g. NAS100, BTCUSD, custom pairs). Press Add or
          Enter. Optional presets below.
        </Text>
        {symbols.length > 0 ? (
          <View style={styles.chips}>
            {symbols.map((s) => (
              <Pressable
                key={s}
                onPress={() => removeSymbol(s)}
                style={[styles.chip, styles.chipOn]}
                accessibilityLabel={`Remove ${s}`}
              >
                <Text style={[styles.chipText, styles.chipTextOn]}>{s}</Text>
                <Ionicons name="close" size={12} color="#fff" />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>No symbols yet — add your own.</Text>
        )}
        <View style={styles.symbolEntry}>
          <TextInput
            value={symbolDraft}
            onChangeText={setSymbolDraft}
            placeholder="Type symbol…"
            placeholderTextColor="#6B7280"
            style={[styles.input, styles.symbolInput]}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Type symbol"
            onSubmitEditing={() => addSymbolsFromText(symbolDraft)}
            returnKeyType="done"
          />
          <Pressable
            style={styles.addSymBtn}
            onPress={() => addSymbolsFromText(symbolDraft)}
            accessibilityRole="button"
            accessibilityLabel="Add symbol"
          >
            <Text style={styles.addSymText}>Add</Text>
          </Pressable>
        </View>
        <Text style={styles.presetLabel}>Quick presets (optional)</Text>
        <View style={styles.chips}>
          {QUICK_PRESETS.map((s) => {
            const on = symbols.includes(s);
            return (
              <Pressable
                key={s}
                onPress={() => togglePreset(s)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.save}
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel="SAVE"
        >
          <Text style={styles.saveText}>SAVE</Text>
        </Pressable>
        {savedMsg ? <Text style={styles.msg}>{savedMsg}</Text> : null}
      </View>

      {eas.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.h2}>Your robots</Text>
          {eas.map((ea) => (
            <View key={ea.id} style={styles.eaRow}>
              <Image
                source={
                  ea.pictureUri?.startsWith('data:') ||
                  ea.pictureUri?.startsWith('blob:') ||
                  ea.pictureUri?.startsWith('http')
                    ? { uri: ea.pictureUri }
                    : fallbackMascot
                }
                style={styles.eaThumb}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.eaName}>{ea.name}</Text>
                <Text style={styles.hint} numberOfLines={1}>
                  {ea.symbols.join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 8 },
  card: {
    backgroundColor: '#12151C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    gap: 10,
  },
  h2: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint: { color: '#9CA3AF', fontSize: 12, lineHeight: 17 },
  label: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0B0E14',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  previewRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  previewWrap: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: '#0B0E14',
  },
  preview: { width: '100%', height: '100%' },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  previewEmptyText: { color: '#6B7280', fontSize: 11 },
  uploadBtns: { flex: 1, gap: 8 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(124,92,255,0.22)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  clearPic: { color: '#FCA5A5', fontSize: 12, fontWeight: '600' },
  symbolEntry: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  symbolInput: { flex: 1, marginTop: 0 },
  addSymBtn: {
    borderRadius: 12,
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addSymText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  presetLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipOn: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(124,92,255,0.25)',
  },
  chipText: { color: '#E5E7EB', fontSize: 11, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  save: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },
  msg: { color: '#86EFAC', fontSize: 13 },
  eaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1F2937',
  },
  eaThumb: { width: 40, height: 40, borderRadius: 10 },
  eaName: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
