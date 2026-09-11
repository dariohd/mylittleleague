import { router } from 'expo-router';
import { LockKeyhole } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';
import { competitionAccent, matchClockLabel, pointsLabel, resolvedStatus } from '@/lib/format';
import { leagueLabel, leaguePillDark } from '@/lib/leaguepedia';
import { useApp } from '@/providers/app-provider';
import type { Match } from '@/types';
import { AppText, Card, Pill, TeamMark } from './ui';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function MatchCard({ match, featured = false }: { match: Match; featured?: boolean }) {
  const { predictions } = useApp();
  const prediction = predictions.find((item) => item.matchId === match.id);
  const status = resolvedStatus(match);
  const finished = status === 'finished';
  const live = status === 'live';
  const earned = pointsLabel(prediction?.points ?? null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${match.teamA.name} contre ${match.teamB.name}`}
      onPress={() => router.push(`/match/${match.id}`)}
      style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.82 }]}>
      <Card
        style={[styles.card, featured && styles.featured]}
        accent={finished ? palette.muted : live ? palette.coral : palette.acid}>
        <View style={styles.topline}>
          <View style={styles.meta}>
            <Pill color={competitionAccent(match.competitionId)} dark={leaguePillDark(match.competitionId)}>
              {leagueLabel(match.competitionId)}
            </Pill>
            <AppText variant="small">{match.stage}</AppText>
          </View>
          {live ? (
            <Pill color={palette.coral} dark={false}>LIVE</Pill>
          ) : (
            <AppText variant="label" color={finished ? palette.muted : palette.acid}>
              {finished ? 'TERMINÉ' : matchClockLabel(match).toUpperCase()}
            </AppText>
          )}
        </View>

        <View style={styles.teams}>
          <View style={[styles.team, styles.teamLeft]}>
            <TeamMark team={match.teamA} size={featured ? 62 : 48} />
            <View style={styles.teamName}>
              <AppText variant={featured ? 'h2' : 'body'} numberOfLines={1}>{match.teamA.name}</AppText>
              <AppText variant="small">{match.teamA.region}</AppText>
            </View>
          </View>
          <View style={styles.score}>
            {finished || live ? (
              <AppText variant="h1">{match.scoreA ?? 0} : {match.scoreB ?? 0}</AppText>
            ) : (
              <>
                <AppText variant="h2" color={palette.muted}>VS</AppText>
                <AppText variant="small">BO{match.bestOf}</AppText>
              </>
            )}
          </View>
          <View style={[styles.team, styles.teamRight]}>
            <View style={[styles.teamName, { alignItems: 'flex-end' }]}>
              <AppText variant={featured ? 'h2' : 'body'} numberOfLines={1}>{match.teamB.name}</AppText>
              <AppText variant="small">{match.teamB.region}</AppText>
            </View>
            <TeamMark team={match.teamB} size={featured ? 62 : 48} />
          </View>
        </View>

        <View style={styles.bottomline}>
          {prediction ? (
            <AppText variant="label" color={earned ? (prediction.points ? palette.acid : palette.coral) : palette.cyan}>
              {earned ? earned : `TON PRONO : ${prediction.scoreA} - ${prediction.scoreB}`}
            </AppText>
          ) : finished ? (
            <AppText variant="small">Tu as laissé celui-ci passer.</AppText>
          ) : live ? (
            <AppText variant="label" color={palette.coral}>PRONOS FERMÉS</AppText>
          ) : (
            <AppText variant="label" color={palette.acid}>FAIRE MON PRONO</AppText>
          )}
          <AppText variant="small">
            {finished ? dateFormatter.format(new Date(match.startsAt)) : `BO${match.bestOf}`}
          </AppText>
          {finished ? <LockKeyhole color={palette.muted} size={16} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1, minWidth: 280 },
  card: { gap: 19, minHeight: 210 },
  featured: { minHeight: 250, padding: 22 },
  topline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  meta: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  teams: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  team: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 11 },
  teamLeft: { justifyContent: 'flex-start' },
  teamRight: { justifyContent: 'flex-end' },
  teamName: { flexShrink: 1, gap: 2 },
  score: { alignItems: 'center', justifyContent: 'center', minWidth: 55 },
  bottomline: {
    alignItems: 'center',
    borderTopColor: palette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingTop: 14,
  },
});
