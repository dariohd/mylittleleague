import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, LockKeyhole } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Button, Card, Pill, TeamMark } from '@/components/ui';
import { palette } from '@/constants/theme';
import { competitionAccent, countdownTo, pointsLabel, resolvedStatus } from '@/lib/format';
import { leagueLabel, leaguePillDark } from '@/lib/leaguepedia';
import { isPredictionLocked } from '@/lib/scoring';
import { useApp } from '@/providers/app-provider';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, predictions, savePrediction, notify, user, demoMode } = useApp();
  const match = matches.find((item) => item.id === id);
  const current = predictions.find((item) => item.matchId === id);
  const [score, setScore] = useState<[number, number] | null>(
    current ? [current.scoreA, current.scoreB] : null,
  );
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    if (!match) return [];
    const wins = Math.ceil(match.bestOf / 2);
    const values: [number, number][] = [];
    for (let loser = 0; loser < wins; loser += 1) {
      values.push([wins, loser], [loser, wins]);
    }
    return values;
  }, [match]);

  if (!match) {
    return (
      <AppShell>
        <Card style={styles.notFound}>
          <AppText variant="h1">MATCH INTROUVABLE</AppText>
          <Button label="RETOUR AUX MATCHS" onPress={() => router.replace('/matches')} />
        </Card>
      </AppShell>
    );
  }

  const status = resolvedStatus(match);
  const locked = match.status !== 'scheduled' || isPredictionLocked(match.startsAt);
  const submit = async () => {
    if (!score) return;
    setSaving(true);
    const result = await savePrediction(match, score[0], score[1]);
    setSaving(false);
    if (result.error) {
      notify({ kind: 'error', title: 'Prono refusé', message: result.error });
      return;
    }
    notify({ kind: 'ok', title: 'Prono enregistré', message: 'Ta réputation est maintenant engagée.' });
    router.replace('/');
  };

  return (
    <AppShell>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color={palette.acid} size={18} />
        <AppText variant="label" color={palette.acid}>RETOUR</AppText>
      </Pressable>

      <Card style={styles.arena} accent={status === 'live' ? palette.coral : palette.grape}>
        <View style={styles.meta}>
          <Pill color={competitionAccent(match.competitionId)} dark={leaguePillDark(match.competitionId)}>
            {leagueLabel(match.competitionId)}
          </Pill>
          <AppText variant="label" color={palette.muted}>
            {match.stage} · BO{match.bestOf} · {status === 'scheduled' ? countdownTo(match.startsAt) : status === 'live' ? 'LIVE' : 'TERMINÉ'}
          </AppText>
        </View>
        <View style={styles.versus}>
          <TeamChoice team={match.teamA} side="left" />
          <View style={styles.vsCenter}>
            {status === 'finished' || status === 'live' ? (
              <AppText variant="display" color={palette.acid}>{match.scoreA ?? 0}:{match.scoreB ?? 0}</AppText>
            ) : (
              <AppText variant="display" color={palette.acid}>VS</AppText>
            )}
            <AppText variant="small">
              {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(match.startsAt))}
            </AppText>
          </View>
          <TeamChoice team={match.teamB} side="right" />
        </View>
      </Card>

      {status === 'finished' && current ? (
        <Card accent={current.points ? palette.acid : palette.coral} style={styles.recap}>
          <AppText variant="label" color={palette.muted}>BILAN</AppText>
          <AppText variant="h1">{pointsLabel(current.points) ?? '0 PT'}</AppText>
          <AppText>
            Ton prono {current.scoreA}-{current.scoreB} contre {match.scoreA}-{match.scoreB} sur le tapis.
          </AppText>
        </Card>
      ) : null}

      <Card style={styles.picker}>
        <View style={styles.pickerTitle}>
          <View>
            <AppText variant="label" color={palette.acid}>TA PROPHÉTIE</AppText>
            <AppText variant="h1">{locked ? 'PRONOS FERMÉS' : 'CHOISIS LE SCORE'}</AppText>
          </View>
          {locked ? <LockKeyhole color={palette.coral} size={27} /> : null}
        </View>
        {locked ? (
          <AppText color={palette.muted}>
            {current
              ? `Ton prono reste ${current.scoreA}-${current.scoreB}. Plus rien à changer.`
              : 'Les portes sont fermées. Le match a commencé ou son résultat est déjà connu.'}
          </AppText>
        ) : (
          <>
            <View style={styles.scoreGrid}>
              {options.map(([scoreA, scoreB]) => {
                const selected = score?.[0] === scoreA && score?.[1] === scoreB;
                return (
                  <Pressable
                    key={`${scoreA}-${scoreB}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${match.teamA.shortName} ${scoreA}, ${match.teamB.shortName} ${scoreB}`}
                    accessibilityState={{ selected }}
                    onPress={() => setScore([scoreA, scoreB])}
                    style={[styles.scoreOption, selected && styles.scoreSelected]}>
                    <AppText variant="h2" color={selected ? palette.ink : palette.cream}>
                      {match.teamA.shortName} {scoreA} - {scoreB} {match.teamB.shortName}
                    </AppText>
                    {selected ? <Check color={palette.ink} size={19} strokeWidth={3} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.rules}>
              <AppText variant="small">Bon vainqueur : 3 points</AppText>
              <AppText variant="small">Score exact : +2 points</AppText>
            </View>
            {!demoMode && !user ? (
              <Button label="CRÉER UN COMPTE POUR PRONO" onPress={() => router.push('/auth?mode=signup')} />
            ) : (
              <Button label={current ? 'MODIFIER MON PRONO' : 'VALIDER MON PRONO'} disabled={!score} loading={saving} onPress={submit} />
            )}
          </>
        )}
      </Card>
    </AppShell>
  );
}

function TeamChoice({ team, side }: { team: import('@/types').Team; side: 'left' | 'right' }) {
  return (
    <View style={[styles.team, side === 'right' && { alignItems: 'flex-end' }]}>
      <TeamMark team={team} size={82} />
      <AppText variant="h2" style={side === 'right' ? { textAlign: 'right' } : null}>{team.name}</AppText>
      <AppText variant="small">{team.region}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7 },
  notFound: { alignItems: 'center', gap: 20, marginTop: 80 },
  arena: { gap: 28, overflow: 'hidden', padding: 26 },
  meta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  versus: { alignItems: 'center', flexDirection: 'row', gap: 14, justifyContent: 'space-between' },
  team: { flex: 1, gap: 10 },
  vsCenter: { alignItems: 'center', gap: 4 },
  recap: { alignSelf: 'center', gap: 8, maxWidth: 760, width: '100%' },
  picker: { alignSelf: 'center', gap: 22, maxWidth: 760, width: '100%' },
  pickerTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  scoreOption: {
    alignItems: 'center',
    backgroundColor: palette.inkSoft,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 58,
    minWidth: 210,
    padding: 12,
  },
  scoreSelected: { backgroundColor: palette.acid, borderColor: palette.black },
  rules: { flexDirection: 'row', justifyContent: 'space-between' },
});
