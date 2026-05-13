import { z } from "zod";

const dateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày khởi hành không hợp lệ.");
const optionalTextSchema = z
  .string()
  .trim()
  .max(1000, "Yêu cầu đặc biệt quá dài.")
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

export const customerBookingMutationSchema = z.object({
  departureDate: dateSchema,
  guestCount: z.coerce.number().int().min(1, "Số khách phải lớn hơn 0.").max(120, "Số khách vượt giới hạn cho phép."),
  scheduleId: z.string().trim().uuid("Lịch khởi hành không hợp lệ."),
  specialRequests: optionalTextSchema,
  tourId: z.string().trim().uuid("Tour không hợp lệ."),
});

export type CustomerBookingMutationRequest = z.infer<typeof customerBookingMutationSchema>;

export type CustomerBooking = {
  bookedAt: string;
  bookingCode: string;
  bookingId: string;
  currency: string;
  departureDate: string;
  guestCount: number;
  paymentStatus: string;
  scheduleId: string;
  status: string;
  totalAmount: string;
  tourId: string;
  tourTitle: string;
};

export type CustomerBookingMutationResponse = {
  booking: CustomerBooking;
};
