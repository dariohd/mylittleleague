import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Crown } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Button, Card } from '@/components/ui';
import { palette } from '@/constants/theme';
import { copyToClipboard } from '@/lib/format';
import { useApp } from '@/providers/app-provider';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups, player, notify } = useApp();
  const group = groups.find((item) => item.id === id);

  if (!group) {
    return (
      <AppShell>
        <Card style={styles.missing}>
          <AppText variant="h1">LIGUE INTROUVABLE</AppText>
          <Button label="RETOUR AUX LIGUES" onPress={() => router.replace('/groups')} />
        </Card>
      </AppShell>
    );
  }

  const sorted = [...group.members].sort((a, b) => b.points - a.points);
  const you = sorted.findIndex((member) => member.id === player.id) + 1;

  return (
    <AppShell title={group.name} eyebrow="LIGUE PRIVÉE">
      <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color={palette.acid} size={18} />
        <AppText variant="label" color={palette.acid}>RETOUR</AppText>
      </Pressable>
      <Card style={styles.hero} accent={palette.cyan}>
        <View style={{ flex: 1, gap: 8 }}>
          <AppText variant="small">{group.members.length} membres · tu es {you ? `#${you}` : 'spectateur'}</AppText>
          <AppText color={palette.muted}>Balance le code, pas besoin de lien magique. Personne ne mise, tout le monde chambrera.</AppText>
        </View>
        <Button
          label={`COPIER ${group.code}`}
          onPress={async () => {
            const ok = await copyToClipboard(group.code);
            notify({
              kind: ok ? 'ok' : 'error',
              title: ok ? 'Code copié' : 'Copie impossible',
              message: ok ? 'Envoie-le dans le groupe Discord.' : group.code,
            });
          }}
        />
      </Card>
      <Card style={styles.board}>
        {sorted.map((member, index) => (
          <View key={member.id} style={[styles.row, member.id === player.id && styles.you]}>
            <View style={[styles.rank, index === 0 && styles.rankFirst]}>
              {index === 0 ? <Crown color={palette.ink} size={16} /> : <AppText variant="label">{index + 1}</AppText>}
            </View>
            <View style={[styles.dot, { backgroundColor: member.color }]} />
            <View style={{ flex: 1 }}>
              <AppText variant="h2">{member.username}{member.id === player.id ? ' (toi)' : ''}</AppText>
              <AppText variant="small">{member.title}</AppText>
            </View>
            <AppText variant="label" color={palette.acid}>{member.points} PTS</AppText>
          </View>
        ))}
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7 },
  missing: { alignItems: 'center', gap: 16, marginTop: 80 },
  hero: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  board: { gap: 0, paddingVertical: 4 },
  row: { alignItems: 'center', borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 64 },
  you: { backgroundColor: '#2B2B24', marginHorizontal: -18, paddingHorizontal: 18 },
  rank: { alignItems: 'center', justifyContent: 'center', width: 28 },
  rankFirst: { backgroundColor: palette.acid, borderRadius: 8, height: 28 },
  dot: { borderColor: palette.black, borderRadius: 99, borderWidth: 2, height: 26, width: 26 },
});
