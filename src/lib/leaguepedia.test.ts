import { describe, expect, it } from 'vitest';

import { classifyCompetition, mergeUniqueMatches, normalizeInviteCode, normalizeLeaguepediaMatch } from './leaguepedia';
import { competitionIdFromEsports, normalizeLolesportsEvent } from './lolesports';

describe('normalizeLeaguepediaMatch', () => {
  it('normalise un match LEC terminé', () => {
    const match = normalizeLeaguepediaMatch({
      MatchId: 'LEC-42',
      Tournament: 'LEC 2026 Season Finals',
      Team1: 'G2 Esports',
      Team2: 'Karmine Corp',
      Team1Score: '3',
      Team2Score: '1',
      DateTimeUTC: '2026-09-09 18:00:00',
      BestOf: '5',
      Phase: 'Finale',
      Winner: 'G2 Esports',
    });

    expect(match).toMatchObject({
      id: 'leaguepedia-LEC-42',
      competitionId: 'lec',
      bestOf: 5,
      status: 'finished',
      scoreA: 3,
      scoreB: 1,
    });
  });

  it('ignore les affiches incomplètes', () => {
    expect(normalizeLeaguepediaMatch({
      Tournament: 'LCK 2026',
      Team1: 'TBD',
      Team2: 'T1',
      DateTimeUTC: '2026-09-12 12:00:00',
    })).toBeNull();
  });

  it('classifie Worlds avant les ligues régionales', () => {
    expect(classifyCompetition('2026 World Championship Knockouts')).toMatchObject({ id: 'worlds' });
    expect(classifyCompetition('LCK CL 2026 Summer')).toMatchObject({ id: 'lck-cl' });
    expect(classifyCompetition('Random Amateur Cup')).toBeNull();
  });
});

describe('normalizeLolesportsEvent', () => {
  it('normalise un BO5 LEC terminé', () => {
    const match = normalizeLolesportsEvent({
      startTime: '2026-09-06T15:00:00Z',
      state: 'completed',
      type: 'match',
      blockName: 'Playoffs',
      league: { name: 'LEC', slug: 'lec' },
      match: {
        id: '115548681803406303',
        teams: [
          { name: 'Karmine Corp', code: 'KC', result: { outcome: 'loss', gameWins: 1 } },
          { name: 'G2 Esports', code: 'G2', result: { outcome: 'win', gameWins: 3 } },
        ],
        strategy: { type: 'bestOf', count: 5 },
      },
    });

    expect(match).toMatchObject({
      id: 'lolesports-115548681803406303',
      competitionId: 'lec',
      bestOf: 5,
      status: 'finished',
      scoreA: 1,
      scoreB: 3,
    });
    expect(match?.teamA.shortName).toBe('KC');
    expect(match?.teamB.shortName).toBe('G2');
  });

  it('ignore TFT et mappe LCK CL', () => {
    expect(normalizeLolesportsEvent({
      startTime: '2026-09-12T12:00:00Z',
      state: 'unstarted',
      type: 'match',
      league: { name: 'TFT Esports', slug: 'tft_esports' },
      match: { id: '1', teams: [{ name: 'A' }, { name: 'B' }], strategy: { count: 1 } },
    })).toBeNull();
    expect(competitionIdFromEsports('lck_challengers_league', 'LCK Challengers')).toBe('lck-cl');
  });
});

describe('mergeUniqueMatches', () => {
  it('évite les doublons entre sources', () => {
    const esports = normalizeLolesportsEvent({
      startTime: '2026-09-12T18:00:00Z',
      state: 'unstarted',
      type: 'match',
      blockName: 'Week 1',
      league: { name: 'LEC', slug: 'lec' },
      match: {
        id: 'abc',
        teams: [{ name: 'G2 Esports', code: 'G2' }, { name: 'Karmine Corp', code: 'KC' }],
        strategy: { count: 3 },
      },
    })!;
    const wiki = {
      ...esports,
      id: 'leaguepedia-other',
    };
    const merged = mergeUniqueMatches([esports], [wiki]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('lolesports-abc');
  });
});

describe('normalizeInviteCode', () => {
  it('nettoie et borne le code partagé', () => {
    expect(normalizeInviteCode(' nash-42! ')).toBe('NASH42');
  });
});
