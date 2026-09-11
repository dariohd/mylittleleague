import type { Match, Team } from '@/types';

export type LeaguepediaTitle = {
  MatchId?: string;
  Tournament?: string;
  OverviewPage?: string;
  Team1?: string;
  Team2?: string;
  Team1Score?: string;
  Team2Score?: string;
  DateTimeUTC?: string;
  'DateTime UTC'?: string;
  BestOf?: string;
  Phase?: string;
  Winner?: string;
};

export type League = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  region: string;
  pattern: RegExp;
};

export const LEAGUES: League[] = [
  { id: 'worlds', shortName: 'WORLDS', name: 'Worlds', color: '#C7F43D', region: 'INT', pattern: /Worlds|World Championship/i },
  { id: 'msi', shortName: 'MSI', name: 'MSI', color: '#56DDE8', region: 'INT', pattern: /\bMSI\b|Mid-Season Invitational/i },
  { id: 'first-stand', shortName: 'FS', name: 'First Stand', color: '#F5C451', region: 'INT', pattern: /First Stand/i },
  { id: 'ewc', shortName: 'EWC', name: 'Esports World Cup', color: '#FF6B6B', region: 'INT', pattern: /Esports World Cup|\bEWC\b/i },
  { id: 'lck-cl', shortName: 'LCK CL', name: 'LCK Challengers', color: '#7DD3FC', region: 'KR', pattern: /LCK CL|LCK Challengers/i },
  { id: 'lck', shortName: 'LCK', name: 'LCK', color: '#56DDE8', region: 'KR', pattern: /\bLCK\b/i },
  { id: 'lpl', shortName: 'LPL', name: 'LPL', color: '#F5C451', region: 'CN', pattern: /\bLPL\b/i },
  { id: 'lec', shortName: 'LEC', name: 'LEC', color: '#8B5CF6', region: 'EMEA', pattern: /\bLEC\b/i },
  { id: 'lta', shortName: 'LTA', name: 'LTA', color: '#FF6B6B', region: 'AMERICAS', pattern: /\bLTA\b|Championship of The Americas/i },
  { id: 'lcs', shortName: 'LCS', name: 'LCS', color: '#FF6B6B', region: 'NA', pattern: /\bLCS\b/i },
  { id: 'emea-masters', shortName: 'EM', name: 'EMEA Masters', color: '#C4B5FD', region: 'EMEA', pattern: /EMEA Masters/i },
  { id: 'lfl', shortName: 'LFL', name: 'LFL', color: '#60A5FA', region: 'FR', pattern: /\bLFL\b/i },
  { id: 'prime', shortName: 'PRM', name: 'Prime League', color: '#F97316', region: 'DE', pattern: /Prime League/i },
  { id: 'superliga', shortName: 'SL', name: 'Superliga', color: '#FB7185', region: 'ES', pattern: /SuperLiga|Superliga/i },
  { id: 'nlc', shortName: 'NLC', name: 'NLC', color: '#34D399', region: 'NORDICS', pattern: /\bNLC\b/i },
  { id: 'tcl', shortName: 'TCL', name: 'TCL', color: '#FBBF24', region: 'TR', pattern: /\bTCL\b/i },
  { id: 'pcs', shortName: 'PCS', name: 'PCS', color: '#22D3EE', region: 'PCS', pattern: /\bPCS\b|Pacific Championship/i },
  { id: 'lcp', shortName: 'LCP', name: 'LCP', color: '#38BDF8', region: 'APAC', pattern: /\bLCP\b/i },
  { id: 'vcs', shortName: 'VCS', name: 'VCS', color: '#4ADE80', region: 'VN', pattern: /\bVCS\b/i },
  { id: 'ljl', shortName: 'LJL', name: 'LJL', color: '#A78BFA', region: 'JP', pattern: /\bLJL\b/i },
  { id: 'cblol', shortName: 'CBLOL', name: 'CBLOL', color: '#F59E0B', region: 'BR', pattern: /\bCBLOL\b/i },
  { id: 'nacl', shortName: 'NACL', name: 'NACL', color: '#FB7185', region: 'NA', pattern: /\bNACL\b/i },
  { id: 'lrn', shortName: 'LRN', name: 'Liga Regional Norte', color: '#F97316', region: 'LATAM', pattern: /\bLRN\b/i },
  { id: 'lrs', shortName: 'LRS', name: 'Liga Regional Sur', color: '#F59E0B', region: 'LATAM', pattern: /\bLRS\b/i },
];

