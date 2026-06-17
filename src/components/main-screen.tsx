import { isValidElement, type PropsWithChildren, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  BrandColors,
  MaxContentWidth,
  Radii,
  Shadows,
  Spacing,
  Tints,
  TopTabInset,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ──────────────────────────────────────────────────────────────────────────
// Tone map (shared between every accent-aware component)
// ──────────────────────────────────────────────────────────────────────────

const toneTintMap = {
  teal: { bg: Tints.teal.softer, line: Tints.teal.line, color: BrandColors.teal },
  blue: { bg: Tints.blue.softer, line: Tints.blue.line, color: BrandColors.blue },
  pink: { bg: Tints.pink.softer, line: Tints.pink.line, color: BrandColors.pink },
  green: { bg: Tints.green.softer, line: Tints.green.line, color: BrandColors.green },
  navy: { bg: Tints.navy.softer, line: Tints.navy.line, color: BrandColors.navy },
} as const;

export type Tone = keyof typeof toneTintMap;

// ──────────────────────────────────────────────────────────────────────────
// Main screen shell
// ──────────────────────────────────────────────────────────────────────────

type MainScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  rightAction?: ReactNode;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

/**
 * The main screen shell wraps every tab screen.
 *
 * It renders the soft AppBackground, the SafeArea, and a header that defaults
 * to a friendly greeting/title. Set `hideHeader` to take full control inside
 * a screen (e.g. the home dashboard, which has its own greeting header).
 */
export function MainScreen({
  title,
  subtitle,
  hideHeader = false,
  rightAction,
  scrollable = true,
  contentStyle,
  children,
}: MainScreenProps) {
  const theme = useTheme();

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? {
        style: styles.scrollView,
        contentContainerStyle: [styles.contentContainer, contentStyle],
        showsVerticalScrollIndicator: false,
      }
    : { style: [styles.contentContainer, styles.flexContainer, contentStyle] };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {hideHeader || !title ? null : (
          <ScreenHeader title={title} subtitle={subtitle} rightAction={rightAction} />
        )}
        <Container {...containerProps}>{children}</Container>
      </SafeAreaView>
    </ThemedView>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Header / greeting
// ──────────────────────────────────────────────────────────────────────────

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
};

/**
 * The standard top header for screens that opt out of the home greeting.
 * Renders a big friendly title, optional subtitle, and a right-aligned
 * avatar / action slot.
 */
export function ScreenHeader({ title, subtitle, rightAction }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <ThemedText type="title">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {rightAction}
    </View>
  );
}

type GreetingHeaderProps = {
  name: string;
  date: string;
  emoji?: string;
};

/**
 * Friendly home header. Shows the patient's name, today's date, and a small
 * avatar/logo on the right. Used only on the home tab.
 */
