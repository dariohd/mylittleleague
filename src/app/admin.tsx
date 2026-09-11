import { ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Button, Card, Field, Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useApp } from '@/providers/app-provider';

export default function AdminScreen() {
  const { matches, isAdmin, settleMatch, notify } = useApp();
  const openMatches = matches.filter((match) => match.status !== 'finished');
  const [matchId, setMatchId] = useState(openMatches[0]?.id ?? matches[0]?.id ?? '');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const selected = matches.find((match) => match.id === matchId);

  if (!isAdmin) {
    return (
      <AppShell title="ACCÈS REFUSÉ" eyebrow="ZONE ADMIN">
        <Card><AppText>Seuls les administrateurs peuvent corriger les résultats.</AppText></Card>
      </AppShell>
    );
  }

  const save = async () => {
    if (!selected) return;
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) {
      notify({ kind: 'error', title: 'Score invalide', message: 'Saisis deux scores entiers différents.' });
      return;
    }
    const result = await settleMatch(selected.id, a, b);
    if (result.error) notify({ kind: 'error', title: 'Erreur', message: result.error });
    else notify({ kind: 'ok', title: 'Résultat corrigé', message: 'Les points ont été recalculés.' });
  };

  return (
    <AppShell title="TABLE DE RATTRAPAGE" eyebrow="ZONE ADMIN">
      <Card style={styles.warning} accent={palette.coral}>
        <ShieldAlert color={palette.coral} />
        <AppText color={palette.muted} style={{ flex: 1 }}>Utilise cette page uniquement si Leaguepedia ne publie pas le résultat ou remonte une donnée incorrecte.</AppText>
      </Card>
      <Card style={styles.form}>
        <AppText variant="h2">1. CHOISIS LE MATCH</AppText>
        <View style={styles.matches}>
          {matches.map((match) => (
            <Pressable key={match.id} onPress={() => setMatchId(match.id)}>
              <Pill color={match.id === matchId ? palette.acid : palette.panelRaised} dark={match.id === matchId}>
                {match.teamA.shortName} / {match.teamB.shortName} {match.status === 'finished' ? '· OK' : ''}
              </Pill>
            </Pressable>
          ))}
        </View>
        {selected ? (
          <>
            <AppText variant="h2">2. SAISIS LE SCORE</AppText>
            <View style={styles.scores}>
              <Field label={selected.teamA.name} keyboardType="number-pad" value={scoreA} onChangeText={setScoreA} style={styles.scoreInput} />
              <AppText variant="h1">:</AppText>
              <Field label={selected.teamB.name} keyboardType="number-pad" value={scoreB} onChangeText={setScoreB} style={styles.scoreInput} />
            </View>
            <Button label="VALIDER ET CALCULER LES POINTS" onPress={() => void save()} />
          </>
        ) : null}
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  warning: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  form: { gap: 22 },
  matches: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  scores: { alignItems: 'flex-end', flexDirection: 'row', gap: 14, justifyContent: 'center' },
  scoreInput: { fontFamily: 'Bungee', fontSize: 25, textAlign: 'center', width: 120 },
});
