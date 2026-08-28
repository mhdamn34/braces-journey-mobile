import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { SectionVoice } from '@/components/section-voice';
import type { PaymentMethod } from '@/features/payments/types';
import { addPayment, deletePayment, paymentsStore, setPlanTotal } from '@/features/payments/store';
import { formatCurrency } from '@/lib/format-currency';
import { formatFullDate, todayIso } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'qrpay', label: 'QRPay' },
  { value: 'card', label: 'Card' },
];

export default function PaymentsScreen() {
  const colors = useTheme();
  const { planTotal, records } = useStoreValue(paymentsStore);
  const [totalDraft, setTotalDraft] = useState('');
  const [editingTotal, setEditingTotal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');

  const paid = records.reduce((sum, r) => sum + r.amount, 0);
  const remaining = Math.max(0, planTotal - paid);
  const progress = planTotal > 0 ? Math.min(1, paid / planTotal) : 0;

  const inputStyle = [
    Type.body,
    {
      color: colors.textPrimary,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.thumb,
      padding: Space.md,
      backgroundColor: colors.surface,
    },
  ];

  function savePayment() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    addPayment({ id: `${Date.now()}`, date: todayIso(), amount: value, method });
    setAmount('');
    setAdding(false);
  }

  if (planTotal === 0) {
    return (
      <Screen>
        <Text style={[Type.display, { color: colors.textPrimary }]}>Payments</Text>
        <Card>
          <Text style={[Type.label, { color: colors.textPrimary }]}>Treatment plan total</Text>
          <Text style={[Type.caption, { color: colors.textSecondary }]}>
            What your orthodontist quoted for the whole treatment.
          </Text>
          <TextInput value={totalDraft} onChangeText={setTotalDraft} placeholder="e.g. 8000"
            keyboardType="numeric" placeholderTextColor={colors.textTertiary} style={inputStyle} />
          <Button label="Set plan total" disabled={!(Number(totalDraft) > 0)}
            onPress={() => setPlanTotal(Number(totalDraft))} />
        </Card>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Payments</Text>
      <Card>
        <Text style={[Type.caption, { color: colors.textSecondary }]}>Remaining</Text>
        <Text style={[Type.display, { color: colors.textPrimary }]}>
          {formatCurrency(remaining, { showCents: false })}
        </Text>
        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
          <View
            style={{
              width: `${progress * 100}%`,
              height: 6,
              backgroundColor: colors.accent,
              borderRadius: 3,
            }}
          />
        </View>
        <Text style={[Type.caption, { color: colors.textSecondary }]}>
          {formatCurrency(paid, { showCents: false })} paid of{' '}
          {formatCurrency(planTotal, { showCents: false })}
        </Text>
      </Card>

      {editingTotal ? (
        <Card>
          <Text style={[Type.label, { color: colors.textPrimary }]}>Treatment plan total</Text>
          <Text style={[Type.caption, { color: colors.textSecondary }]}>
            What your orthodontist quoted for the whole treatment.
          </Text>
          <TextInput value={totalDraft} onChangeText={setTotalDraft} placeholder="e.g. 8000"
            keyboardType="numeric" placeholderTextColor={colors.textTertiary} style={inputStyle} />
          <Button
            label="Update plan total"
            disabled={!(Number(totalDraft) > 0)}
            onPress={() => {
              setPlanTotal(Number(totalDraft));
              setEditingTotal(false);
            }}
          />
          <Button label="Cancel" variant="secondary" onPress={() => setEditingTotal(false)} />
        </Card>
      ) : (
        <Button
          label="Edit plan total"
          variant="secondary"
          onPress={() => {
            setTotalDraft(String(planTotal));
            setEditingTotal(true);
          }}
        />
      )}

      {adding ? (
        <Card>
          <Text style={[Type.label, { color: colors.textPrimary }]}>Record a payment</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="Amount"
            keyboardType="numeric" placeholderTextColor={colors.textTertiary} style={inputStyle} />
          <View style={{ flexDirection: 'row', gap: Space.sm }}>
            {METHODS.map((m) => (
              <Chip key={m.value} label={m.label} selected={method === m.value}
                onPress={() => setMethod(m.value)} />
            ))}
          </View>
          <Button label="Save payment" onPress={savePayment} disabled={!(Number(amount) > 0)} />
          <Button label="Cancel" variant="secondary" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Button label="Record a payment" onPress={() => setAdding(true)} />
      )}

      <SectionVoice title="Paid so far" />
      <View style={{ gap: Space.sm }}>
        {records.length === 0 ? (
          <Text style={[Type.caption, { color: colors.textTertiary }]}>No payments recorded yet.</Text>
        ) : (
          [...records].reverse().map((record) => (
            <ListRow
              key={record.id}
              title={formatCurrency(record.amount)}
              subtitle={`${formatFullDate(record.date)}${record.method ? ` · ${METHODS.find((m) => m.value === record.method)?.label}` : ''}`}
              onPress={() =>
                Alert.alert('Remove this payment?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => deletePayment(record.id) },
                ])
              }
            />
          ))
        )}
      </View>
    </Screen>
  );
}
