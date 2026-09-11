import { leagueColor } from '@/lib/leaguepedia';
import type { Match, MatchStatus } from '@/types';

export function countdownTo(startsAt: string, now = new Date()) {
  const diff = new Date(startsAt).getTime() - now.getTime();
  if (diff <= 0) return 'En cours';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  return `${Math.floor(hours / 24)} j`;
}

export function matchClockLabel(match: Pick<Match, 'startsAt' | 'status'>, now = new Date()) {
  if (match.status === 'finished') return 'Terminé';
  if (match.status === 'live' || new Date(match.startsAt).getTime() <= now.getTime()) return 'Live';
  return countdownTo(match.startsAt, now);
}

export function resolvedStatus(match: Pick<Match, 'startsAt' | 'status'>, now = new Date()): MatchStatus {
  if (match.status === 'finished') return 'finished';
  if (match.status === 'live' || new Date(match.startsAt).getTime() <= now.getTime()) return 'live';
  return 'scheduled';
}

export function competitionAccent(id: string) {
  return leagueColor(id);
}

export function pointsLabel(points: number | null) {
  if (points == null) return null;
  if (points === 5) return '+5 EXACT';
  if (points === 3) return '+3 VAINQUEUR';
  return '0 PT';
}

export async function copyToClipboard(value: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
