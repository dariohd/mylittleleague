export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type Team = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  region: string;
};

export type Competition = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

export type Match = {
  id: string;
  competitionId: string;
  stage: string;
  startsAt: string;
  bestOf: number;
  teamA: Team;
  teamB: Team;
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
};

export type Prediction = {
  id: string;
  matchId: string;
  userId: string;
  winnerId: string;
  scoreA: number;
  scoreB: number;
  points: number | null;
  createdAt: string;
};

export type Player = {
  id: string;
  username: string;
  title: string;
  points: number;
  exactScores: number;
  streak: number;
  color: string;
};

export type Group = {
  id: string;
  name: string;
  code: string;
  members: Player[];
};

export type Reward = {
  id: string;
  name: string;
  description: string;
  threshold: number;
  accent: string;
};
