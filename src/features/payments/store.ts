import { fetchPayments, paymentFromApi, type ApiPayment } from '@/features/payments/api';
import type { PaymentMethod, PaymentsState } from '@/features/payments/types';
import { apiRequest } from '@/lib/api/client';
import { createApiStore } from '@/lib/store/create-api-store';

export const paymentsStore = createApiStore<PaymentsState>(
  'payments.json',
  { planTotal: 0, records: [] },
  fetchPayments,
);

export async function setPlanTotal(planTotal: number): Promise<void> {
  await apiRequest('PUT', '/payments/plan-total', { body: { total_cost: planTotal } });
  paymentsStore.update((state) => ({ ...state, planTotal }));
}

export async function addPayment(input: {
  date: string;
  amount: number;
  method?: PaymentMethod;
}): Promise<void> {
  const body: Record<string, unknown> = { amount: input.amount, paid_at: input.date };
  if (input.method) body.method = input.method;
  const res = await apiRequest<{ data: ApiPayment }>('POST', '/payments', { body });
  paymentsStore.update((state) => ({
    ...state,
    records: [...state.records, paymentFromApi(res.data)].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  }));
}

export async function deletePayment(id: string): Promise<void> {
  await apiRequest('DELETE', `/payments/${id}`);
  paymentsStore.update((state) => ({
    ...state,
    records: state.records.filter((r) => r.id !== id),
  }));
}
