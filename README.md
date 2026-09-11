# My Little League

Application gratuite de pronostics League of Legends esport pour jouer entre amis. Aucun argent, aucune mise et aucune récompense convertible : uniquement des points, des badges cosmétiques et le droit de chambrer le classement.

Une seule base Expo alimente le Web, Android et iOS. Supabase fournit l’authentification, PostgreSQL, les règles de sécurité et les fonctions serveur.

## Lancer la démo

Prérequis : Node.js 22.13 ou plus récent.

```powershell
npm install
npm run web
```

Le site public est sur [mylittleleague.vercel.app](https://mylittleleague.vercel.app). Chaque push sur `main` redéploie.

Sans variables Supabase, l’application démarre en mode local et synchronise le calendrier pro depuis le flux public de lolesports.com (LEC, LCK, LPL, LFL, Worlds, ligues régionales, etc.). Leaguepedia est interrogé en complément quand Fandom ne bride pas le débit. LoLix.gg n’expose pas d’API publique, donc il n’est pas utilisé.

Les pronostics restent utilisables localement. Un cache de 20 minutes évite de marteler les sources.

Pour un téléphone :

```powershell
npm start
```

Scanne le QR code avec Expo Go, ou appuie sur `a` pour ouvrir un émulateur Android.

## Activer le jeu en ligne

1. Crée un projet gratuit sur [Supabase](https://supabase.com).
2. Installe la CLI Supabase puis connecte le projet :

```powershell
npx supabase login
npx supabase link --project-ref TON_PROJECT_REF
npx supabase db push
```

3. Copie `.env.example` vers `.env` et renseigne l’URL ainsi que la clé publiable.
4. Définis le secret de synchronisation et déploie la fonction :

```powershell
npx supabase secrets set SYNC_SECRET="UN_SECRET_LONG_ET_ALEATOIRE"
npx supabase functions deploy sync-leaguepedia --no-verify-jwt
```

5. Déclenche une première synchronisation :

```powershell
curl.exe -X POST "https://TON_PROJECT_REF.supabase.co/functions/v1/sync-leaguepedia" -H "x-sync-secret: UN_SECRET_LONG_ET_ALEATOIRE"
```

Programme ensuite cette requête toutes les 30 à 60 minutes depuis Supabase Cron. Cette fréquence respecte mieux la limite agressive du flux Leaguepedia. La fonction conserve toujours les dernières données valides si la source tombe en panne.

## Donner le rôle admin

Après avoir créé ton compte, exécute ceci dans le SQL Editor Supabase en remplaçant l’email :

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'ton@email.fr');
```

L’espace admin permet de corriger un résultat absent ou erroné. Une correction déclenche le même calcul idempotent que le flux automatique.

## Règles

- Le pronostic est modifiable jusqu’à l’heure exacte du match.
- Bon vainqueur : 3 points.
- Score exact : 2 points supplémentaires.
- Les résultats et points sont calculés côté base, jamais dans le client.
- Les groupes privés se rejoignent avec un code à 6 caractères.

## Qualité

```powershell
npm run typecheck
npm test
npx expo export --platform web
```

## Builds mobiles

Installe EAS CLI et connecte un compte Expo :

```powershell
npm install -g eas-cli
eas login
eas build --profile preview --platform android
eas build --profile production --platform all
```

Le profil `preview` produit un APK Android partageable. La publication sur Google Play ou l’App Store exige les comptes développeur correspondants. EAS permet de compiler iOS sans posséder de Mac.

## Données et marque

Les calendriers et résultats proviennent du site public lolesports.com et de Leaguepedia (licence CC BY-SA). LoLix.gg n’est pas branché : le site n’offre pas d’API. Les écussons et la mascotte sont des créations originales. My Little League est une application communautaire indépendante, non approuvée et non affiliée à Riot Games. League of Legends et Riot Games appartiennent à Riot Games, Inc.