const TEAM_COLORS = ['#C7F43D', '#56DDE8', '#8B5CF6', '#FF6B6B', '#F5C451', '#F08CD2', '#F97316', '#34D399'];
const extraLeagues = new Map<string, Pick<League, 'shortName' | 'color' | 'region'>>();

const LEAGUEPEDIA_API = 'https://lol.fandom.com/api.php';
const FEED_CACHE_KEY = 'mll-feed-v2';
export const FEED_TTL_MS = 20 * 60 * 1000;

const OVERVIEW_FILTER = [
  '%LEC%',
  '%LCK%',
  '%LPL%',
  '%LTA%',
  '%LCS%',
  '%Worlds%',
  '%World Championship%',
  '%MSI%',
  '%First Stand%',
  '%Esports World Cup%',
  '%EMEA Masters%',
  '%LFL%',
  '%Prime League%',
  '%Superliga%',
  '%SuperLiga%',
  '%NLC%',
  '%TCL%',
  '%PCS%',
  '%LCP%',
  '%VCS%',
  '%LJL%',
  '%CBLOL%',
  '%Challengers%',
]
  .map((token) => `MS.OverviewPage LIKE "${token}"`)
  .join(' OR ');

export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

export function classifyCompetition(tournament: string) {
  return LEAGUES.find((league) => league.pattern.test(tournament)) ?? null;
}

export function leagueById(id: string) {
  return LEAGUES.find((league) => league.id === id) ?? null;
}

export function rememberLeague(id: string, shortName: string, color?: string, region = 'PRO') {
  if (leagueById(id) || extraLeagues.has(id)) return;
  extraLeagues.set(id, {
    shortName,
    color: color ?? TEAM_COLORS[[...id].reduce((total, character) => total + character.charCodeAt(0), 0) % TEAM_COLORS.length],
    region,
  });
}

export function leagueLabel(competitionId: string) {
  return leagueById(competitionId)?.shortName ?? extraLeagues.get(competitionId)?.shortName ?? competitionId.toUpperCase();
}

export function leagueColor(competitionId: string) {
  return leagueById(competitionId)?.color ?? extraLeagues.get(competitionId)?.color ?? '#8B5CF6';
}

export function leaguePillDark(competitionId: string) {
  return ['#C7F43D', '#56DDE8', '#7DD3FC', '#F5C451', '#FBBF24', '#4ADE80', '#22D3EE', '#34D399', '#38BDF8'].includes(
    leagueColor(competitionId),
  );
}

