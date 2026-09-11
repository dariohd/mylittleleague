import { Crown, Flame, Target } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Card, Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { rivals } from '@/data/demo';
import { useApp } from '@/providers/app-provider';

export default function RankingScreen() {
  const { groups, player: me } = useApp();
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const selected = groups.find((group) => group.id === groupId) ?? groups[0];
  const players = [...(selected?.members ?? rivals)].sort((a, b) => b.points - a.points);
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
          {myIndex >= 0 ? `Tu es ${myIndex + 1}e. Aucun point ne s’achète.` : 'Mis à jour après chaque résultat officiel. Aucun point ne s’achète.'}
        </AppText>
      </View>
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
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  board: { padding: 0, overflow: 'hidden' },
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
