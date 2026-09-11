import { describe, expect, it } from 'vitest';

import { applyMatchResult } from './demo-store';
import type { Group, Match, Player, Prediction } from '@/types';

const player: Player = {
  id: 'demo-user',
  username: 'Dariohd',
  title: 'Oracle du dimanche',
  points: 40,
  exactScores: 4,
  streak: 2,
  color: '#C7F43D',
};

const match: Match = {
  id: 'demo-1',
  competitionId: 'lec',
  stage: 'Semaine 4',
  startsAt: '2026-09-10T18:00:00.000Z',
  bestOf: 3,
  teamA: { id: 'g2', name: 'G2 Esports', shortName: 'G2', color: '#F25C54', region: 'EMEA' },
  teamB: { id: 'kc', name: 'Karmine Corp', shortName: 'KC', color: '#3C8DFF', region: 'EMEA' },
  scoreA: null,
  scoreB: null,
  status: 'scheduled',
};

const groups: Group[] = [
  { id: 'g-friends', name: 'Les 5 sans ward', code: 'NASH42', members: [player] },
];

describe('applyMatchResult', () => {
  it('attribue 5 points et met à jour le classement local', () => {
    const predictions: Prediction[] = [{
      id: 'p1',
      matchId: 'demo-1',
      userId: 'demo-user',
      winnerId: 'g2',
      scoreA: 2,
      scoreB: 1,
      points: null,
      createdAt: '2026-09-10T10:00:00.000Z',
    }];

    const next = applyMatchResult({ matches: [match], predictions, groups, player }, 'demo-1', 2, 1);

    expect(next.matches[0].status).toBe('finished');
    expect(next.predictions[0].points).toBe(5);
    expect(next.player.points).toBe(45);
    expect(next.player.exactScores).toBe(5);
    expect(next.player.streak).toBe(3);
    expect(next.player.title).toBe('Oracle du dimanche');
    expect(next.groups[0].members[0].points).toBe(45);
  });

  it('casse la série si le vainqueur est faux', () => {
    const predictions: Prediction[] = [{
      id: 'p1',
      matchId: 'demo-1',
      userId: 'demo-user',
      winnerId: 'kc',
      scoreA: 0,
      scoreB: 2,
      points: null,
      createdAt: '2026-09-10T10:00:00.000Z',
    }];

    const next = applyMatchResult({ matches: [match], predictions, groups, player }, 'demo-1', 2, 1);
    expect(next.predictions[0].points).toBe(0);
    expect(next.player.points).toBe(40);
    expect(next.player.streak).toBe(0);
  });
});
