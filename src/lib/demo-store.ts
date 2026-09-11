import type { Group, Match, Player, Prediction } from '@/types';

import { mergeFeedMatches } from './leaguepedia';
import { scorePrediction } from './scoring';
import { titleForStats } from './titles';

export const DEMO_STORE_KEY = 'mll-demo-v1';

export type DemoStore = {
  matches: Match[];
  predictions: Prediction[];
  groups: Group[];
  player: Player;
};

export type Notice = {
  kind: 'ok' | 'error';
  title: string;
  message: string;
};

export function readDemoStore(): DemoStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(DEMO_STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoStore;
    if (!Array.isArray(parsed.matches) || !Array.isArray(parsed.predictions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDemoStore() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(DEMO_STORE_KEY);
  } catch {
    // ignore
  }
}

export function mergeStoredDemo(stored: DemoStore, freshMatches: Match[]): DemoStore {
  const known = new Set(stored.matches.map((item) => item.id));
  const extra = freshMatches.filter((item) => !known.has(item.id));
  if (!extra.length) return stored;
  return { ...stored, matches: [...stored.matches, ...extra] };
}

export function writeDemoStore(store: DemoStore) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage can be unavailable in private browsing or native without a polyfill.
  }
}

export function applyMatchResult(
  store: Pick<DemoStore, 'matches' | 'predictions' | 'groups' | 'player'>,
  matchId: string,
  scoreA: number,
  scoreB: number,
): DemoStore {
  const match = store.matches.find((item) => item.id === matchId);
  if (!match) return store as DemoStore;

  const matches = store.matches.map((item) =>
    item.id === matchId
      ? { ...item, scoreA, scoreB, status: 'finished' as const }
      : item,
  );

  const predictions = store.predictions.map((prediction) => {
    if (prediction.matchId !== matchId) return prediction;
    return {
      ...prediction,
      points: scorePrediction(prediction, {
        teamAId: match.teamA.id,
        teamBId: match.teamB.id,
        scoreA,
        scoreB,
      }),
    };
  });

  const awarded = predictions
    .filter((prediction) => prediction.matchId === matchId && prediction.userId === store.player.id)
    .reduce((total, prediction) => total + (prediction.points ?? 0), 0);
  const exact = predictions.some(
    (prediction) =>
      prediction.matchId === matchId &&
      prediction.userId === store.player.id &&
      prediction.points === 5,
  );
  const hit = awarded > 0;

  const nextPlayer: Player = {
    ...store.player,
    points: store.player.points + awarded,
    exactScores: store.player.exactScores + (exact ? 1 : 0),
    streak: hit ? store.player.streak + 1 : 0,
    title: titleForStats(store.player.points + awarded, hit ? store.player.streak + 1 : 0),
  };

  const groups = store.groups.map((group) => ({
    ...group,
    members: group.members.map((member) => (member.id === nextPlayer.id ? nextPlayer : member)),
  }));

  return { matches, predictions, groups, player: nextPlayer };
}

export function applyFeedUpdate(store: DemoStore, incoming: Match[]): DemoStore {
  const matches = mergeFeedMatches(store.matches, incoming);
  let current: DemoStore = { ...store, matches };
  for (const match of matches) {
    if (match.status !== 'finished' || match.scoreA == null || match.scoreB == null) continue;
    const pending = current.predictions.some((prediction) => prediction.matchId === match.id && prediction.points == null);
    if (!pending) continue;
    current = applyMatchResult(current, match.id, match.scoreA, match.scoreB);
  }
  return current;
}
