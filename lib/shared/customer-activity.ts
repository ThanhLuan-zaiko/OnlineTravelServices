export type CustomerBookingHistoryItem = {
  bookedAt: string;
  bookingCode: string;
  bookingId: string;
  currency: string;
  departureDate: string;
  paymentStatus: string;
  status: string;
  totalAmount: string;
  tourId: string;
  tourTitle: string;
};

export type CustomerPaymentHistoryItem = {
  amount: string;
  bookingId: string;
  createdAt: string;
  currency: string;
  paymentId: string;
  provider: string;
  status: string;
};

export type CustomerBookingHistoryResponse = {
  bookings: CustomerBookingHistoryItem[];
  nextCursor: string | null;
};

export type CustomerPaymentHistoryResponse = {
  nextCursor: string | null;
  payments: CustomerPaymentHistoryItem[];
};
