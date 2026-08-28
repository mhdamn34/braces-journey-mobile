import type { PaymentRecord, PaymentsState } from '@/features/payments/types';
import { createJsonStore } from '@/lib/store/create-json-store';

export const paymentsStore = createJsonStore<PaymentsState>('payments.json', {
  planTotal: 0,
  records: [],
});

export function setPlanTotal(planTotal: number): void {
  paymentsStore.update((state) => ({ ...state, planTotal }));
}

export function addPayment(record: PaymentRecord): void {
  paymentsStore.update((state) => ({
    ...state,
    records: [...state.records, record].sort((a, b) => a.date.localeCompare(b.date)),
  }));
}

export function deletePayment(id: string): void {
  paymentsStore.update((state) => ({
    ...state,
    records: state.records.filter((r) => r.id !== id),
  }));
}
