import { leagueColor, leagueLabel } from '@/lib/leaguepedia';
import { supabase } from '@/lib/supabase';
import type { Match } from '@/types';

const CHUNK = 80;

function bestOf(value: number) {
  if (value === 1 || value === 5) return value;
  return 3;
}

export function matchToScheduleRow(match: Match) {
  return {
    id: match.id,
    competition_id: match.competitionId,
    competition_name: leagueLabel(match.competitionId),
    competition_color: leagueColor(match.competitionId),
    stage: match.stage,
    starts_at: match.startsAt,
    best_of: bestOf(match.bestOf),
    score_a: match.scoreA,
    score_b: match.scoreB,
    status: match.status,
    source: 'lolesports',
    team_a: {
      id: match.teamA.id,
      name: match.teamA.name,
      short_name: match.teamA.shortName,
      region: match.teamA.region,
      color: match.teamA.color,
    },
    team_b: {
      id: match.teamB.id,
      name: match.teamB.name,
      short_name: match.teamB.shortName,
      region: match.teamB.region,
      color: match.teamB.color,
    },
  };
}

export async function pushSchedule(matches: Match[]) {
  if (!supabase || !matches.length) return;
  for (let index = 0; index < matches.length; index += CHUNK) {
    const chunk = matches.slice(index, index + CHUNK).map(matchToScheduleRow);
    const { error } = await supabase.rpc('ensure_schedule', { payload: chunk });
    if (error) throw error;
  }
}
