import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ESPORTS_API = 'https://esports-api.lolesports.com/persisted/gw';
const ESPORTS_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const SOURCE_LICENSE = 'lolesports.com public schedule + Leaguepedia data, CC BY-SA';
const SKIP_SLUGS = new Set(['tft_esports']);
const PAGE_CAP = 8;

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

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

const shortName = (name: string, code?: string) => {
  if (code) return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
  const words = name.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((word) => word[0]).join('') : name.slice(0, 4))
    .toUpperCase()
    .slice(0, 5);
};

const teamColor = (name: string) => {
  const colors = ['#C7F43D', '#56DDE8', '#8B5CF6', '#FF6B6B', '#F5C451', '#F08CD2'];
  const hash = [...name].reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const competitionId = (leagueSlug: string, name: string) =>
  SLUG_TO_ID[leagueSlug] || slug(leagueSlug) || slug(name);

async function esportsGet<T>(path: string): Promise<T> {
  const response = await fetch(`${ESPORTS_API}/${path}`, {
    headers: { 'x-api-key': ESPORTS_KEY, 'User-Agent': 'MyLittleLeague/1.0 community prediction app' },
  });
  if (!response.ok) throw new Error(`lolesports HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchSchedule() {
  const from = Date.now() - 7 * 86400000;
  const to = Date.now() + 28 * 86400000;
  const leagues = await esportsGet<{ data?: { leagues?: Array<{ id?: string; slug?: string }> } }>('getLeagues?hl=en-US');
  const leagueId = (leagues.data?.leagues ?? [])
    .filter((league) => league.id && league.slug && !SKIP_SLUGS.has(league.slug))
    .map((league) => league.id)
    .join(',');
  if (!leagueId) throw new Error('Aucune ligue lolesports');

  const events: EsportsEvent[] = [];
  const firstParams = new URLSearchParams({ hl: 'en-US', leagueId });
  const first = await esportsGet<{ data?: { schedule?: { events?: EsportsEvent[]; pages?: { older?: string | null; newer?: string | null } } } }>(
    `getSchedule?${firstParams.toString()}`,
  );
  events.push(...(first.data?.schedule?.events ?? []));
  let newer = first.data?.schedule?.pages?.newer;
  let older = first.data?.schedule?.pages?.older;
  for (let page = 0; page < PAGE_CAP && newer; page += 1) {
    const params = new URLSearchParams({ hl: 'en-US', leagueId, pageToken: newer });
    const next = await esportsGet<{ data?: { schedule?: { events?: EsportsEvent[]; pages?: { newer?: string | null } } } }>(
      `getSchedule?${params.toString()}`,
    );
    const batch = next.data?.schedule?.events ?? [];
    events.push(...batch);
    const last = Date.parse(batch.at(-1)?.startTime ?? '');
    if (!batch.length || (Number.isFinite(last) && last > to) || !next.data?.schedule?.pages?.newer) break;
    newer = next.data?.schedule?.pages?.newer;
  }
  for (let page = 0; page < PAGE_CAP && older; page += 1) {
    const params = new URLSearchParams({ hl: 'en-US', leagueId, pageToken: older });
    const prev = await esportsGet<{ data?: { schedule?: { events?: EsportsEvent[]; pages?: { older?: string | null } } } }>(
      `getSchedule?${params.toString()}`,
    );
    const batch = prev.data?.schedule?.events ?? [];
    events.push(...batch);
    const firstTime = Date.parse(batch[0]?.startTime ?? '');
    if (!batch.length || (Number.isFinite(firstTime) && firstTime < from) || !prev.data?.schedule?.pages?.older) break;
    older = prev.data?.schedule?.pages?.older;
  }

  return events
    .map((event) => {
      if (event.type && event.type !== 'match') return null;
      const leagueSlug = event.league?.slug ?? '';
      if (!leagueSlug || SKIP_SLUGS.has(leagueSlug)) return null;
      const teamA = event.match?.teams?.[0];
      const teamB = event.match?.teams?.[1];
      const nameA = teamA?.name?.trim() ?? '';
      const nameB = teamB?.name?.trim() ?? '';
      const startsAt = event.startTime?.trim() ?? '';
      if (!nameA || !nameB || !startsAt || nameA === 'TBD' || nameB === 'TBD') return null;
      const time = new Date(startsAt).getTime();
      if (time < from || time > to) return null;
      const state = event.state ?? 'unstarted';
      const scoreA = state === 'unstarted' ? null : teamA?.result?.gameWins ?? null;
      const scoreB = state === 'unstarted' ? null : teamB?.result?.gameWins ?? null;
      const finished = state === 'completed' && scoreA != null && scoreB != null;
      const live = state === 'inProgress' || (!finished && time <= Date.now());
      const bestOf = [1, 3, 5].includes(Number(event.match?.strategy?.count)) ? Number(event.match?.strategy?.count) : 3;
      const stableId = event.match?.id || `${slug(nameA)}-${slug(nameB)}-${startsAt.replace(/\D/g, '')}`;
      return {
        id: `lolesports-${stableId}`,
        competitionId: competitionId(leagueSlug, event.league?.name ?? leagueSlug),
        teamA: nameA,
        teamB: nameB,
        codeA: teamA?.code,
        codeB: teamB?.code,
        startsAt: new Date(startsAt).toISOString(),
        bestOf,
        stage: event.blockName?.trim() || 'Saison régulière',
        scoreA,
        scoreB,
        status: finished ? 'finished' : live ? 'live' : 'scheduled',
        tournament: event.league?.name ?? leagueSlug,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

Deno.serve(async (request) => {
  const syncSecret = Deno.env.get('SYNC_SECRET');
  if (!syncSecret) return Response.json({ error: 'SYNC_SECRET absent' }, { status: 503 });
  if (request.headers.get('x-sync-secret') !== syncSecret) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const normalized = await fetchSchedule();
    const unique = new Map<string, Record<string, unknown>>();
    for (const match of normalized) unique.set(String(match.id), match);
    const matchesIn = [...unique.values()];

    const teamNames = [...new Set(matchesIn.flatMap((match) => [String(match.teamA), String(match.teamB)]))];
    const teams = teamNames.map((name) => {
      const sample = matchesIn.find((match) => match.teamA === name || match.teamB === name);
      const code = sample?.teamA === name ? String(sample.codeA ?? '') : String(sample?.codeB ?? '');
      return {
        id: slug(name),
        name,
        short_name: shortName(name, code),
        region: 'PRO',
        color: teamColor(name),
        source_name: name,
        updated_at: new Date().toISOString(),
      };
    });
    if (teams.length) {
      const { error } = await supabase.from('teams').upsert(teams, { onConflict: 'id' });
      if (error) throw error;
    }

    const matches = matchesIn.map((match) => ({
      id: match.id,
      competition_id: match.competitionId,
      team_a_id: slug(String(match.teamA)),
      team_b_id: slug(String(match.teamB)),
      starts_at: match.startsAt,
      best_of: match.bestOf,
      stage: match.stage,
      score_a: match.scoreA,
      score_b: match.scoreB,
      status: match.status,
      source: 'lolesports',
      source_url: 'https://lolesports.com/schedule',
      result_source: match.status === 'finished' ? 'lolesports' : null,
      source_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    if (matches.length) {
      const { error } = await supabase.from('matches').upsert(matches, { onConflict: 'id' });
      if (error) throw error;
    }

    await supabase.from('feed_cache').upsert({
      key: 'leaguepedia-schedule',
      payload: { count: matches.length, attribution: SOURCE_LICENSE },
      fetched_at: new Date().toISOString(),
      status: 'ok',
      error_message: null,
    });

    return Response.json({ imported: matches.length, teams: teams.length, attribution: SOURCE_LICENSE });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { data: previous } = await supabase.from('feed_cache').select('payload').eq('key', 'leaguepedia-schedule').maybeSingle();
    await supabase.from('feed_cache').upsert({
      key: 'leaguepedia-schedule',
      payload: previous?.payload ?? { attribution: SOURCE_LICENSE },
      fetched_at: new Date().toISOString(),
      status: 'error',
      error_message: message,
    });
    return Response.json({ error: message, fallback: 'Les dernières données valides restent disponibles.' }, { status: 502 });
  }
});
