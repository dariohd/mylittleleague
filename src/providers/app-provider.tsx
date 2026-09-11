import type { User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { currentPlayer, demoGroups, demoMatches } from '@/data/demo';
import { applyFeedUpdate, applyMatchResult, clearDemoStore, readDemoStore, writeDemoStore, type Notice } from '@/lib/demo-store';
import {
  isFeedFresh,
  readFeedCache,
  writeFeedCache,
  normalizeInviteCode,
} from '@/lib/leaguepedia';
import { fetchLiveSchedule } from '@/lib/schedule';
import { getWinnerId, isPredictionLocked, validSeriesScore } from '@/lib/scoring';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Group, Match, Player, Prediction, Team } from '@/types';

type AuthResult = { error?: string };

type AppContextValue = {
  user: User | null;
  player: Player;
  matches: Match[];
  predictions: Prediction[];
  groups: Group[];
  loading: boolean;
  demoMode: boolean;
  isAdmin: boolean;
  notice: Notice | null;
  notify: (notice: Notice) => void;
  clearNotice: () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, username: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  savePrediction: (match: Match, scoreA: number, scoreB: number) => Promise<AuthResult>;
  createGroup: (name: string) => Promise<AuthResult & { code?: string }>;
  joinGroup: (code: string) => Promise<AuthResult>;
  settleMatch: (matchId: string, scoreA: number, scoreB: number) => Promise<AuthResult>;
  updateUsername: (username: string) => AuthResult;
  resetDemo: () => void;
  syncMatches: (force?: boolean) => Promise<void>;
  feedStatus: 'idle' | 'loading' | 'live' | 'cached' | 'error';
  feedUpdatedAt: string | null;
  refresh: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

const asTeam = (row: Record<string, unknown>): Team => ({
  id: String(row.id),
  name: String(row.name),
  shortName: String(row.short_name),
  color: String(row.color ?? '#C7F43D'),
  region: String(row.region ?? 'INT'),
});

function asMatch(row: Record<string, unknown>): Match {
  const teamA = row.team_a as Record<string, unknown>;
  const teamB = row.team_b as Record<string, unknown>;
  return {
    id: String(row.id),
    competitionId: String(row.competition_id),
    stage: String(row.stage ?? 'Saison régulière'),
    startsAt: String(row.starts_at),
    bestOf: Number(row.best_of),
    teamA: asTeam(teamA),
    teamB: asTeam(teamB),
    scoreA: row.score_a == null ? null : Number(row.score_a),
    scoreB: row.score_b == null ? null : Number(row.score_b),
    status: row.status as Match['status'],
  };
}

export function AppProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>(demoMatches);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [groups, setGroups] = useState<Group[]>(demoGroups);
  const [localPlayer, setLocalPlayer] = useState<Player>(currentPlayer);
  const [remotePlayer, setRemotePlayer] = useState<(Player & { isAdmin?: boolean }) | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [demoReady, setDemoReady] = useState(isSupabaseConfigured);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [feedStatus, setFeedStatus] = useState<'idle' | 'loading' | 'live' | 'cached' | 'error'>('idle');
  const [feedUpdatedAt, setFeedUpdatedAt] = useState<string | null>(null);
  const snapshot = React.useRef({ matches, predictions, groups, player: localPlayer });
  snapshot.current = { matches, predictions, groups, player: localPlayer };

  const notify = useCallback((next: Notice) => setNotice(next), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const refresh = useCallback(async () => {
    if (!supabase) return;

    const [matchesResult, predictionsResult, groupsResult, statsResult] = await Promise.all([
      supabase
        .from('matches')
        .select('*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)')
        .order('starts_at', { ascending: true })
        .limit(400),
      user
        ? supabase.from('predictions').select('*').eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null }),
      user ? supabase.rpc('get_my_groups') : Promise.resolve({ data: [], error: null }),
      user ? supabase.rpc('get_my_stats') : Promise.resolve({ data: null, error: null }),
    ]);

    if (matchesResult.data?.length) {
      setMatches(matchesResult.data.map((row) => asMatch(row as Record<string, unknown>)));
    }
    if (predictionsResult.data) {
      setPredictions(
        predictionsResult.data.map((row) => ({
          id: row.id,
          matchId: row.match_id,
          userId: row.user_id,
          winnerId: row.winner_id,
          scoreA: row.score_a,
          scoreB: row.score_b,
          points: row.points,
          createdAt: row.created_at,
        })),
      );
    }
    if (groupsResult.data?.length) setGroups(groupsResult.data as Group[]);
    if (statsResult.data) setRemotePlayer(statsResult.data as unknown as Player & { isAdmin?: boolean });
  }, [user]);

  const syncMatches = useCallback(async (force = false) => {
    if (isSupabaseConfigured) {
      await refresh();
      return;
    }
    const cache = readFeedCache();
    if (cache) {
      const next = applyFeedUpdate(snapshot.current, cache.matches);
      setMatches(next.matches);
      setPredictions(next.predictions);
      setGroups(next.groups);
      setLocalPlayer(next.player);
      setFeedUpdatedAt(cache.fetchedAt);
      setFeedStatus(isFeedFresh(cache.fetchedAt) ? 'live' : 'cached');
      if (!force && isFeedFresh(cache.fetchedAt)) return;
    }
    setFeedStatus('loading');
    try {
      const incoming = await fetchLiveSchedule();
      if (!incoming.matches.length) throw new Error('Aucun match pro renvoyé pour cette fenêtre.');
      const fetchedAt = new Date().toISOString();
      writeFeedCache({ matches: incoming.matches, fetchedAt, source: incoming.source });
      const next = applyFeedUpdate(snapshot.current, incoming.matches);
      setMatches(next.matches);
      setPredictions(next.predictions);
      setGroups(next.groups);
      setLocalPlayer(next.player);
      setFeedUpdatedAt(fetchedAt);
      setFeedStatus('live');
    } catch (error) {
      setFeedStatus(cache ? 'cached' : 'error');
      notify({
        kind: 'error',
        title: 'Sync calendrier',
        message: error instanceof Error ? error.message : 'Calendrier indisponible pour le moment.',
      });
    }
  }, [notify, refresh]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    const stored = readDemoStore();
    const cache = readFeedCache();
    if (stored) {
      setPredictions(stored.predictions);
      setGroups(stored.groups);
      setLocalPlayer(stored.player);
    }
    if (cache?.matches.length) {
      setMatches(cache.matches);
      setFeedUpdatedAt(cache.fetchedAt);
      setFeedStatus(isFeedFresh(cache.fetchedAt) ? 'live' : 'cached');
    } else if (stored?.matches.length) {
      setMatches(stored.matches);
    }
    setDemoReady(true);
  }, []);

  useEffect(() => {
    if (!demoReady || isSupabaseConfigured) return;
    void syncMatches(false);
  }, [demoReady, syncMatches]);

  useEffect(() => {
    if (!demoReady || isSupabaseConfigured) return;
    writeDemoStore({ matches, predictions, groups, player: localPlayer });
  }, [demoReady, groups, localPlayer, matches, predictions]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) client.realtime.setAuth(session.access_token);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) void refresh();
  }, [loading, refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  const player = useMemo<Player>(() => {
    if (!user) return localPlayer;
    if (remotePlayer) return remotePlayer;
    return {
      ...localPlayer,
      id: user.id,
      username: String(user.user_metadata.username ?? user.email?.split('@')[0] ?? 'Invocateur'),
    };
  }, [localPlayer, remotePlayer, user]);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Ajoute les clés Supabase pour activer les comptes.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp = async (email: string, password: string, username: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Ajoute les clés Supabase pour activer les comptes.' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const savePrediction = async (
    match: Match,
    scoreA: number,
    scoreB: number,
  ): Promise<AuthResult> => {
    if (isPredictionLocked(match.startsAt)) return { error: 'Trop tard, le match a commencé.' };
    if (!validSeriesScore(scoreA, scoreB, match.bestOf)) return { error: 'Ce score ne correspond pas au format du match.' };
    const winnerId = getWinnerId(match.teamA.id, match.teamB.id, scoreA, scoreB)!;
    const prediction: Prediction = {
      id: `${player.id}-${match.id}`,
      matchId: match.id,
      userId: player.id,
      winnerId,
      scoreA,
      scoreB,
      points: null,
      createdAt: new Date().toISOString(),
    };

    if (!supabase || !user) {
      setPredictions((items) => [...items.filter((item) => item.matchId !== match.id), prediction]);
      return {};
    }

    const { error } = await supabase.from('predictions').upsert(
      {
        match_id: match.id,
        user_id: user.id,
        winner_id: winnerId,
        score_a: scoreA,
        score_b: scoreB,
      },
      { onConflict: 'user_id,match_id' },
    );
    if (!error) await refresh();
    return error ? { error: error.message } : {};
  };

  const createGroup = async (name: string) => {
    if (!supabase || !user) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      setGroups((items) => [...items, { id: code, name, code, members: [player] }]);
      return { code };
    }
    const { data, error } = await supabase.rpc('create_group', { group_name: name });
    if (!error) await refresh();
    return error ? { error: error.message } : { code: String(data) };
  };

  const joinGroup = async (code: string) => {
    const normalizedCode = normalizeInviteCode(code);
    if (!supabase || !user) {
      const target = groups.find((group) => group.code === normalizedCode);
      if (!target) return { error: 'Code introuvable en mode démo.' };
      if (!target.members.some((member) => member.id === player.id)) {
        setGroups((items) =>
          items.map((group) =>
            group.id === target.id ? { ...group, members: [...group.members, player] } : group,
          ),
        );
      }
      return {};
    }
    const { error } = await supabase.rpc('join_group', { invite_code: normalizedCode });
    if (!error) await refresh();
    return error ? { error: error.message } : {};
  };

  const settleMatch = async (matchId: string, scoreA: number, scoreB: number): Promise<AuthResult> => {
    if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA === scoreB) {
      return { error: 'Saisis deux scores entiers différents.' };
    }

    if (!supabase || !user) {
      const next = applyMatchResult({ matches, predictions, groups, player: localPlayer }, matchId, scoreA, scoreB);
      setMatches(next.matches);
      setPredictions(next.predictions);
      setGroups(next.groups);
      setLocalPlayer(next.player);
      return {};
    }

    const { error } = await supabase
      .from('matches')
      .update({ score_a: scoreA, score_b: scoreB, status: 'finished', result_source: 'admin' })
      .eq('id', matchId);
    if (!error) await refresh();
    return error ? { error: error.message } : {};
  };

  const updateUsername = (username: string): AuthResult => {
    const clean = username.trim().slice(0, 24);
    if (clean.length < 2) return { error: 'Le pseudo doit faire au moins 2 caractères.' };
    setLocalPlayer((current) => ({ ...current, username: clean }));
    setGroups((items) =>
      items.map((group) => ({
        ...group,
        members: group.members.map((member) =>
          member.id === player.id ? { ...member, username: clean } : member,
        ),
      })),
    );
    return {};
  };

  const resetDemo = () => {
    clearDemoStore();
    setPredictions([]);
    setGroups(demoGroups);
    setLocalPlayer(currentPlayer);
    const cache = readFeedCache();
    if (cache?.matches.length) {
      setMatches(cache.matches);
    } else {
      setMatches(demoMatches);
      void syncMatches(true);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        player,
        matches,
        predictions,
        groups,
        loading,
        demoMode: !isSupabaseConfigured,
        isAdmin: !isSupabaseConfigured || Boolean(remotePlayer?.isAdmin),
        notice,
        notify,
        clearNotice,
        signIn,
        signUp,
        signOut,
        savePrediction,
        createGroup,
        joinGroup,
        settleMatch,
        updateUsername,
        resetDemo,
        syncMatches,
        feedStatus,
        feedUpdatedAt,
        refresh,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans AppProvider');
  return context;
}
