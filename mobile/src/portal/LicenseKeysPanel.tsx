import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppState } from '../AppState';

const ACCENT = '#7C5CFF';

export function LicenseKeysPanel() {
  const { eas, licenseKeys, generateLicenseKey, refreshLicenseCatalog } =
    useAppState();
  const [eaId, setEaId] = useState<string>(eas[0]?.id ?? '');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    void refreshLicenseCatalog();
  }, [refreshLicenseCatalog]);

  const activeId = eas.some((e) => e.id === eaId) ? eaId : eas[0]?.id ?? '';

  const onGenerate = async () => {
    if (!activeId) {
      setFlash('Create a robot in Manage EAs first.');
      return;
    }
    setFlash('Saving key…');
    const row = await generateLicenseKey(activeId);
    if (row) {
      setFlash(
        `Generated ${row.key} for ${row.eaName}. Use Activate on this same phone preview.`,
      );
    } else {
      setFlash('Could not generate key — pick a saved EA.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.h2}>Generate license keys</Text>
        <Text style={styles.hint}>
          Generate a key for a saved Manage EAs robot. The user enters this key
          after Lumo Edge Pro access to activate that EA (name, picture, symbols).
        </Text>

        <Text style={styles.label}>EA</Text>
        {eas.length === 0 ? (
          <Text style={styles.hint}>No robots yet — save one under Manage EAs.</Text>
        ) : (
          <View style={styles.eaList}>
            {eas.map((ea) => {
              const on = ea.id === activeId;
              return (
                <Pressable
                  key={ea.id}
                  onPress={() => setEaId(ea.id)}
                  style={[styles.eaChip, on && styles.eaChipOn]}
                >
                  <Text style={[styles.eaChipText, on && styles.eaChipTextOn]}>
                    {ea.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          style={[styles.gen, !activeId && styles.genDisabled]}
          onPress={onGenerate}
          accessibilityRole="button"
          accessibilityLabel="Generate license key"
        >
          <Text style={styles.genText}>GENERATE KEY</Text>
        </Pressable>
        {flash ? <Text style={styles.msg}>{flash}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Issued keys</Text>
        {licenseKeys.length === 0 ? (
          <Text style={styles.hint}>No keys yet.</Text>
        ) : (
          licenseKeys.map((k) => (
            <View key={k.id} style={styles.keyRow}>
              <Text style={styles.keyEa}>{k.eaName}</Text>
              <Text style={styles.keyVal} selectable>
                {k.key}
              </Text>
              <Text style={styles.hint}>
                {new Date(k.createdAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>
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
  eaList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eaChip: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eaChipOn: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(124,92,255,0.25)',
  },
  eaChipText: { color: '#E5E7EB', fontWeight: '600', fontSize: 13 },
  eaChipTextOn: { color: '#fff' },
  gen: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    alignItems: 'center',
  },
  genDisabled: { opacity: 0.45 },
  genText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.6 },
  msg: { color: '#86EFAC', fontSize: 13 },
  keyRow: {
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1F2937',
  },
  keyEa: { color: '#E5E7EB', fontWeight: '700', fontSize: 13 },
  keyVal: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
