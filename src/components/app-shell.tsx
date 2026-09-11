import { Href, router, usePathname } from 'expo-router';
import {
  Gift,
  House,
  Medal,
  Swords,
  Trophy,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { layout, palette } from '@/constants/theme';
import { useApp } from '@/providers/app-provider';
import { AppText, Mascot, Pill } from './ui';

const navItems = [
  { label: 'QG', href: '/', icon: House },
  { label: 'Matchs', href: '/matches', icon: Swords },
  { label: 'Ligues', href: '/groups', icon: UsersRound },
  { label: 'Classement', href: '/ranking', icon: Trophy },
  { label: 'Cadeaux', href: '/rewards', icon: Gift },
] as const;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel="My Little League" onPress={() => router.push('/')}>
      <View style={styles.logo}>
        <View style={styles.logoMark}><Medal color={palette.ink} size={21} strokeWidth={3} /></View>
        {!compact ? (
          <View>
            <AppText variant="label" color={palette.acid}>MY LITTLE</AppText>
            <AppText variant="h2">LEAGUE</AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function NavButton({
  item,
  compact,
}: {
  item: (typeof navItems)[number];
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={item.label}
      onPress={() => router.push(item.href as Href)}
      style={({ pressed }) => [
        compact ? styles.bottomNavItem : styles.navItem,
        active && (compact ? styles.bottomNavActive : styles.navActive),
        pressed && { opacity: 0.75 },
      ]}>
      <Icon color={active ? palette.ink : palette.muted} size={compact ? 22 : 19} strokeWidth={2.5} />
      <AppText
        variant="label"
        color={active ? palette.ink : palette.muted}
        style={compact ? styles.mobileLabel : null}>
        {item.label}
      </AppText>
    </Pressable>
  );
}

export function AppShell({
  children,
  title,
  eyebrow,
  noScroll = false,
}: React.PropsWithChildren<{ title?: string; eyebrow?: string; noScroll?: boolean }>) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const { demoMode, player, notice, clearNotice, feedStatus } = useApp();

  const body = (
    <View style={styles.content}>
      <View style={styles.topbar}>
        {!desktop ? <Logo compact /> : <View />}
        <View style={styles.topActions}>
          {feedStatus === 'live' || feedStatus === 'cached' ? (
            <Pill color={palette.acid} dark>CALENDRIER LIVE</Pill>
          ) : demoMode ? (
            <Pill color={palette.cyan}>MODE DÉMO</Pill>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir le profil" style={styles.profile} onPress={() => router.push('/profile')}>
            <View style={[styles.avatar, { backgroundColor: player.color }]}>
              <UserRound color={palette.ink} size={17} strokeWidth={3} />
            </View>
            {desktop ? <AppText variant="label">{player.username}</AppText> : null}
          </Pressable>
        </View>
      </View>
      {title ? (
        <View style={styles.heading}>
          {eyebrow ? <AppText variant="label" color={palette.acid}>{eyebrow}</AppText> : null}
          <AppText variant="h1">{title}</AppText>
        </View>
      ) : null}
      {children}
      <View style={styles.footer}>
        <AppText variant="small">Calendrier : lolesports.com et Leaguepedia (CC BY-SA). Application communautaire non affiliée à Riot Games.</AppText>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        {desktop ? (
          <View style={styles.sidebar}>
            <Logo />
            <View style={styles.nav}>{navItems.map((item) => <NavButton key={item.href} item={item} />)}</View>
            <View style={styles.sidebarMascot}>
              <Mascot size={74} />
              <AppText variant="small">Pronostics LoL entre amis.</AppText>
            </View>
          </View>
        ) : null}
        <View style={styles.main}>
          {notice ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${notice.title}. ${notice.message}`}
              onPress={clearNotice}
              style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeOk]}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" color={notice.kind === 'error' ? palette.cream : palette.ink}>
                  {notice.title}
                </AppText>
                <AppText variant="small" color={notice.kind === 'error' ? palette.cream : palette.ink}>
                  {notice.message}
                </AppText>
              </View>
              <X color={notice.kind === 'error' ? palette.cream : palette.ink} size={18} />
            </Pressable>
          ) : null}
          {noScroll ? body : <ScrollView contentContainerStyle={styles.scroll}>{body}</ScrollView>}
        </View>
        {!desktop ? (
          <View style={styles.bottomNav}>
            {navItems.map((item) => <NavButton compact key={item.href} item={item} />)}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: palette.ink, flex: 1 },
  page: { backgroundColor: palette.ink, flex: 1, flexDirection: 'row' },
  sidebar: {
    backgroundColor: palette.inkSoft,
    borderRightColor: palette.line,
    borderRightWidth: 2,
    padding: 24,
    width: layout.sidebarWidth,
  },
  logo: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  logoMark: {
    alignItems: 'center',
    backgroundColor: palette.acid,
    borderColor: palette.black,
    borderRadius: 11,
    borderWidth: 2,
    height: 42,
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
    width: 42,
  },
  nav: { gap: 8, marginTop: 48 },
  navItem: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  navActive: { backgroundColor: palette.acid },
  sidebarMascot: { gap: 10, marginTop: 'auto' },
  main: { flex: 1 },
  notice: {
    alignItems: 'center',
    borderBottomWidth: 2,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 20,
  },
  noticeOk: {
    backgroundColor: palette.acid,
    borderBottomColor: palette.black,
  },
  noticeError: {
    backgroundColor: palette.coral,
    borderBottomColor: palette.black,
  },
  scroll: { flexGrow: 1 },
  content: {
    alignSelf: 'center',
    gap: 24,
    maxWidth: layout.maxWidth,
    paddingBottom: 110,
    paddingHorizontal: 20,
    width: '100%',
  },
  topbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
  },
  topActions: { alignItems: 'center', flexDirection: 'row', gap: 12, marginLeft: 'auto' },
  profile: {
    alignItems: 'center',
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 9,
    padding: 5,
    paddingRight: 12,
  },
  avatar: { alignItems: 'center', borderRadius: 99, height: 32, justifyContent: 'center', width: 32 },
  heading: { gap: 5 },
  footer: { borderTopColor: palette.line, borderTopWidth: 1, marginTop: 24, paddingTop: 20 },
  bottomNav: {
    backgroundColor: palette.inkSoft,
    borderTopColor: palette.line,
    borderTopWidth: 2,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    paddingBottom: 7,
    paddingHorizontal: 5,
    paddingTop: 7,
    position: 'absolute',
    right: 0,
  },
  bottomNavItem: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 51,
  },
  bottomNavActive: { backgroundColor: palette.acid },
  mobileLabel: { fontSize: 8, letterSpacing: 0 },
});
