import type { PaymentMethod, PaymentRecord, PaymentsState } from '@/features/payments/types';
import { apiRequest } from '@/lib/api/client';

export type ApiPayment = {
  id: number;
  amount: number;
  currency: string;
  method: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string | null;
};

type PaymentsIndex = {
  data: ApiPayment[];
  summary: { plan_total: number | null; total_paid: number; remaining: number | null };
};

const APP_METHODS: PaymentMethod[] = ['cash', 'qrpay', 'card'];

export function paymentFromApi(p: ApiPayment): PaymentRecord {
  return {
    id: String(p.id),
    date: p.paid_at ?? '',
    amount: p.amount,
    // transfer/other exist server-side but not in the app's picker — shown methodless.
    method: APP_METHODS.includes(p.method as PaymentMethod) ? (p.method as PaymentMethod) : undefined,
    note: p.notes ?? undefined,
  };
}

export async function fetchPayments(): Promise<PaymentsState> {
  const res = await apiRequest<PaymentsIndex>('GET', '/payments');
  return {
    planTotal: res.summary.plan_total ?? 0,
    records: res.data.map(paymentFromApi).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
