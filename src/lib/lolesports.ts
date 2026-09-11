import type { Match } from '@/types';

import {
  classifyCompetition,
  leagueById,
  rememberLeague,
  slugify,
  teamFromName,
} from './leaguepedia';

const ESPORTS_API = 'https://esports-api.lolesports.com/persisted/gw';
const ESPORTS_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const SKIP_SLUGS = new Set(['tft_esports']);
const PAGE_CAP = 8;
const WINDOW_PAST_MS = 7 * 86400000;
const WINDOW_FUTURE_MS = 28 * 86400000;

const SLUG_TO_ID: Record<string, string> = {
  worlds: 'worlds',
  msi: 'msi',
  first_stand: 'first-stand',
  ewc_lol: 'ewc',
  lec: 'lec',
  lck: 'lck',
  lck_challengers_league: 'lck-cl',
  lpl: 'lpl',
  lcs: 'lcs',
  lta_n: 'lta',
  lta_s: 'lta',
  lta_cross: 'lta',
  americas_cup: 'lta',
  lla: 'lta',
  emea_masters: 'emea-masters',
  lfl: 'lfl',
  primeleague: 'prime',
  nlc: 'nlc',
  'turkiye-sampiyonluk-ligi': 'tcl',
  les: 'superliga',
  pcs: 'pcs',
  lcp: 'lcp',
  vcs: 'vcs',
  'ljl-japan': 'ljl',
  'cblol-brazil': 'cblol',
  nacl: 'nacl',
  north_regional_league: 'lrn',
  south_regional_league: 'lrs',
};

type EsportsTeam = {
  name?: string;
  code?: string;
  result?: { outcome?: string | null; gameWins?: number | null };
};

type EsportsEvent = {
  startTime?: string;
  state?: string;
  type?: string;
  blockName?: string;
  league?: { name?: string; slug?: string };
  match?: {
    id?: string;
    teams?: EsportsTeam[];
    strategy?: { type?: string; count?: number };
  };
};

type SchedulePage = {
  events: EsportsEvent[];
  pages: { older?: string | null; newer?: string | null };
};

function shortFromName(name: string) {
  if (name.length <= 8) return name.toUpperCase();
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 6);
}

export function competitionIdFromEsports(slug: string, name: string) {
  const mapped = SLUG_TO_ID[slug];
  if (mapped) return mapped;
  const classified = classifyCompetition(name) ?? classifyCompetition(slug.replace(/[_-]+/g, ' '));
  if (classified) return classified.id;
  const id = slugify(slug) || slugify(name);
  rememberLeague(id, shortFromName(name));
  return id;
}

export function normalizeLolesportsEvent(event: EsportsEvent, now = new Date()): Match | null {
  if (event.type && event.type !== 'match') return null;
  const slug = event.league?.slug ?? '';
  if (!slug || SKIP_SLUGS.has(slug)) return null;
  const teamA = event.match?.teams?.[0];
  const teamB = event.match?.teams?.[1];
  const nameA = teamA?.name?.trim() ?? '';
  const nameB = teamB?.name?.trim() ?? '';
  const startsAtRaw = event.startTime?.trim() ?? '';
  if (!nameA || !nameB || !startsAtRaw || nameA === 'TBD' || nameB === 'TBD') return null;
  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) return null;

  const competitionId = competitionIdFromEsports(slug, event.league?.name ?? slug);
  const league = leagueById(competitionId);
  const region = league?.region ?? 'PRO';
  const state = event.state ?? 'unstarted';
  const scoreA = state === 'unstarted' ? null : teamA?.result?.gameWins ?? null;
  const scoreB = state === 'unstarted' ? null : teamB?.result?.gameWins ?? null;
  const finished = state === 'completed' && scoreA != null && scoreB != null;
  const live = state === 'inProgress' || (!finished && startsAt <= now);
  const bestOf = [1, 3, 5].includes(Number(event.match?.strategy?.count))
    ? Number(event.match?.strategy?.count)
    : 3;
  const matchId = event.match?.id || `${slugify(nameA)}-${slugify(nameB)}-${startsAtRaw.replace(/\D/g, '')}`;

  return {
    id: `lolesports-${matchId}`,
    competitionId,
    stage: event.blockName?.trim() || 'Saison régulière',
    startsAt: startsAt.toISOString(),
    bestOf,
    teamA: teamFromName(nameA, region, teamA?.code),
    teamB: teamFromName(nameB, region, teamB?.code),
    scoreA,
    scoreB,
    status: finished ? 'finished' : live ? 'live' : 'scheduled',
  };
}

