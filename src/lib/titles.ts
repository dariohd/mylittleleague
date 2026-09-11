export const TITLE_LADDER = [
  { min: 0, title: 'Rookie de la Faille' },
  { min: 1, title: 'Premier sang' },
  { min: 25, title: 'Pas complètement random' },
  { min: 40, title: 'Oracle du dimanche' },
  { min: 70, title: 'Cerveau galactique' },
  { min: 100, title: 'Baron des pronos' },
] as const;

export function titleForStats(points: number, streak = 0) {
  if (streak >= 5) return 'En feu, ne pas approcher';
  const rung = [...TITLE_LADDER].reverse().find((item) => points >= item.min);
  return rung?.title ?? TITLE_LADDER[0].title;
}

export function homeQuip(input: { streak: number; pending: number; missed: number }) {
  if (input.pending > 0) {
    return input.pending === 1
      ? '1 PRONO EN SUSPENS. ON ATTEND.'
      : `${input.pending} PRONOS EN SUSPENS. ON ATTEND.`;
  }
  if (input.streak >= 3) return 'SÉRIE EN COURS. NE CASSE RIEN.';
  if (input.missed > 0) return 'TU AS LAISSÉ DES POINTS SUR LA TABLE.';
  return 'AUCUNE PRESSION. JUSTE TA RÉPUTATION.';
}
