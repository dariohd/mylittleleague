import type { Prediction } from '@/types';

export const WINNER_POINTS = 3;
export const EXACT_SCORE_BONUS = 2;

export function getWinnerId(
  teamAId: string,
  teamBId: string,
  scoreA: number,
  scoreB: number,
) {
  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? teamAId : teamBId;
}

export function scorePrediction(
  prediction: Pick<Prediction, 'winnerId' | 'scoreA' | 'scoreB'>,
  result: { teamAId: string; teamBId: string; scoreA: number; scoreB: number },
) {
  const actualWinner = getWinnerId(
    result.teamAId,
    result.teamBId,
    result.scoreA,
    result.scoreB,
  );
  if (!actualWinner || prediction.winnerId !== actualWinner) return 0;

  return (
    WINNER_POINTS +
    (prediction.scoreA === result.scoreA && prediction.scoreB === result.scoreB
      ? EXACT_SCORE_BONUS
      : 0)
  );
}

export function isPredictionLocked(startsAt: string, now = new Date()) {
  return new Date(startsAt).getTime() <= now.getTime();
}

export function validSeriesScore(scoreA: number, scoreB: number, bestOf: number) {
  const winsNeeded = Math.ceil(bestOf / 2);
  return (
    scoreA !== scoreB &&
    Math.max(scoreA, scoreB) === winsNeeded &&
    Math.min(scoreA, scoreB) >= 0 &&
    Math.min(scoreA, scoreB) < winsNeeded
  );
}
