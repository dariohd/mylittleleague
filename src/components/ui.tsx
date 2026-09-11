import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { layout, palette, shadows } from '@/constants/theme';
import type { Team } from '@/types';

export function AppText({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: React.PropsWithChildren<{
  variant?: 'display' | 'h1' | 'h2' | 'body' | 'small' | 'label';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}>) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[textStyles[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

const textStyles = StyleSheet.create({
  display: {
    color: palette.cream,
    fontFamily: 'Bungee',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  h1: {
    color: palette.cream,
    fontFamily: 'Bungee',
    fontSize: 28,
    lineHeight: 34,
  },
  h2: {
    color: palette.cream,
    fontFamily: 'Bungee',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    color: palette.cream,
    fontFamily: 'Manrope',
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    color: palette.muted,
    fontFamily: 'Manrope',
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    color: palette.cream,
    fontFamily: 'ManropeBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});

export function Card({
  children,
  style,
  accent,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle>; accent?: string }>) {
  return (
    <View style={[styles.card, accent ? { borderTopColor: accent, borderTopWidth: 5 } : null, style]}>
      {children}
    </View>
  );
}

export function Pill({
  children,
  color = palette.acid,
  dark = true,
}: React.PropsWithChildren<{ color?: string; dark?: boolean }>) {
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <AppText variant="label" color={dark ? palette.ink : palette.cream}>
        {children}
      </AppText>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? palette.ink : palette.cream} />
      ) : (
        <AppText
          variant="label"
          color={variant === 'primary' ? palette.ink : palette.cream}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: palette.acid, borderColor: palette.ink },
  secondary: { backgroundColor: palette.grape, borderColor: palette.black },
  ghost: { backgroundColor: palette.panelRaised, borderColor: palette.line },
  danger: { backgroundColor: palette.coral, borderColor: palette.black },
});

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <AppText variant="label" color={palette.muted}>{label}</AppText>
      <TextInput
        placeholderTextColor="#756E85"
        style={[styles.input, error ? styles.inputError : null]}
        {...props}
      />
      {error ? <AppText variant="small" color={palette.coral}>{error}</AppText> : null}
    </View>
  );
}

export function TeamMark({ team, size = 48 }: { team: Team; size?: number }) {
  return (
    <View
      accessibilityLabel={`Écusson ${team.name}`}
      style={[
        styles.teamMark,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          backgroundColor: team.color,
          transform: [{ rotate: '-4deg' }],
        },
      ]}>
      <AppText
        variant="label"
        color={palette.ink}
        style={{ fontSize: Math.max(10, size * 0.23) }}>
        {team.shortName}
      </AppText>
    </View>
  );
}

export function Mascot({ size = 96 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.mascot,
          { width: size * 0.82, height: size * 0.72, borderRadius: size * 0.3 },
        ]}>
        <View style={[styles.eye, { left: size * 0.2 }]} />
        <View style={[styles.eye, { right: size * 0.2 }]} />
        <View style={[styles.mouth, { width: size * 0.27 }]} />
      </View>
      <View style={[styles.mascotBolt, { right: 0, top: size * 0.05 }]} />
    </View>
  );
}

export function ProgressBar({ value, color = palette.acid }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressValue, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderColor: palette.black,
    borderRadius: layout.radius,
    borderWidth: layout.border,
    padding: 18,
    ...shadows.hard,
  },
  pill: {
    alignSelf: 'flex-start',
    borderColor: palette.black,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 18,
    ...shadows.hard,
  },
  pressed: { transform: [{ translateX: 3 }, { translateY: 3 }], shadowOpacity: 0 },
  disabled: { opacity: 0.48 },
  fieldWrap: { gap: 7 },
  input: {
    backgroundColor: palette.inkSoft,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 2,
    color: palette.cream,
    fontFamily: 'Manrope',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputError: { borderColor: palette.coral },
  teamMark: {
    alignItems: 'center',
    borderColor: palette.black,
    borderWidth: 2,
    justifyContent: 'center',
    ...shadows.hard,
  },
  mascot: {
    alignItems: 'center',
    backgroundColor: palette.acid,
    borderColor: palette.black,
    borderWidth: 3,
    justifyContent: 'center',
    left: 2,
    position: 'absolute',
    top: 12,
    transform: [{ rotate: '6deg' }],
  },
  eye: {
    backgroundColor: palette.ink,
    borderRadius: 10,
    height: 9,
    position: 'absolute',
    top: '34%',
    width: 9,
  },
  mouth: {
    borderBottomColor: palette.ink,
    borderBottomWidth: 3,
    borderRadius: 20,
    bottom: '22%',
    height: 10,
    position: 'absolute',
  },
  mascotBolt: {
    backgroundColor: palette.grape,
    borderColor: palette.black,
    borderWidth: 2,
    height: 24,
    position: 'absolute',
    transform: [{ rotate: '38deg' }],
    width: 14,
  },
  progressTrack: {
    backgroundColor: palette.inkSoft,
    borderColor: palette.black,
    borderRadius: 999,
    borderWidth: 2,
    height: 14,
    overflow: 'hidden',
  },
  progressValue: { height: '100%' },
});
