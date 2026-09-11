import { describe, expect, it } from 'vitest';

import { countdownTo, matchClockLabel, pointsLabel, resolvedStatus } from './format';
import { homeQuip, titleForStats } from './titles';

describe('countdownTo', () => {
  it('affiche les minutes sous une heure', () => {
    expect(countdownTo('2026-09-10T18:40:00Z', new Date('2026-09-10T18:10:00Z'))).toBe('30 min');
  });

  it('passe en live après le coup d’envoi', () => {
    expect(matchClockLabel({ startsAt: '2026-09-10T18:00:00Z', status: 'scheduled' }, new Date('2026-09-10T18:01:00Z'))).toBe('Live');
    expect(resolvedStatus({ startsAt: '2026-09-10T18:00:00Z', status: 'scheduled' }, new Date('2026-09-10T18:01:00Z'))).toBe('live');
  });
});

describe('pointsLabel', () => {
  it('traduit le barème', () => {
    expect(pointsLabel(5)).toBe('+5 EXACT');
    expect(pointsLabel(0)).toBe('0 PT');
    expect(pointsLabel(null)).toBeNull();
  });
});

describe('titleForStats', () => {
  it('monte en grade avec les points', () => {
    expect(titleForStats(0)).toBe('Rookie de la Faille');
    expect(titleForStats(42)).toBe('Oracle du dimanche');
    expect(titleForStats(42, 5)).toBe('En feu, ne pas approcher');
  });
});

describe('homeQuip', () => {
  it('rappelle les pronos ouverts', () => {
    expect(homeQuip({ streak: 0, pending: 2, missed: 0 })).toContain('2 PRONOS');
  });
});