async function esportsGet<T>(path: string): Promise<T> {
  const response = await fetch(`${ESPORTS_API}/${path}`, {
    headers: { 'x-api-key': ESPORTS_KEY },
  });
  if (!response.ok) throw new Error(`Calendrier lolesports HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

let leagueIdsCache: { value: string; fetchedAt: number } | null = null;

async function leagueIdsParam() {
  if (leagueIdsCache && Date.now() - leagueIdsCache.fetchedAt < 6 * 60 * 60 * 1000) {
    return leagueIdsCache.value;
  }
  const body = await esportsGet<{ data?: { leagues?: Array<{ id?: string; slug?: string }> } }>('getLeagues?hl=en-US');
  const ids = (body.data?.leagues ?? [])
    .filter((league) => league.id && league.slug && !SKIP_SLUGS.has(league.slug))
    .map((league) => league.id)
    .join(',');
  if (!ids) throw new Error('Aucune ligue renvoyée par lolesports.');
  leagueIdsCache = { value: ids, fetchedAt: Date.now() };
  return ids;
}

async function fetchSchedulePage(leagueId: string, pageToken?: string | null): Promise<SchedulePage> {
  const params = new URLSearchParams({ hl: 'en-US', leagueId });
  if (pageToken) params.set('pageToken', pageToken);
  const body = await esportsGet<{ data?: { schedule?: SchedulePage } }>(`getSchedule?${params.toString()}`);
  return {
    events: body.data?.schedule?.events ?? [],
    pages: body.data?.schedule?.pages ?? {},
  };
}

let inflight: Promise<Match[]> | null = null;

export async function fetchLolesportsSchedule(now = Date.now()): Promise<Match[]> {
  if (inflight) return inflight;
  inflight = loadLolesportsSchedule(now).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function loadLolesportsSchedule(now: number): Promise<Match[]> {
  const from = now - WINDOW_PAST_MS;
  const to = now + WINDOW_FUTURE_MS;
  const leagueId = await leagueIdsParam();
  const first = await fetchSchedulePage(leagueId);
  const events = [...first.events];

  let newer = first.pages.newer;
  for (let page = 0; page < PAGE_CAP && newer; page += 1) {
    const next = await fetchSchedulePage(leagueId, newer);
    events.push(...next.events);
    const lastTime = Date.parse(next.events.at(-1)?.startTime ?? '');
    if (!next.events.length || (Number.isFinite(lastTime) && lastTime > to) || !next.pages.newer) break;
    newer = next.pages.newer;
  }

  let older = first.pages.older;
  for (let page = 0; page < PAGE_CAP && older; page += 1) {
    const prev = await fetchSchedulePage(leagueId, older);
    events.push(...prev.events);
    const firstTime = Date.parse(prev.events[0]?.startTime ?? '');
    if (!prev.events.length || (Number.isFinite(firstTime) && firstTime < from) || !prev.pages.older) break;
    older = prev.pages.older;
  }

  const unique = new Map<string, Match>();
  for (const event of events) {
    const match = normalizeLolesportsEvent(event, new Date(now));
    if (!match) continue;
    const time = new Date(match.startsAt).getTime();
    if (time < from || time > to) continue;
    unique.set(match.id, match);
  }
  return [...unique.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
