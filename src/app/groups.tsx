import { Href, router } from 'expo-router';
import { Crown, Plus, TicketCheck, UsersRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Button, Card, Field, Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { copyToClipboard } from '@/lib/format';
import { useApp } from '@/providers/app-provider';
import type { Group } from '@/types';

export default function GroupsScreen() {
  const { groups, createGroup, joinGroup, notify, user, demoMode } = useApp();
  const [mode, setMode] = useState<'closed' | 'create' | 'join'>('closed');
  const [value, setValue] = useState('');

  const submit = async () => {
    if (!value.trim()) return;
    const result = mode === 'create' ? await createGroup(value.trim()) : await joinGroup(value.trim());
    if (result.error) {
      notify({ kind: 'error', title: 'Impossible', message: result.error });
      return;
    }
    const code = 'code' in result ? result.code : undefined;
    notify({
      kind: 'ok',
      title: mode === 'create' ? 'Ligue créée' : 'Ligue rejointe',
      message: code ? `Code d’invitation : ${code}` : 'Tu es dans la place.',
    });
    setMode('closed');
    setValue('');
  };

  return (
    <AppShell title="TES LIGUES PRIVÉES" eyebrow="ENTRE POTES">
      <View style={styles.intro}>
        <View style={styles.introCopy}>
          <AppText color={palette.muted}>Crée une ligue, balance le code dans le groupe et règle vos débats avec des points.</AppText>
        </View>
        <View style={styles.actions}>
          <Button
            label="CRÉER UNE LIGUE"
            onPress={() => {
              if (!demoMode && !user) {
                router.push('/auth?mode=signup');
                return;
              }
              setMode('create');
            }}
          />
          <Button
            label="REJOINDRE"
            variant="ghost"
            onPress={() => {
              if (!demoMode && !user) {
                router.push('/auth?mode=signup');
                return;
              }
              setMode('join');
            }}
          />
        </View>
      </View>

      {mode !== 'closed' ? (
        <Card accent={mode === 'create' ? palette.acid : palette.cyan} style={styles.form}>
          <View style={styles.formTitle}>
            {mode === 'create' ? <Plus color={palette.acid} /> : <TicketCheck color={palette.cyan} />}
            <AppText variant="h2">{mode === 'create' ? 'NOUVELLE LIGUE' : 'CODE D’INVITATION'}</AppText>
          </View>
          <Field
            autoCapitalize={mode === 'join' ? 'characters' : 'sentences'}
            label={mode === 'create' ? 'Nom de la ligue' : 'Code à 6 caractères'}
            maxLength={mode === 'join' ? 6 : 40}
            onChangeText={setValue}
            placeholder={mode === 'create' ? 'Les macro génies' : 'NASH42'}
            value={value}
          />
          <View style={styles.actions}>
            <Button label="ANNULER" variant="ghost" onPress={() => setMode('closed')} />
            <Button label="VALIDER" disabled={!value.trim()} onPress={submit} />
          </View>
        </Card>
      ) : null}

      {!demoMode && !user ? (
        <Card>
          <AppText variant="h2">UN COMPTE POUR JOUER ENSEMBLE</AppText>
          <AppText color={palette.muted}>Sans compte, chacun reste tout seul dans son navigateur. Inscris-toi, puis envoie le code de ligue à tes amis.</AppText>
        </Card>
      ) : null}

      <View style={styles.grid}>
        {groups.map((group) => <GroupCard key={group.id} group={group} />)}
      </View>
    </AppShell>
  );
}

function GroupCard({ group }: { group: Group }) {
  const { notify } = useApp();
  const sorted = [...group.members].sort((a, b) => b.points - a.points);
  const copyCode = async () => {
    const ok = await copyToClipboard(group.code);
    notify({
      kind: ok ? 'ok' : 'error',
      title: ok ? 'Code copié' : 'Copie impossible',
      message: ok ? `${group.code} est dans le presse-papiers.` : `Note-le à la main : ${group.code}`,
    });
  };
  return (
    <Card style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Pressable accessibilityRole="link" accessibilityLabel={`Ouvrir ${group.name}`} onPress={() => router.push(`/group/${group.id}` as Href)} style={styles.groupIcon}>
          <UsersRound color={palette.ink} size={23} strokeWidth={3} />
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.push(`/group/${group.id}` as Href)} style={{ flex: 1 }}>
          <AppText variant="h2">{group.name}</AppText>
          <AppText variant="small">{group.members.length} membres</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Copier le code ${group.code}`} onPress={() => void copyCode()}>
          <Pill color={palette.cream}>CODE {group.code}</Pill>
        </Pressable>
      </View>
      <View style={styles.members}>
        {sorted.slice(0, 4).map((member, index) => (
          <View key={member.id} style={styles.member}>
            <View style={[styles.rank, index === 0 && styles.rankFirst]}>
              {index === 0 ? <Crown color={palette.ink} size={15} /> : <AppText variant="label">{index + 1}</AppText>}
            </View>
            <View style={[styles.dot, { backgroundColor: member.color }]} />
            <AppText style={{ flex: 1 }}>{member.username}</AppText>
            <AppText variant="label" color={palette.acid}>{member.points} PTS</AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'space-between' },
  introCopy: { maxWidth: 590 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  form: { alignSelf: 'center', gap: 18, maxWidth: 620, width: '100%' },
  formTitle: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  groupCard: { flex: 1, gap: 18, minWidth: 310 },
  groupHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  groupIcon: { alignItems: 'center', backgroundColor: palette.cyan, borderRadius: 12, height: 46, justifyContent: 'center', width: 46 },
  members: { borderTopColor: palette.line, borderTopWidth: 1 },
  member: { alignItems: 'center', borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 48 },
  rank: { alignItems: 'center', justifyContent: 'center', width: 27 },
  rankFirst: { backgroundColor: palette.acid, borderRadius: 8, height: 27 },
  dot: { borderColor: palette.black, borderRadius: 99, borderWidth: 2, height: 25, width: 25 },
});
