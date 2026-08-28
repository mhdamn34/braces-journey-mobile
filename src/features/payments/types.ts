export type PaymentMethod = 'cash' | 'qrpay' | 'card';

export type PaymentRecord = {
  id: string;
  date: string; // ISO date
  amount: number; // RM
  method?: PaymentMethod;
  note?: string;
};

export type PaymentsState = {
  planTotal: number;
  records: PaymentRecord[];
};
