import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AppText, Button, Card, Field, Mascot, Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useApp } from '@/providers/app-provider';

export default function AuthScreen() {
  const { signIn, signUp, demoMode, notify } = useApp();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.mode === 'signup' ? 'signup' : 'signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, username.trim());
    setLoading(false);
    if (result.error) {
      notify({ kind: 'error', title: 'Connexion impossible', message: result.error });
      return;
    }
    if (result.pending) {
      notify({
        kind: 'ok',
        title: 'Compte créé',
        message: 'Vérifie ton email pour confirmer, puis reconnecte-toi.',
      });
      setMode('signin');
      return;
    }
    notify({
      kind: 'ok',
      title: mode === 'signin' ? 'Bon retour' : 'Compte créé',
      message: 'Tu peux pronostiquer et créer une ligue avec tes amis.',
    });
    router.replace('/');
  };

  return (
    <AppShell>
      <View style={styles.page}>
        <View style={styles.pitch}>
          <Pill color={palette.coral}>ENTRE POTES</Pill>
          <AppText variant="display">RAMÈNE{'\n'}TA BANDE.</AppText>
          <AppText color={palette.muted}>Un compte gratuit suffit pour rejoindre tes amis, conserver tes pronos et partager un classement.</AppText>
          <Mascot size={120} />
        </View>
        <Card style={styles.form} accent={palette.acid}>
          <ShieldCheck color={palette.acid} size={30} />
          <AppText variant="h1">{mode === 'signin' ? 'CONNEXION' : 'INSCRIPTION'}</AppText>
          {demoMode ? (
            <AppText variant="small" color={palette.coral}>
              Les comptes en ligne ne sont pas encore branchés sur cet environnement.
            </AppText>
          ) : null}
          {mode === 'signup' ? (
            <Field label="Pseudo" value={username} onChangeText={setUsername} placeholder="Ton pseudo" autoCapitalize="none" />
          ) : null}
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="toi@exemple.fr" autoCapitalize="none" keyboardType="email-address" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} placeholder="8 caractères minimum" secureTextEntry />
          <Button
            label={mode === 'signin' ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}
            loading={loading}
            disabled={demoMode || !email || password.length < 8 || (mode === 'signup' && username.length < 2)}
            onPress={submit}
          />
          <Button
            label={mode === 'signin' ? 'JE N’AI PAS DE COMPTE' : 'J’AI DÉJÀ UN COMPTE'}
            variant="ghost"
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          />
        </Card>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 38, justifyContent: 'center', minHeight: 600 },
  pitch: { flex: 1, gap: 18, maxWidth: 480, minWidth: 280 },
  form: { flex: 1, gap: 18, maxWidth: 480, minWidth: 290 },
});
