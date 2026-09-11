import type { Competition, Group, Match, Player, Reward, Team } from '@/types';

const dateAt = (hoursFromNow: number) =>
  new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();

export const teams: Record<string, Team> = {
  g2: { id: 'g2', name: 'G2 Esports', shortName: 'G2', color: '#F25C54', region: 'EMEA' },
  fnc: { id: 'fnc', name: 'Fnatic', shortName: 'FNC', color: '#FF8A00', region: 'EMEA' },
  kc: { id: 'kc', name: 'Karmine Corp', shortName: 'KC', color: '#3C8DFF', region: 'EMEA' },
  koi: { id: 'koi', name: 'Movistar KOI', shortName: 'MKOI', color: '#D65CFF', region: 'EMEA' },
  t1: { id: 't1', name: 'T1', shortName: 'T1', color: '#E5383B', region: 'LCK' },
  geng: { id: 'geng', name: 'Gen.G', shortName: 'GEN', color: '#D7B84A', region: 'LCK' },
  hle: { id: 'hle', name: 'Hanwha Life Esports', shortName: 'HLE', color: '#FF7A28', region: 'LCK' },
  dk: { id: 'dk', name: 'Dplus KIA', shortName: 'DK', color: '#53C6E6', region: 'LCK' },
};

export const competitions: Competition[] = [
  { id: 'lec', name: 'LEC', shortName: 'LEC', color: '#8B5CF6' },
  { id: 'lck', name: 'LCK', shortName: 'LCK', color: '#56DDE8' },
];

export const demoMatches: Match[] = [
  {
    id: 'demo-1',
    competitionId: 'lec',
    stage: 'Semaine 4',
    startsAt: dateAt(3),
    bestOf: 3,
    teamA: teams.g2,
    teamB: teams.kc,
    scoreA: null,
    scoreB: null,
    status: 'scheduled',
  },
  {
    id: 'demo-2',
    competitionId: 'lck',
    stage: 'Saison régulière',
    startsAt: dateAt(8),
    bestOf: 3,
    teamA: teams.t1,
    teamB: teams.geng,
    scoreA: null,
    scoreB: null,
    status: 'scheduled',
  },
  {
    id: 'demo-3',
    competitionId: 'lec',
    stage: 'Semaine 4',
    startsAt: dateAt(27),
    bestOf: 3,
    teamA: teams.fnc,
    teamB: teams.koi,
    scoreA: null,
    scoreB: null,
    status: 'scheduled',
  },
  {
    id: 'demo-4',
    competitionId: 'lck',
    stage: 'Saison régulière',
    startsAt: dateAt(-4),
    bestOf: 3,
    teamA: teams.hle,
    teamB: teams.dk,
    scoreA: 2,
    scoreB: 1,
    status: 'finished',
  },
  {
    id: 'demo-5',
    competitionId: 'lec',
    stage: 'Semaine 4',
    startsAt: dateAt(0.4),
    bestOf: 3,
    teamA: teams.fnc,
    teamB: teams.g2,
    scoreA: null,
    scoreB: null,
    status: 'scheduled',
  },
  {
    id: 'demo-6',
    competitionId: 'lck',
    stage: 'Saison régulière',
    startsAt: dateAt(-0.2),
    bestOf: 5,
    teamA: teams.t1,
    teamB: teams.hle,
    scoreA: 1,
    scoreB: 1,
    status: 'live',
  },
];

export const currentPlayer: Player = {
  id: 'demo-user',
  username: 'Dariohd',
  title: 'Oracle du dimanche',
  points: 42,
  exactScores: 5,
  streak: 3,
  color: '#C7F43D',
};

export const rivals: Player[] = [
  currentPlayer,
  { id: 'p2', username: 'Choky', title: 'Draft suspecte', points: 39, exactScores: 4, streak: 1, color: '#56DDE8' },
  { id: 'p3', username: 'BaronNasheur', title: 'Visionnaire bronze', points: 34, exactScores: 3, streak: 0, color: '#FF6B6B' },
  { id: 'p4', username: 'FlashSurD', title: 'Analyste du canapé', points: 28, exactScores: 2, streak: 2, color: '#8B5CF6' },
];

export const demoGroups: Group[] = [
  { id: 'g-friends', name: 'Les 5 sans ward', code: 'NASH42', members: rivals },
  { id: 'g-office', name: 'Pause macro', code: 'DIFF09', members: rivals.slice(0, 3) },
];

export const rewards: Reward[] = [
  { id: 'r1', name: 'Premier sang', description: 'Réussir son premier prono', threshold: 1, accent: '#FF6B6B' },
  { id: 'r2', name: 'Pas complètement random', description: 'Atteindre 25 points', threshold: 25, accent: '#56DDE8' },
  { id: 'r3', name: 'Oracle du dimanche', description: 'Atteindre 40 points', threshold: 40, accent: '#C7F43D' },
  { id: 'r4', name: 'Cerveau galactique', description: 'Atteindre 100 points', threshold: 100, accent: '#8B5CF6' },
];
