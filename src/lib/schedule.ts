import { fetchLeaguepediaSchedule, mergeUniqueMatches, type FeedSource } from './leaguepedia';
import { fetchLolesportsSchedule } from './lolesports';

let inflight: Promise<{ matches: Awaited<ReturnType<typeof fetchLolesportsSchedule>>; source: FeedSource }> | null = null;

export async function fetchLiveSchedule() {
  if (inflight) return inflight;
  inflight = loadLiveSchedule().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function loadLiveSchedule() {
  const [esports, wiki] = await Promise.allSettled([fetchLolesportsSchedule(), fetchLeaguepediaSchedule()]);
  const esportsMatches = esports.status === 'fulfilled' ? esports.value : [];
  const wikiMatches = wiki.status === 'fulfilled' ? wiki.value : [];
  if (!esportsMatches.length && !wikiMatches.length) {
    const reason = esports.status === 'rejected'
      ? esports.reason
      : wiki.status === 'rejected'
        ? wiki.reason
        : new Error('Aucun calendrier pro disponible.');
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
  const matches = esportsMatches.length ? mergeUniqueMatches(esportsMatches, wikiMatches) : wikiMatches;
  const source: FeedSource = esportsMatches.length && wikiMatches.length
    ? 'mixed'
    : esportsMatches.length
      ? 'lolesports'
      : 'leaguepedia';
  return { matches, source };
}
