import type { User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { currentPlayer, demoGroups, demoMatches, guestPlayer } from '@/data/demo';
import { applyFeedUpdate, applyMatchResult, clearDemoStore, readDemoStore, writeDemoStore, type Notice } from '@/lib/demo-store';
import {
  isFeedFresh,
  readFeedCache,
  writeFeedCache,
  normalizeInviteCode,
} from '@/lib/leaguepedia';
import { fetchLiveSchedule } from '@/lib/schedule';
import { pushSchedule } from '@/lib/schedule-sync';
import { getWinnerId, isPredictionLocked, validSeriesScore } from '@/lib/scoring';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Group, Match, Player, Prediction } from '@/types';

type AuthResult = { error?: string; pending?: boolean };

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
  updateUsername: (username: string) => Promise<AuthResult>;
  resetDemo: () => void;
  syncMatches: (force?: boolean) => Promise<void>;
  feedStatus: 'idle' | 'loading' | 'live' | 'cached' | 'error';
  feedUpdatedAt: string | null;
  refresh: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function asGroups(data: unknown): Group[] {
  if (Array.isArray(data)) return data as Group[];
  return [];
}

export function AppProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>(demoMatches);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [groups, setGroups] = useState<Group[]>(isSupabaseConfigured ? [] : demoGroups);
  const [localPlayer, setLocalPlayer] = useState<Player>(isSupabaseConfigured ? guestPlayer : currentPlayer);
  const [remotePlayer, setRemotePlayer] = useState<(Player & { isAdmin?: boolean }) | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [demoReady, setDemoReady] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [feedStatus, setFeedStatus] = useState<'idle' | 'loading' | 'live' | 'cached' | 'error'>('idle');
  const [feedUpdatedAt, setFeedUpdatedAt] = useState<string | null>(null);
  const snapshot = React.useRef({ matches, predictions, groups, player: localPlayer });
  snapshot.current = { matches, predictions, groups, player: localPlayer };

  const notify = useCallback((next: Notice) => setNotice(next), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      if (!user) {
        setPredictions([]);
        setGroups(isSupabaseConfigured ? [] : snapshot.current.groups);
        setRemotePlayer(null);
      }
      return;
    }

    const [predictionsResult, groupsResult, statsResult] = await Promise.all([
      supabase.from('predictions').select('*').eq('user_id', user.id),
      supabase.rpc('get_my_groups'),
      supabase.rpc('get_my_stats'),
    ]);

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
    setGroups(asGroups(groupsResult.data));
    if (statsResult.data) setRemotePlayer(statsResult.data as unknown as Player & { isAdmin?: boolean });
  }, [user]);

  const syncMatches = useCallback(async (force = false) => {
    const cache = readFeedCache();
    if (cache) {
      const next = applyFeedUpdate(snapshot.current, cache.matches);
      setMatches(next.matches);
      if (!isSupabaseConfigured) {
        setPredictions(next.predictions);
        setGroups(next.groups);
        setLocalPlayer(next.player);
      }
      setFeedUpdatedAt(cache.fetchedAt);
      setFeedStatus(isFeedFresh(cache.fetchedAt) ? 'live' : 'cached');
      if (!force && isFeedFresh(cache.fetchedAt)) {
        if (user) {
          try {
            await pushSchedule(cache.matches);
            await refresh();
          } catch (error) {
            notify({
              kind: 'error',
              title: 'Sync ligue',
              message: error instanceof Error ? error.message : 'Impossible d’aligner le calendrier en ligne.',
            });
          }
        }
        return;
      }
    }
    setFeedStatus('loading');
    try {
      const incoming = await fetchLiveSchedule();
      if (!incoming.matches.length) throw new Error('Aucun match pro renvoyé pour cette fenêtre.');
      const fetchedAt = new Date().toISOString();
      writeFeedCache({ matches: incoming.matches, fetchedAt, source: incoming.source });
      const next = applyFeedUpdate(snapshot.current, incoming.matches);
      setMatches(next.matches);
      if (!isSupabaseConfigured) {
        setPredictions(next.predictions);
        setGroups(next.groups);
        setLocalPlayer(next.player);
      }
      setFeedUpdatedAt(fetchedAt);
      setFeedStatus('live');
      if (user) {
        await pushSchedule(incoming.matches);
        await refresh();
      }
    } catch (error) {
      setFeedStatus(cache ? 'cached' : 'error');
      notify({
        kind: 'error',
        title: 'Sync calendrier',
        message: error instanceof Error ? error.message : 'Calendrier indisponible pour le moment.',
      });
    }
  }, [notify, refresh, user]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      setDemoReady(true);
      return;
    }
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
    if (!demoReady) return;
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
    if (!user) return isSupabaseConfigured ? guestPlayer : localPlayer;
    if (remotePlayer) return remotePlayer;
    return {
      ...guestPlayer,
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
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim() },
        emailRedirectTo: origin,
      },
    });
    if (error) return { error: error.message };
    if (!data.session) return { pending: true };
    return {};
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setRemotePlayer(null);
    setPredictions([]);
    setGroups([]);
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

    if (isSupabaseConfigured && !user) {
      return { error: 'Crée un compte pour enregistrer ton prono.' };
    }

    if (!supabase || !user) {
      setPredictions((items) => [...items.filter((item) => item.matchId !== match.id), prediction]);
      return {};
    }

    try {
      await pushSchedule([match]);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Match introuvable côté ligue.' };
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
    if (isSupabaseConfigured && !user) return { error: 'Connecte-toi pour créer une ligue.' };
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
    if (isSupabaseConfigured && !user) return { error: 'Connecte-toi pour rejoindre une ligue.' };
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

  const updateUsername = async (username: string): Promise<AuthResult> => {
    const clean = username.trim().slice(0, 24);
    if (clean.length < 2) return { error: 'Le pseudo doit faire au moins 2 caractères.' };
    if (supabase && user) {
      const { error } = await supabase.from('profiles').update({ username: clean }).eq('id', user.id);
      if (error) return { error: error.message };
      await refresh();
      return {};
    }
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
