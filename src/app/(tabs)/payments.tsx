import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  CardList,
  HeroCard,
  MainScreen,
  Pill,
  ProgressBar,
  SectionHeading,
  StatCard,
  StatGrid,
} from '@/components/main-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PaymentMethodSelector } from '@/features/payments/components/payment-method-selector';
import {
  paymentMethods,
  paymentStats,
  paymentSummary,
  payments,
} from '@/features/payments/data/payments';
import type { PaymentMethodId } from '@/features/payments/types';
import { formatCurrency } from '@/utils/format-currency';

/**
 * Payments / Pay tab.
 *
 * Layout:
 *   1. Balance hero with paid/remaining summary, big progress bar, and CTA
 *   2. Stat tiles (Paid, Remaining, Next due)
 *   3. Payment method selector
 *   4. Selected method description
 *   5. Payment timeline
 */
export default function PaymentsScreen() {
  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>('qrpay');
  const paidPercent = Math.round((paymentSummary.paid / paymentSummary.total) * 100);
  const selectedMethod = paymentMethods.find((method) => method.id === selectedMethodId);

  return (
    <MainScreen
      title="Payments"
      subtitle="Track your treatment plan and choose how to pay the next bill.">
      <HeroCard tone="green">
        <View style={styles.heroTop}>
          <Pill tone="green" size="sm">
            🧾 Treatment plan
          </Pill>
          <Pill tone="green" size="sm">
            {paidPercent}% paid
          </Pill>
        </View>
        <View>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.heroLabel}>
            REMAINING BALANCE
          </ThemedText>
          <ThemedText type="display" style={styles.heroTitle}>
            {formatCurrency(paymentSummary.remaining, { showCents: false })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            of {formatCurrency(paymentSummary.total, { showCents: false })} total ·{' '}
            {formatCurrency(paymentSummary.paid, { showCents: false })} paid
          </ThemedText>
        </View>
        <ProgressBar percent={paidPercent} tone="green" height={12} />
        <View style={styles.heroActions}>
          <Pill tone="green" selected size="sm">
            Pay {formatCurrency(paymentSummary.nextDue, { showCents: false })}
          </Pill>
          <Pill tone="navy" size="sm">
            View receipt
          </Pill>
        </View>
      </HeroCard>

      <StatGrid>
        {paymentStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={
              stat.label === 'Paid'
                ? 'green'
                : stat.label === 'Remaining'
                  ? 'pink'
                  : 'blue'
            }
          />
        ))}
      </StatGrid>

      <SectionHeading>Pay with</SectionHeading>
      <PaymentMethodSelector
        methods={paymentMethods}
        selectedMethodId={selectedMethodId}
        onSelectMethod={setSelectedMethodId}
      />

      {selectedMethod ? (
        <Card tone="teal">
          <ThemedText type="defaultBold">
            {selectedMethod.label} selected
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {selectedMethod.description} — confirm before paying.
          </ThemedText>
        </Card>
      ) : null}

      <SectionHeading>Payment timeline</SectionHeading>
      <CardList>
        {payments.map((payment, index) => {
          const isPaid = payment.status === 'Paid';
          return (
            <Card
              key={`${payment.title}-${payment.due}`}
              title={payment.title}
              description={payment.due}
              tone={isPaid ? 'green' : index === 0 ? 'teal' : 'surface'}>
              <View style={styles.paymentRow}>
                <ThemedText type="subtitle">
                  {formatCurrency(payment.amount, { showCents: false })}
                </ThemedText>
                <Pill
                  tone={isPaid ? 'green' : 'teal'}
                  size="sm"
                  selected={!isPaid}>
                  {payment.status}
                </Pill>
              </View>
            </Card>
          );
        })}
      </CardList>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  heroLabel: {
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 4,
    marginBottom: 4,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
