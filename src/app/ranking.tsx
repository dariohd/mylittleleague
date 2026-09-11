import { router } from 'expo-router';
import { Crown, Flame, Target } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Button, Card, Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useApp } from '@/providers/app-provider';

export default function RankingScreen() {
  const { groups, player: me, user, demoMode } = useApp();
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');

  useEffect(() => {
    if (!groups.some((group) => group.id === groupId)) {
      setGroupId(groups[0]?.id ?? '');
    }
  }, [groupId, groups]);

  const selected = groups.find((group) => group.id === groupId) ?? groups[0];
  const players = [...(selected?.members ?? [])].sort((a, b) => b.points - a.points);
  const myIndex = players.findIndex((item) => item.id === me.id);

  return (
    <AppShell title="LE CLASSEMENT QUI FÂCHE" eyebrow="GLOIRE ÉTERNELLE">
      <View style={styles.summary}>
        <View style={styles.filters}>
          {groups.map((group) => (
            <Pressable key={group.id} onPress={() => setGroupId(group.id)}>
              <Pill color={group.id === selected?.id ? palette.grape : palette.panelRaised} dark={false}>
                {group.name}
              </Pill>
            </Pressable>
          ))}
        </View>
        <AppText color={palette.muted}>
          {selected
            ? myIndex >= 0
              ? `Tu es ${myIndex + 1}e. Aucun point ne s’achète.`
              : 'Mis à jour après chaque résultat officiel. Aucun point ne s’achète.'
            : 'Le classement commun apparaît dès qu’une ligue est créée et que tes amis ont rejoint avec le code.'}
        </AppText>
      </View>
      {selected ? (
        <Card style={styles.board} accent={palette.acid}>
          <View style={styles.tableHead}>
            <AppText variant="label" color={palette.muted} style={styles.position}>RANG</AppText>
            <AppText variant="label" color={palette.muted} style={styles.player}>JOUEUR</AppText>
            <AppText variant="label" color={palette.muted} style={styles.metric}>EXACTS</AppText>
            <AppText variant="label" color={palette.muted} style={styles.metric}>SÉRIE</AppText>
            <AppText variant="label" color={palette.muted} style={styles.points}>POINTS</AppText>
          </View>
          {players.map((player, index) => (
            <View key={player.id} style={[styles.row, index === 0 && styles.firstRow, player.id === me.id && styles.youRow]}>
              <View style={styles.position}>
                {index === 0 ? (
                  <View style={styles.crown}><Crown color={palette.ink} size={20} strokeWidth={3} /></View>
                ) : (
                  <AppText variant="h2" color={palette.muted}>{String(index + 1).padStart(2, '0')}</AppText>
                )}
              </View>
              <View style={[styles.player, styles.playerCell]}>
                <View style={[styles.avatar, { backgroundColor: player.color }]}>
                  <AppText variant="label" color={palette.ink}>{player.username.slice(0, 2).toUpperCase()}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="h2" numberOfLines={1}>{player.username}{player.id === me.id ? ' (toi)' : ''}</AppText>
                  <AppText variant="small" numberOfLines={1}>{player.title}</AppText>
                </View>
              </View>
              <View style={[styles.metric, styles.iconMetric]}>
                <Target color={palette.cyan} size={17} />
                <AppText>{player.exactScores}</AppText>
              </View>
              <View style={[styles.metric, styles.iconMetric]}>
                <Flame color={palette.coral} size={17} />
                <AppText>{player.streak}</AppText>
              </View>
              <AppText variant="h2" color={index === 0 ? palette.acid : palette.cream} style={styles.points}>
                {player.points}
              </AppText>
            </View>
          ))}
        </Card>
      ) : (
        <Card accent={palette.cyan} style={styles.empty}>
          <AppText variant="h2">PAS ENCORE DE LIGUE</AppText>
          <AppText color={palette.muted}>
            {demoMode || user
              ? 'Crée une ligue, partage le code à 6 caractères, et le classement devient commun.'
              : 'Crée un compte, ouvre une ligue, puis envoie le code à tes amis.'}
          </AppText>
          <Button
            label={demoMode || user ? 'CRÉER UNE LIGUE' : 'CRÉER UN COMPTE'}
            onPress={() => router.push(demoMode || user ? '/groups' : '/auth?mode=signup')}
          />
        </Card>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  board: { padding: 0, overflow: 'hidden' },
  empty: { alignSelf: 'center', gap: 14, maxWidth: 640, width: '100%' },
  tableHead: { alignItems: 'center', backgroundColor: palette.inkSoft, flexDirection: 'row', minHeight: 48, paddingHorizontal: 16 },
  row: { alignItems: 'center', borderTopColor: palette.line, borderTopWidth: 1, flexDirection: 'row', minHeight: 76, paddingHorizontal: 16 },
  firstRow: { backgroundColor: '#2B2B24' },
  youRow: { borderLeftColor: palette.acid, borderLeftWidth: 4 },
  position: { width: 70 },
  player: { flex: 1, minWidth: 150 },
  playerCell: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  metric: { justifyContent: 'center', textAlign: 'center', width: 100 },
  iconMetric: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  points: { textAlign: 'right', width: 90 },
  crown: { alignItems: 'center', backgroundColor: palette.acid, borderRadius: 10, height: 36, justifyContent: 'center', transform: [{ rotate: '-5deg' }], width: 36 },
  avatar: { alignItems: 'center', borderColor: palette.black, borderRadius: 12, borderWidth: 2, height: 44, justifyContent: 'center', width: 44 },
});
