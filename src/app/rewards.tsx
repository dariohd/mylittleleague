import { Award, LockKeyhole, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Card, Pill, ProgressBar } from '@/components/ui';
import { palette } from '@/constants/theme';
import { rewards } from '@/data/demo';
import { useApp } from '@/providers/app-provider';

export default function RewardsScreen() {
  const { player } = useApp();
  return (
    <AppShell title="LE CABINET DES TROPHÉES" eyebrow="100 % COSMÉTIQUE">
      <Card style={styles.notice} accent={palette.cyan}>
        <Sparkles color={palette.cyan} size={28} />
        <View style={{ flex: 1 }}>
          <AppText variant="h2">DE LA GLOIRE, PAS DE CASH</AppText>
          <AppText color={palette.muted}>Titre actuel : {player.title}. Ces badges n’ont aucune valeur financière et ne sont jamais échangeables.</AppText>
        </View>
      </Card>

      <View style={styles.grid}>
        {rewards.map((reward) => {
          const unlocked = player.points >= reward.threshold;
          const progress = Math.min(100, (player.points / reward.threshold) * 100);
          return (
            <Card key={reward.id} style={[styles.reward, !unlocked && styles.locked]} accent={reward.accent}>
              <View style={styles.rewardTop}>
                <View style={[styles.badge, { backgroundColor: unlocked ? reward.accent : palette.line }]}>
                  {unlocked ? <Award color={palette.ink} size={30} strokeWidth={3} /> : <LockKeyhole color={palette.muted} size={25} />}
                </View>
                <Pill color={unlocked ? palette.acid : palette.panelRaised} dark={unlocked}>
                  {unlocked ? 'DÉBLOQUÉ' : `${reward.threshold} PTS`}
                </Pill>
              </View>
              <View style={styles.copy}>
                <AppText variant="h2">{reward.name}</AppText>
                <AppText color={palette.muted}>{reward.description}</AppText>
              </View>
              <ProgressBar value={progress} color={reward.accent} />
              <AppText variant="small">{Math.min(player.points, reward.threshold)} / {reward.threshold} points</AppText>
            </Card>
          );
        })}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  reward: { flex: 1, gap: 18, minWidth: 260 },
  locked: { opacity: 0.66 },
  rewardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  badge: { alignItems: 'center', borderColor: palette.black, borderRadius: 15, borderWidth: 2, height: 58, justifyContent: 'center', transform: [{ rotate: '-4deg' }], width: 58 },
  copy: { gap: 5 },
});
