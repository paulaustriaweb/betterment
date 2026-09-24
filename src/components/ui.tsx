import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, type } from '@/lib/colors';
import { fitFontSize } from '@/lib/fit';
import { ChevronRightIcon, CloseIcon, MinusIcon, PlusIcon } from './icons';

/** White card on the tinted ground. The base surface for everything. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  // Some iOS versions start a home-screen web app under the status bar; without
  // this the title sat on top of the clock. Zero where the view starts below it.
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerRow, { marginTop: insets.top }]}>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export interface PillOption {
  key: string;
  label: string;
}

export function RangePills({
  options,
  value,
  onChange,
}: {
  options: PillOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            style={[styles.pill, { backgroundColor: active ? colors.rose : colors.surface }]}
          >
            <Text style={[styles.pillLabel, { color: active ? colors.surface : colors.inkSoft }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Half-width stat card. `ink` is the dark one, `pop` the bright pink one. */
export function StatCard({ label, value, tone }: { label: string; value: string; tone: 'ink' | 'pop' }) {
  const bg = tone === 'ink' ? colors.ink : colors.rosePop;
  const fg = tone === 'ink' ? colors.surface : colors.ink;
  const labelColor = tone === 'ink' ? 'rgba(255,255,255,0.80)' : colors.ink;
  return (
    // `accessible` collapses the label and the figure into one announcement.
    <View style={[styles.statCard, { backgroundColor: bg }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
      {/* Shrink rather than wrap — a figure broken across two lines is unreadable. */}
      <Text
        style={[styles.statValue, { color: fg, fontSize: fitFontSize(value, type.stat.fontSize, 9) }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/** The "tap to see more" row that replaces a permanently-expanded section. */
export function DisclosureRow({
  icon,
  title,
  hint,
  trailing,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  trailing?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.disclosure}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
    >
      <View style={styles.iconChip}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.disclosureTitle}>{title}</Text>
        {hint ? <Text style={styles.disclosureHint}>{hint}</Text> : null}
      </View>
      {trailing ? <Text style={styles.disclosureTrailing}>{trailing}</Text> : null}
      <ChevronRightIcon color={colors.inkFaint} />
    </Pressable>
  );
}

export function Stepper({
  direction,
  onPress,
  label,
  tone = 'tint',
}: {
  direction: 'up' | 'down';
  onPress: () => void;
  /** What this steps — a plus sign on its own tells a screen reader nothing. */
  label: string;
  tone?: 'tint' | 'onRose' | 'solid';
}) {
  const bg = tone === 'tint' ? colors.roseTint : tone === 'solid' ? colors.surface : 'rgba(255,255,255,0.22)';
  const fg = tone === 'onRose' ? colors.surface : colors.rose;
  const size = tone === 'tint' ? 36 : 44;
  const Icon = direction === 'up' ? PlusIcon : MinusIcon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.stepper, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}
    >
      <Icon color={fg} size={tone === 'tint' ? 15 : 18} />
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: ReactNode }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {icon}
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

/** Bottom sheet. Detail lives here so the screen underneath stays at five blocks. */
export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              style={styles.sheetClose}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
            >
              <CloseIcon color={colors.inkSoft} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.cardPadding },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { ...type.title, color: colors.ink },
  headerSubtitle: { ...type.caption, fontSize: 12.5, color: colors.inkSoft, marginTop: 3 },

  pillRow: { flexDirection: 'row', gap: 7 },
  pill: { borderRadius: 18, paddingVertical: 8, paddingHorizontal: 16 },
  pillLabel: { fontSize: 12.5, fontWeight: '600' },

  statCard: { flex: 1, borderRadius: 22, padding: spacing.cardPadding },
  statLabel: { ...type.label },
  statValue: { ...type.stat, marginTop: 9, fontVariant: ['tabular-nums'] },

  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.roseTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclosureTitle: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  disclosureHint: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  disclosureTrailing: { fontSize: 11.5, fontWeight: '600', color: colors.roseDeep },

  stepper: { alignItems: 'center', justifyContent: 'center' },

  primaryButton: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryLabel: { fontSize: 15.5, fontWeight: '600', color: colors.surface },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,31,36,0.45)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: spacing.gutter,
    paddingBottom: 30,
  },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#EBDCE2', alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18 },
  sheetTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5, color: colors.ink },
  sheetSubtitle: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6EDF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