function cargoValue(title: LeaguepediaTitle, ...keys: (keyof LeaguepediaTitle)[]) {
  for (const key of keys) {
    const value = title[key];
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

export function teamFromName(name: string, region: string, code?: string): Team {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const shortName = (code?.replace(/[^a-zA-Z0-9]/g, '') || (words.length > 1 ? words.map((word) => word[0]).join('') : name))
    .toUpperCase()
    .slice(0, 5);
  const hash = [...name].reduce((total, character) => total + character.charCodeAt(0), 0);
  return {
    id: slugify(name) || 'team',
    name,
    shortName: shortName || 'TEAM',
    color: TEAM_COLORS[hash % TEAM_COLORS.length],
    region,
  };
}

export function normalizeLeaguepediaMatch(title: LeaguepediaTitle, now = new Date()) {
  const tournament = cargoValue(title, 'Tournament', 'OverviewPage');
  const competition = classifyCompetition(tournament);
  const teamA = cargoValue(title, 'Team1');
  const teamB = cargoValue(title, 'Team2');
  const rawDate = cargoValue(title, 'DateTimeUTC', 'DateTime UTC');
  if (!competition || !teamA || !teamB || !rawDate || teamA === 'TBD' || teamB === 'TBD') return null;

  const startsAt = new Date(`${rawDate.replace(' ', 'T')}Z`);
  if (Number.isNaN(startsAt.getTime())) return null;
  const scoreARaw = cargoValue(title, 'Team1Score');
  const scoreBRaw = cargoValue(title, 'Team2Score');
  const scoreA = scoreARaw === '' ? null : Number(scoreARaw);
  const scoreB = scoreBRaw === '' ? null : Number(scoreBRaw);
  const finished = Boolean(cargoValue(title, 'Winner') && scoreA != null && scoreB != null && scoreA !== scoreB);
  const stableId = cargoValue(title, 'MatchId') || `${slugify(tournament)}-${slugify(teamA)}-${slugify(teamB)}-${rawDate.replace(/\D/g, '')}`;

  return {
    id: `leaguepedia-${stableId}`,
    competitionId: competition.id,
    teamA,
    teamB,
    startsAt: startsAt.toISOString(),
    bestOf: [1, 3, 5].includes(Number(title.BestOf)) ? Number(title.BestOf) : 3,
    stage: cargoValue(title, 'Phase') || 'Saison régulière',
    scoreA,
    scoreB,
    status: finished ? 'finished' as const : startsAt <= now ? 'live' as const : 'scheduled' as const,
    tournament,
  };
}

export function toAppMatch(
  row: NonNullable<ReturnType<typeof normalizeLeaguepediaMatch>>,
): Match {
  const league = LEAGUES.find((item) => item.id === row.competitionId);
  const region = league?.region ?? 'PRO';
  return {
    id: row.id,
    competitionId: row.competitionId,
    stage: row.stage,
    startsAt: row.startsAt,
    bestOf: row.bestOf,
    teamA: teamFromName(row.teamA, region),
    teamB: teamFromName(row.teamB, region),
    scoreA: row.scoreA,
    scoreB: row.scoreB,
    status: row.status,
  };
}

export type FeedSource = 'lolesports' | 'leaguepedia' | 'mixed';

export type FeedCache = {
  matches: Match[];
  fetchedAt: string;
  source: FeedSource;
};

export function matchFingerprint(match: Match) {
  const teamA = slugify(match.teamA.name);
  const teamB = slugify(match.teamB.name);
  const [left, right] = teamA < teamB ? [teamA, teamB] : [teamB, teamA];
  return `${left}::${right}::${match.startsAt.slice(0, 13)}`;
}

export function mergeUniqueMatches(primary: Match[], extra: Match[]) {
  const seen = new Set(primary.map(matchFingerprint));
  const additions = extra.filter((match) => {
    const key = matchFingerprint(match);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...primary, ...additions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function isLiveFeedMatch(id: string) {
  return id.startsWith('lolesports-') || id.startsWith('leaguepedia-');
}

export function readFeedCache(): FeedCache | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedCache;
    if (!Array.isArray(parsed.matches) || parsed.matches.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeFeedCache(cache: FeedCache) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function isFeedFresh(fetchedAt: string, now = Date.now()) {
  return now - new Date(fetchedAt).getTime() < FEED_TTL_MS;
}

export function mergeFeedMatches(local: Match[], incoming: Match[]): Match[] {
  const previous = new Map(local.map((match) => [match.id, match]));
  return [...incoming]
    .map((incomingMatch) => {
      const stored = previous.get(incomingMatch.id);
      if (stored?.status === 'finished' && incomingMatch.status !== 'finished') return stored;
      return incomingMatch;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

let inflight: Promise<Match[]> | null = null;

export async function fetchLeaguepediaSchedule(): Promise<Match[]> {
  if (inflight) return inflight;
  inflight = loadSchedule().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function cargoPage(from: string, to: string, offset: number) {
  const params = new URLSearchParams({
    action: 'cargoquery',
    format: 'json',
    origin: '*',
    tables: 'MatchSchedule=MS',
    fields: [
      'MS.MatchId=MatchId',
      'MS.OverviewPage=Tournament',
      'MS.Team1=Team1',
      'MS.Team2=Team2',
      'MS.Team1Score=Team1Score',
      'MS.Team2Score=Team2Score',
      'MS.DateTime_UTC=DateTimeUTC',
      'MS.BestOf=BestOf',
      'MS.Phase=Phase',
      'MS.Winner=Winner',
    ].join(','),
    where: `MS.DateTime_UTC >= "${from}" AND MS.DateTime_UTC <= "${to}" AND (${OVERVIEW_FILTER})`,
    order_by: 'MS.DateTime_UTC ASC',
    limit: '500',
    offset: String(offset),
  });

  const response = await fetch(`${LEAGUEPEDIA_API}?${params.toString()}`);
  if (!response.ok) throw new Error(`Leaguepedia HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(String(body.error.info ?? body.error.code ?? 'erreur Leaguepedia'));
  return (body.cargoquery ?? []) as Array<{ title: LeaguepediaTitle }>;
}

async function loadSchedule() {
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10);
  const rows: Array<{ title: LeaguepediaTitle }> = [];
  for (let page = 0; page < 4; page += 1) {
    const chunk = await cargoPage(from, to, page * 500);
    rows.push(...chunk);
    if (chunk.length < 500) break;
  }

  const unique = new Map<string, Match>();
  for (const row of rows) {
    const match = normalizeLeaguepediaMatch(row.title);
    if (match) unique.set(match.id, toAppMatch(match));
  }
  return [...unique.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

