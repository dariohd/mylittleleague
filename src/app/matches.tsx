import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { MatchCard } from '@/components/match-card';
import { AppText, Button, Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { resolvedStatus } from '@/lib/format';
import { leagueLabel } from '@/lib/leaguepedia';
import { useApp } from '@/providers/app-provider';

const statusFilters = ['Tous', 'Ouverts', 'Live', 'Terminés'] as const;

export default function MatchesScreen() {
  const { matches, predictions, syncMatches, feedStatus, feedUpdatedAt } = useApp();
  const [filter, setFilter] = useState('Tous');
  const leagues = useMemo(() => {
    const ids = [...new Set(matches.map((match) => match.competitionId))];
    return ids.sort((a, b) => leagueLabel(a).localeCompare(leagueLabel(b), 'fr'));
  }, [matches]);
  const chips = [...statusFilters, ...leagues.map(leagueLabel)];
  const visible = matches.filter((match) => {
    if (filter === 'Terminés') return match.status === 'finished';
    if (filter === 'Live') return resolvedStatus(match) === 'live';
    if (filter === 'Ouverts') {
      return resolvedStatus(match) === 'scheduled' && !predictions.some((item) => item.matchId === match.id);
    }
    if (filter === 'Tous') return true;
    return leagueLabel(match.competitionId) === filter;
  });
  const syncLabel = feedStatus === 'loading'
    ? 'SYNC…'
    : feedStatus === 'live'
      ? 'LIVE'
      : feedStatus === 'cached'
        ? 'CACHE'
        : 'RÉESSAYER';

  return (
    <AppShell title="LE TABLEAU DES PRONOS" eyebrow="MATCHS">
      <View style={styles.toolbar}>
        <AppText color={palette.muted} style={{ flex: 1 }}>
          {matches.length} matchs pro · lolesports + Leaguepedia
          {feedUpdatedAt ? ` · ${new Date(feedUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </AppText>
        <Button
          label={syncLabel}
          variant="ghost"
          loading={feedStatus === 'loading'}
          onPress={() => void syncMatches(true)}
        />
      </View>
      <View style={styles.filters}>
        {chips.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)}>
            <Pill color={filter === item ? palette.acid : palette.panelRaised} dark={filter === item}>
              {item}
            </Pill>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid}>
        {visible.map((match) => <MatchCard key={match.id} match={match} />)}
      </View>
      {!visible.length ? (
        <View style={styles.empty}>
          <AppText variant="h2">{feedStatus === 'loading' ? 'ON INTERROGE LA FAILLE' : 'RIEN DANS CETTE FAILLE'}</AppText>
          <AppText variant="body" color={palette.muted}>
            {feedStatus === 'error'
              ? 'Le calendrier est temporairement indisponible. Réessaie, le cache reste prioritaire.'
              : 'Change de filtre, les matchs ne se cachent pas très loin.'}
          </AppText>
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 70 },
});
