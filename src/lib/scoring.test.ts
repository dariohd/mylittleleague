import { describe, expect, it } from 'vitest';

import { isPredictionLocked, scorePrediction, validSeriesScore } from './scoring';

describe('scorePrediction', () => {
  const result = { teamAId: 'g2', teamBId: 'kc', scoreA: 2, scoreB: 1 };

  it('accorde cinq points pour le score exact', () => {
    expect(scorePrediction({ winnerId: 'g2', scoreA: 2, scoreB: 1 }, result)).toBe(5);
  });

  it('accorde trois points pour le bon vainqueur', () => {
    expect(scorePrediction({ winnerId: 'g2', scoreA: 2, scoreB: 0 }, result)).toBe(3);
  });

  it('n’accorde aucun point pour le mauvais vainqueur', () => {
    expect(scorePrediction({ winnerId: 'kc', scoreA: 1, scoreB: 2 }, result)).toBe(0);
  });
});

describe('règles de verrouillage', () => {
  it('verrouille un match commencé', () => {
    expect(isPredictionLocked('2026-09-10T10:00:00Z', new Date('2026-09-10T10:00:01Z'))).toBe(true);
  });

  it('valide les scores de BO3', () => {
    expect(validSeriesScore(2, 1, 3)).toBe(true);
    expect(validSeriesScore(1, 1, 3)).toBe(false);
    expect(validSeriesScore(3, 1, 3)).toBe(false);
  });
});