export function GreetingHeader({ name, date, emoji = '👋' }: GreetingHeaderProps) {
  return (
    <View style={styles.greetingRow}>
      <View style={styles.greetingText}>
        <ThemedText type="small" themeColor="textSecondary">
          {date}
        </ThemedText>
        <ThemedText type="display">
          Hi, {name} {emoji}
        </ThemedText>
      </View>
      <View style={styles.avatarWrap}>
        <BrandLogo size={48} />
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Section heading
// ──────────────────────────────────────────────────────────────────────────

export function SectionHeading({
  children,
  rightLabel,
  onRightPress,
}: {
  children: string;
  rightLabel?: string;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeadingRow}>
      <ThemedText type="subtitle">{children}</ThemedText>
      {rightLabel ? (
        <Pressable onPress={onRightPress} hitSlop={8}>
          <ThemedText type="smallBold" style={{ color: BrandColors.teal }}>
            {rightLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Card primitives
// ──────────────────────────────────────────────────────────────────────────

type CardTone = Tone | 'surface';

type CardProps = PropsWithChildren<{
  title?: string;
  description?: string;
  meta?: string;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  onPress?: () => void;
}>;

/**
 * Standard surface card. White background, soft shadow, friendly radii.
 * Pass `tone="surface"` (default) for a neutral card or a brand tone for an
 * accent-colored card.
 */
export function Card({
  title,
  description,
  meta,
  tone,
  style,
  children,
  onPress,
}: CardProps) {
  const accent = tone && tone !== 'surface' ? toneTintMap[tone] : undefined;

  return (
    <ThemedView
      type="backgroundElement"
      onTouchEnd={onPress}
      style={[
        styles.card,
        accent ? { borderLeftColor: accent.color, borderLeftWidth: 0 } : undefined,
        style,
      ]}>
      {meta ? (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.cardMeta}>
          {meta.toUpperCase()}
        </ThemedText>
      ) : null}
      {title ? <ThemedText type="defaultBold">{title}</ThemedText> : null}
      {description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      ) : null}
      {children}
    </ThemedView>
  );
}

/**
 * Aliased version for screens that already use the `InfoCard` name.
 * Kept for backward compatibility — prefer `Card` for new code.
 */
export function InfoCard(props: CardProps) {
  return <Card {...props} />;
}

/**
 * Hero card — taller padding, brand-tinted background, and a brand-tinted
 * shadow. Use for the lead card on a screen (next visit, progress, balance).
 */
export function HeroCard({
  tone = 'teal',
  style,
  children,
}: PropsWithChildren<{ tone?: Tone; style?: StyleProp<ViewStyle> }>) {
  const tint = toneTintMap[tone];

  return (
    <View
      style={[
        styles.heroCard,
        { backgroundColor: tint.bg, borderColor: tint.line },
        tone === 'pink' ? Shadows.pink : Shadows.hero,
        style,
      ]}>
      {children}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Pill / chip / tag
// ──────────────────────────────────────────────────────────────────────────

type PillProps = PropsWithChildren<{
  tone?: Tone;
  selected?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}>;

export function Pill({
  tone = 'teal',
  selected = false,
  size = 'md',
  style,
  children,
  onPress,
}: PillProps) {
  const tint = toneTintMap[tone];
  const dim = size === 'sm' ? styles.pillSm : styles.pillMd;

  const renderChildren = isValidElement(children) ? (
    children
  ) : (
    <ThemedText
      type="smallBold"
      style={selected ? styles.pillTextOn : { color: tint.color }}>
      {children}
    </ThemedText>
  );

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        dim,
        selected
          ? { backgroundColor: tint.color, borderColor: tint.color }
          : { backgroundColor: tint.bg, borderColor: tint.line },
        style,
      ]}>
      {renderChildren}
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Progress ring (pure View, no SVG) — half-arc with second half overlay
// ──────────────────────────────────────────────────────────────────────────

type ProgressRingProps = {
  /** 0–100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  tone?: Tone;
  centerLabel?: string;
  centerValue?: string;
  centerHint?: string;
};

/**
 * A circular progress indicator built from layered Views. No SVG deps.
 *
 * Implementation:
 *  - Track: a full circle with a thick light border on a tinted background.
 *  - Colored "fill" arc: a half-circle (left half) with a height that
 *    follows `clamped%` of the ring's diameter.  When clamped > 50 we add
 *    a second half-circle on the right to complete the visual.
 *  - Center: a soft inner disc and the label stack.
 *
 * This avoids per-pixel math and keeps the ring crisp on all screen sizes.
 */
export function ProgressRing({
  percent,
  size = 200,
  strokeWidth = 16,
  tone = 'teal',
  centerLabel,
  centerValue,
  centerHint,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const tint = toneTintMap[tone];
  const half = size / 2;
  const innerSize = size - strokeWidth * 2;

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      {/* Track */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: tint.line,
          backgroundColor: tint.bg,
        }}
      />

      {/* Right half (covers clamped 50%..100%) */}
      {clamped > 50 ? (
        <View
          style={{
            position: 'absolute',
            width: half,
            height: size,
            right: 0,
            top: 0,
            overflow: 'hidden',
          }}>
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: half,
              height: size,
              borderRadius: half,
              borderWidth: strokeWidth,
              borderColor: tint.color,
              borderLeftColor: 'transparent',
              borderBottomColor: clamped > 75 ? tint.color : 'transparent',
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      ) : null}

      {/* Left half (covers clamped 0%..50%) */}
      {clamped > 0 ? (
        <View
          style={{
            position: 'absolute',
            width: half,
            height: size,
            left: 0,
            top: 0,
            overflow: 'hidden',
          }}>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: half,
              height: size,
              borderRadius: half,
              borderWidth: strokeWidth,
              borderColor: tint.color,
              borderRightColor: 'transparent',
              borderTopColor: clamped > 25 ? tint.color : 'transparent',
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      ) : null}

      {/* Inner ring (so center text sits on a clean surface) */}
      <View
        style={{
          position: 'absolute',
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: tint.bg,
        }}
      />

      {/* Center label */}
      <View style={styles.ringCenter} pointerEvents="none">
        {centerLabel ? (
          <ThemedText type="caption" themeColor="textSecondary" style={styles.ringLabel}>
            {centerLabel.toUpperCase()}
          </ThemedText>
        ) : null}
        {centerValue ? (
          <ThemedText type="display" style={{ color: tint.color }}>
            {centerValue}
          </ThemedText>
        ) : null}
        {centerHint ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.ringHint}>
            {centerHint}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Layout helpers
// ──────────────────────────────────────────────────────────────────────────

export function CardList({ children }: { children: ReactNode }) {
  return <View style={styles.cardList}>{children}</View>;
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

export function StatCard({
  label,
  value,
  helper,
  tone = 'navy',
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: Tone;
}) {
  const tint = toneTintMap[tone];

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: tint.bg, borderColor: tint.line },
      ]}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.statLabel}>
        {label.toUpperCase()}
      </ThemedText>
      <ThemedText type="subtitle" style={{ color: tint.color }}>
        {value}
      </ThemedText>
      {helper ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {helper}
        </ThemedText>
      ) : null}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Inline progress bar
// ──────────────────────────────────────────────────────────────────────────

export function ProgressBar({
  percent,
  tone = 'teal',
  height = 10,
}: {
  percent: number;
  tone?: Tone;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const tint = toneTintMap[tone];

  return (
    <View
      style={[
        styles.progressTrack,
        { height, borderRadius: height, backgroundColor: tint.line },
      ]}>
      <View
        style={{
          height: '100%',
          width: `${clamped}%`,
          borderRadius: height,
          backgroundColor: tint.color,
        }}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Quick action tile (used in dashboard and More tab)
// ──────────────────────────────────────────────────────────────────────────

export function ActionTile({
  icon,
  title,
  description,
  tone = 'teal',
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const tint = toneTintMap[tone];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        { backgroundColor: tint.bg, borderColor: tint.line, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.actionIcon, { backgroundColor: tint.color }]}>
        <ThemedText style={styles.actionEmoji}>{icon}</ThemedText>
      </View>
      <ThemedText type="defaultBold" style={styles.actionTitle}>
        {title}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {description}
      </ThemedText>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Action grid wrapper
// ──────────────────────────────────────────────────────────────────────────

export function ActionGrid({ children }: { children: ReactNode }) {
  return <View style={styles.actionGrid}>{children}</View>;
}

// ──────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  flexContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three + TopTabInset,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  subtitle: {
    maxWidth: 600,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  greetingText: {
    flex: 1,
    gap: Spacing.half,
  },
  avatarWrap: {
    borderRadius: Radii.pill,
    overflow: 'hidden',
    shadowColor: BrandColors.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radii.md,
    gap: Spacing.two,
    ...Shadows.card,
  },
  cardMeta: {
    letterSpacing: 1,
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: Spacing.two,
  },
  pillMd: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
    minHeight: 36,
  },
  pillSm: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.pill,
    minHeight: 28,
  },
  pillTextOn: {
    color: '#FFFFFF',
  },
  cardList: {
    gap: Spacing.three,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 100,
    minHeight: 96,
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.one,
    minWidth: 0,
  },
  statLabel: {
    letterSpacing: 1,
  },
  progressTrack: {
    overflow: 'hidden',
    width: '100%',
  },
  // ProgressRing
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ringLabel: {
    letterSpacing: 1,
  },
  ringHint: {
    textAlign: 'center',
    maxWidth: 120,
  },
  // ActionTile
  actionTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 140,
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.two,
    ...Shadows.soft,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  actionTitle: {
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
