import { router } from 'expo-router';
import { LogOut, RotateCcw, Settings2, ShieldCheck, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Button, Card, Field, Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { currentPlayer } from '@/data/demo';
import { pointsLabel } from '@/lib/format';
import { useApp } from '@/providers/app-provider';

export default function ProfileScreen() {
  const { player, user, demoMode, isAdmin, signOut, matches, predictions, updateUsername, resetDemo, notify } = useApp();
  const [username, setUsername] = useState(player.username);
  const history = [...predictions].reverse();

  return (
    <AppShell title="TON PROFIL" eyebrow="CARTE D’INVOCATEUR">
      <Card style={styles.identity} accent={player.color}>
        <View style={[styles.avatar, { backgroundColor: player.color }]}>
          <UserRound color={palette.ink} size={48} strokeWidth={3} />
        </View>
        <View style={styles.identityCopy}>
          <AppText variant="h1">{player.username}</AppText>
          <Pill color={palette.grape}>{player.title}</Pill>
          <AppText color={palette.muted}>{user?.email ?? (demoMode ? 'Compte de démonstration local' : 'Pas encore connecté')}</AppText>
        </View>
      </Card>
      <View style={styles.grid}>
        <Card style={styles.stat}><AppText variant="h1" color={palette.acid}>{player.points}</AppText><AppText variant="label">POINTS</AppText></Card>
        <Card style={styles.stat}><AppText variant="h1" color={palette.cyan}>{player.exactScores}</AppText><AppText variant="label">SCORES EXACTS</AppText></Card>
        <Card style={styles.stat}><AppText variant="h1" color={palette.coral}>{player.streak}</AppText><AppText variant="label">SÉRIE</AppText></Card>
      </View>

      {demoMode || user ? (
        <Card style={styles.edit} accent={palette.acid}>
          <AppText variant="h2">CHANGER DE PSEUDO</AppText>
          <Field label="Pseudo" value={username} onChangeText={setUsername} maxLength={24} />
          <Button
            label="ENREGISTRER"
            disabled={username.trim() === player.username}
            onPress={() => {
              void updateUsername(username).then((result) => {
                if (result.error) notify({ kind: 'error', title: 'Pseudo refusé', message: result.error });
                else notify({ kind: 'ok', title: 'Pseudo mis à jour', message: 'Le classement te reconnaîtra.' });
              });
            }}
          />
        </Card>
      ) : (
        <Card style={styles.edit} accent={palette.acid}>
          <AppText variant="h2">CRÉE TON PROFIL</AppText>
          <AppText color={palette.muted}>Un compte gratuit garde tes pronos et te met dans le classement de tes ligues.</AppText>
          <Button label="CRÉER UN COMPTE" onPress={() => router.push('/auth?mode=signup')} />
        </Card>
      )}

      <Card style={styles.history}>
        <AppText variant="h2">HISTORIQUE DES PRONOS</AppText>
        {history.length ? history.map((prediction) => {
          const match = matches.find((item) => item.id === prediction.matchId);
          return (
            <View key={prediction.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{match ? `${match.teamA.shortName} - ${match.teamB.shortName}` : prediction.matchId}</AppText>
                <AppText variant="small">{prediction.scoreA}-{prediction.scoreB}</AppText>
              </View>
              <AppText variant="label" color={prediction.points ? palette.acid : palette.muted}>
                {pointsLabel(prediction.points) ?? 'EN ATTENTE'}
              </AppText>
            </View>
          );
        }) : (
          <AppText color={palette.muted}>Aucun prono pour l’instant. Va te mouiller.</AppText>
        )}
      </Card>

      <Card style={styles.settings}>
        <View style={styles.settingRow}>
          <Settings2 color={palette.muted} />
          <View style={{ flex: 1 }}>
            <AppText variant="h2">COMPTE ET APPLICATION</AppText>
            <AppText color={palette.muted}>
              {demoMode
                ? 'Connecte Supabase pour jouer en ligne avec tes amis.'
                : user
                  ? 'Ton compte est synchronisé sur tous tes appareils.'
                  : 'Crée un compte pour garder tes pronos et rejoindre une ligue.'}
            </AppText>
          </View>
          {!user ? <Button label="SE CONNECTER" onPress={() => router.push('/auth')} /> : null}
        </View>
        {isAdmin ? (
          <View style={styles.settingRow}>
            <ShieldCheck color={palette.cyan} />
            <View style={{ flex: 1 }}>
              <AppText variant="h2">OUTILS ADMIN</AppText>
              <AppText color={palette.muted}>Corriger un résultat si le flux communautaire a raté une marche.</AppText>
            </View>
            <Button label="OUVRIR" variant="ghost" onPress={() => router.push('/admin')} />
          </View>
        ) : null}
        {demoMode ? (
          <View style={styles.settingRow}>
            <RotateCcw color={palette.muted} />
            <View style={{ flex: 1 }}>
              <AppText variant="h2">REPARTIR DE ZÉRO</AppText>
              <AppText color={palette.muted}>Efface tes pronos locaux et recharge le calendrier de démo.</AppText>
            </View>
            <Button
              label="RESET"
              variant="ghost"
              onPress={() => {
                resetDemo();
                setUsername(currentPlayer.username);
                notify({ kind: 'ok', title: 'Démo réinitialisée', message: 'Les points de base sont de retour.' });
              }}
            />
          </View>
        ) : null}
        {user ? (
          <View style={styles.settingRow}>
            <LogOut color={palette.coral} />
            <AppText style={{ flex: 1 }}>Quitter ce compte sur cet appareil</AppText>
            <Button label="DÉCONNEXION" variant="danger" onPress={() => void signOut()} />
          </View>
        ) : null}
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 22 },
  avatar: { alignItems: 'center', borderColor: palette.black, borderRadius: 24, borderWidth: 3, height: 100, justifyContent: 'center', transform: [{ rotate: '-3deg' }], width: 100 },
  identityCopy: { flex: 1, gap: 9, minWidth: 230 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stat: { flex: 1, gap: 5, minWidth: 190 },
  edit: { gap: 14 },
  history: { gap: 10 },
  historyRow: { alignItems: 'center', borderTopColor: palette.line, borderTopWidth: 1, flexDirection: 'row', minHeight: 52 },
  settings: { gap: 4, paddingVertical: 4 },
  settingRow: { alignItems: 'center', borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, minHeight: 90, paddingVertical: 15 },
});
