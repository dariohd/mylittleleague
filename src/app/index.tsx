import { router } from 'expo-router';
import { Flame, Target, Trophy, UsersRound } from 'lucide-react-native';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { MatchCard } from '@/components/match-card';
import { AppText, Button, Card, Mascot, Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { resolvedStatus } from '@/lib/format';
import { isLiveFeedMatch } from '@/lib/leaguepedia';
import { homeQuip } from '@/lib/titles';
import { useApp } from '@/providers/app-provider';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { matches, player, groups, predictions } = useApp();
  const compact = width < 700;
  const open = matches.filter((match) => resolvedStatus(match) === 'scheduled');
  const live = matches.filter((match) => resolvedStatus(match) === 'live');
  const finished = matches.filter((match) => match.status === 'finished');
  const pending = open.filter((match) => !predictions.some((item) => item.matchId === match.id)).length;
  const missed = finished.filter((match) => !predictions.some((item) => item.matchId === match.id)).length;
  const quip = homeQuip({ streak: player.streak, pending, missed });
  const spotlight = [...live, ...open].slice(0, 8);

  return (
    <AppShell>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.heroCopy}>
          <Pill color={palette.coral}>{matches.some((match) => isLiveFeedMatch(match.id)) ? 'CALENDRIER LIVE' : 'SAISON EN COURS'}</Pill>
          <AppText variant="display" style={compact ? styles.smallDisplay : null}>
            TES TAKES.{'\n'}TES POTES.{'\n'}
            <AppText variant="display" color={palette.acid} style={compact ? styles.smallDisplay : null}>ZÉRO THUNE.</AppText>
          </AppText>
          <AppText color={palette.muted} style={styles.heroText}>
            Prouve une bonne fois pour toutes que ton analyse vaut mieux que le chat Twitch.
          </AppText>
          <View style={styles.actions}>
            <Button label="PRONOSTIQUER" onPress={() => router.push('/matches')} />
            <Button label="INVITER MES POTES" variant="ghost" onPress={() => router.push('/groups')} />
          </View>
        </View>
        <View style={[styles.mascotStage, compact && styles.mascotStageCompact]}>
          <View style={styles.mascotCircle}><Mascot size={150} /></View>
          <View style={styles.speech}><AppText variant="label" color={palette.ink}>{quip}</AppText></View>
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatCard icon={Trophy} label="Points" value={String(player.points)} note={player.title} color={palette.acid} />
        <StatCard icon={Target} label="Scores exacts" value={String(player.exactScores)} note={pending ? `${pending} encore ouverts` : 'Rien en suspens'} color={palette.cyan} />
        <StatCard icon={Flame} label="Série actuelle" value={`${player.streak} matchs`} note={player.streak ? 'Ça commence à chauffer' : 'On reconstruit'} color={palette.coral} />
        <StatCard icon={UsersRound} label="Ligues privées" value={String(groups.length)} note="Des rivalités saines" color={palette.grape} />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <AppText variant="label" color={palette.acid}>{live.length ? 'ÇA JOUE LÀ' : 'À TOI DE JOUER'}</AppText>
          <AppText variant="h1">{live.length ? 'MATCHS LIVE' : 'PROCHAINS MATCHS'}</AppText>
        </View>
        <Button label="TOUT VOIR" variant="ghost" onPress={() => router.push('/matches')} />
      </View>
      {spotlight.length ? (
        <View style={styles.matchGrid}>
          {spotlight.map((match, index) => <MatchCard key={match.id} match={match} featured={index === 0} />)}
        </View>
      ) : (
        <Card>
          <AppText variant="h2">PLUS RIEN À PRONOSTIQUER</AppText>
          <AppText color={palette.muted}>Va chambrer le classement en attendant le prochain BO.</AppText>
        </Card>
      )}
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  color,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  note: string;
  color: string;
}) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Icon color={palette.ink} size={20} strokeWidth={3} />
      </View>
      <AppText variant="small">{label}</AppText>
      <AppText variant="h2">{value}</AppText>
      <AppText variant="small" color={color}>{note}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: palette.grape,
    borderColor: palette.black,
    borderRadius: 26,
    borderWidth: 2,
    flexDirection: 'row',
    minHeight: 410,
    overflow: 'hidden',
    padding: 34,
  },
  heroCompact: { flexDirection: 'column', minHeight: 660, padding: 24 },
  heroCopy: { flex: 1, gap: 18, zIndex: 2 },
  heroText: { maxWidth: 520 },
  smallDisplay: { fontSize: 34, lineHeight: 40 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mascotStage: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    minWidth: 280,
    position: 'absolute',
    right: 12,
    top: 0,
  },
  mascotStageCompact: {
    bottom: 0,
    minHeight: 280,
    minWidth: '100%',
    position: 'relative',
    right: 0,
    top: 0,
  },
  mascotCircle: {
    alignItems: 'center',
    backgroundColor: palette.cyan,
    borderColor: palette.black,
    borderRadius: 999,
    borderWidth: 3,
    height: 245,
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
    width: 245,
  },
  speech: {
    backgroundColor: palette.cream,
    borderColor: palette.black,
    borderRadius: 12,
    borderWidth: 2,
    bottom: 34,
    padding: 12,
    position: 'absolute',
    right: 4,
    transform: [{ rotate: '3deg' }],
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  statCard: { flex: 1, gap: 7, minWidth: 190 },
  statIcon: { alignItems: 'center', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  matchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
});
