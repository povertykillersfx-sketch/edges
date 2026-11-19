import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EA_PICTURES, SYMBOLS, useAppState } from '../AppState';

const ACCENT = '#7C5CFF';
const mascot = require('../../assets/mascot.jpg');

export function ManageEasPanel() {
  const { eas, addEa } = useAppState();
  const [name, setName] = useState('');
  const [pictureId, setPictureId] = useState<string>(EA_PICTURES[0].id);
  const [symbols, setSymbols] = useState<string[]>(['EURUSD', 'XAUUSD']);
  const [savedMsg, setSavedMsg] = useState('');

  const toggleSymbol = (sym: string) => {
    setSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym],
    );
  };

  const onSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setSavedMsg('EA NAME is required.');
      return;
    }
    if (symbols.length === 0) {
      setSavedMsg('Pick at least one symbol.');
      return;
    }
    const pic = EA_PICTURES.find((p) => p.id === pictureId) ?? EA_PICTURES[0];
    addEa({
      name: trimmed,
      pictureUri: pic.uri,
      symbols: [...symbols],
    });
    setSavedMsg(`Saved robot “${trimmed}”.`);
    setName('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.h2}>Create a robot</Text>
        <Text style={styles.hint}>
          Edges mentor EA — name it, pick a picture, choose symbols, then save.
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
        <View style={styles.picRow}>
          {EA_PICTURES.map((p) => {
            const on = pictureId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPictureId(p.id)}
                style={[styles.picCard, on && styles.picCardOn]}
                accessibilityLabel={p.label}
              >
                <Image source={mascot} style={styles.pic} />
                <Text style={styles.picLabel} numberOfLines={1}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>SYMBOLS</Text>
        <View style={styles.chips}>
          {SYMBOLS.map((s) => {
            const on = symbols.includes(s);
            return (
              <Pressable
                key={s}
                onPress={() => toggleSymbol(s)}
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
              <Image source={mascot} style={styles.eaThumb} />
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
  picRow: { flexDirection: 'row', gap: 8 },
  picCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 8,
    alignItems: 'center',
    gap: 6,
  },
  picCardOn: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(124,92,255,0.18)',
  },
  pic: { width: 56, height: 56, borderRadius: 12 },
  picLabel: { color: '#E5E7EB', fontSize: 10, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
