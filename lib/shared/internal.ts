import { z } from "zod";

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

const decimalStringSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập số tiền.")
  .regex(/^\d+(\.\d{1,2})?$/, "Số tiền không hợp lệ.");

const dateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.");

const timestampSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng chọn thời gian.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Thời gian không hợp lệ.");

export const internalLoginRequestSchema = z.object({
  email: z.string().trim().min(1, "Vui lòng nhập email.").email("Email không hợp lệ.").toLowerCase(),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

const internalPasswordSchema = z
  .string()
  .min(12, "Mật khẩu cần ít nhất 12 ký tự.")
  .max(128, "Mật khẩu quá dài.")
  .regex(/[a-z]/, "Mật khẩu cần có ít nhất 1 chữ thường.")
  .regex(/[A-Z]/, "Mật khẩu cần có ít nhất 1 chữ hoa.")
  .regex(/[0-9]/, "Mật khẩu cần có ít nhất 1 chữ số.")
  .regex(/[^A-Za-z0-9]/, "Mật khẩu cần có ít nhất 1 ký tự đặc biệt.");

export const internalAccountProfileRequestSchema = z
  .object({
    fullName: z.string().trim().min(2, "Vui lòng nhập họ tên."),
    phone: z.string().trim().min(8, "Vui lòng nhập số điện thoại."),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .superRefine((value, context) => {
    const wantsPasswordChange =
      Boolean(value.currentPassword) ||
      Boolean(value.newPassword) ||
      Boolean(value.confirmNewPassword);

    if (!wantsPasswordChange) {
      return;
    }

    if (!value.currentPassword) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng nhập mật khẩu hiện tại.",
        path: ["currentPassword"],
      });
    }

    const parsedNewPassword = internalPasswordSchema.safeParse(value.newPassword ?? "");

    if (!parsedNewPassword.success) {
      for (const issue of parsedNewPassword.error.issues) {
        context.addIssue({
          code: "custom",
          message: issue.message,
          path: ["newPassword"],
        });
      }
    }

    if (!value.confirmNewPassword) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng xác nhận mật khẩu mới.",
        path: ["confirmNewPassword"],
      });
    } else if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: "custom",
        message: "Mật khẩu xác nhận không khớp.",
        path: ["confirmNewPassword"],
      });
    }

    if (value.currentPassword && value.newPassword && value.currentPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        message: "Mật khẩu mới không được trùng mật khẩu hiện tại.",
        path: ["newPassword"],
      });
    }
  });

export const tourStatusSchema = z.enum(["archived", "draft", "published"]);
export const destinationStatusSchema = z.enum(["archived", "draft", "published"]);
export const serviceStatusSchema = z.enum(["archived", "draft", "published"]);
export const serviceProviderStatusSchema = z.enum(["active", "inactive", "suspended"]);
export const serviceContractStatusSchema = z.enum(["active", "draft", "expired"]);
export const tourVehicleStatusSchema = z.enum(["active", "inactive", "maintenance"]);
export const vehicleCatalogStatusSchema = z.enum(["active", "inactive"]);
export const promotionStatusSchema = z.enum(["archived", "draft", "expired", "published", "scheduled"]);
export const scheduleStatusSchema = z.enum(["cancelled", "closed", "open"]);

export type VehicleCatalogOption = {
  id: string;
  label: string;
  vehicleCapacity: number;
  vehicleModel: string;
  vehicleType: string;
};

export const vehicleCatalogOptions: VehicleCatalogOption[] = [
  { id: "bus-45", label: "Xe bus 45 chỗ", vehicleCapacity: 45, vehicleModel: "Thaco Universe", vehicleType: "bus" },
  { id: "bus-29", label: "Xe bus 29 chỗ", vehicleCapacity: 29, vehicleModel: "Thaco Town", vehicleType: "bus" },
  { id: "minivan-16", label: "Minivan 16 chỗ", vehicleCapacity: 16, vehicleModel: "Ford Transit", vehicleType: "minivan" },
  { id: "limousine-9", label: "Limousine 9 chỗ", vehicleCapacity: 9, vehicleModel: "DCar Limousine", vehicleType: "limousine" },
  { id: "car-7", label: "Ô tô 7 chỗ", vehicleCapacity: 7, vehicleModel: "Toyota Fortuner", vehicleType: "car" },
];

export const tourMutationSchema = z.object({
  title: z.string().trim().min(3, "Vui lòng nhập tên tour."),
  slug: z.string().trim().min(3, "Vui lòng nhập slug.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  destinationId: z.string().trim().uuid("Destination ID không hợp lệ."),
  destinationName: z.string().trim().min(2, "Vui lòng nhập điểm đến."),
  category: z.string().trim().min(2, "Vui lòng nhập danh mục."),
  status: tourStatusSchema,
  tourType: z.string().trim().min(2, "Vui lòng nhập loại tour."),
  vehicleCatalogId: z.string().trim().min(1, "Vui lòng chọn phương tiện."),
  vehicleCatalogLabel: z.string().trim().min(2, "Vui lòng nhập tên phương tiện."),
  vehicleType: z.string().trim().min(2, "Vui lòng nhập loại phương tiện."),
  vehicleModel: z.string().trim().min(2, "Vui lòng nhập dòng xe."),
  vehicleCapacity: z.coerce.number().int().positive("Sức chứa không hợp lệ."),
  basePrice: decimalStringSchema,
  currency: z.string().trim().min(3).max(3).toUpperCase(),
  durationDays: z.coerce.number().int().positive("Số ngày phải lớn hơn 0."),
  durationNights: z.coerce.number().int().min(0, "Số đêm không hợp lệ."),
  maxGuests: z.coerce.number().int().positive("Số khách tối đa phải lớn hơn 0."),
  minGuests: z.coerce.number().int().positive("Số khách tối thiểu phải lớn hơn 0."),
  vipOnly: z.coerce.boolean(),
  summary: optionalTextSchema,
  includedServices: z.array(z.string().trim().min(1)).default([]),
  excludedServices: z.array(z.string().trim().min(1)).default([]),
}).refine((value) => value.maxGuests >= value.minGuests, {
  message: "Số khách tối đa phải lớn hơn hoặc bằng số khách tối thiểu.",
  path: ["maxGuests"],
});

export const scheduleMutationSchema = z.object({
  departureDate: dateSchema,
  departureTime: z.string().trim().min(1, "Vui lòng nhập giờ khởi hành."),
  status: scheduleStatusSchema,
  availableSlots: z.coerce.number().int().min(0, "Số chỗ còn lại không hợp lệ."),
  bookedSlots: z.coerce.number().int().min(0, "Số chỗ đã đặt không hợp lệ."),
  price: decimalStringSchema,
  currency: z.string().trim().min(3).max(3).toUpperCase(),
  guideStaffId: z.string().trim().uuid("Guide staff ID không hợp lệ.").nullable().optional(),
}).refine((value) => value.availableSlots + value.bookedSlots > 0, {
  message: "Tổng số chỗ phải lớn hơn 0.",
  path: ["availableSlots"],
});

export const itineraryMutationSchema = z.object({
  dayNumber: z.coerce.number().int().positive("Ngày trong lịch trình không hợp lệ."),
  itemOrder: z.coerce.number().int().positive("Thứ tự không hợp lệ."),
  title: z.string().trim().min(2, "Vui lòng nhập tiêu đề."),
  description: optionalTextSchema,
  locationName: optionalTextSchema,
  startTime: optionalTextSchema,
  endTime: optionalTextSchema,
  serviceType: optionalTextSchema,
});

export const promotionMutationSchema = z.object({
  code: z.string().trim().min(3, "Vui lòng nhập mã.").max(32).toUpperCase(),
  title: z.string().trim().min(3, "Vui lòng nhập tên khuyến mãi."),
  description: optionalTextSchema,
  status: promotionStatusSchema,
  promotionType: z.string().trim().min(2, "Vui lòng nhập loại khuyến mãi."),
  customerTier: z.string().trim().min(2, "Vui lòng nhập hạng khách hàng."),
  discountType: z.enum(["amount", "percent"]),
  discountValue: decimalStringSchema,
  maxDiscountAmount: decimalStringSchema.nullable().optional(),
  startAt: timestampSchema,
  endAt: timestampSchema,
  usageLimit: z.coerce.number().int().min(0, "Giới hạn sử dụng không hợp lệ."),
}).refine((value) => Date.parse(value.endAt) > Date.parse(value.startAt), {
  message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
  path: ["endAt"],
});

export const destinationMutationSchema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập tên địa điểm."),
  country: z.string().trim().min(2, "Vui lòng nhập quốc gia."),
  region: z.string().trim().min(2, "Vui lòng nhập khu vực."),
  city: z.string().trim().min(2, "Vui lòng nhập thành phố."),
  category: z.string().trim().min(2, "Vui lòng nhập danh mục."),
  status: destinationStatusSchema,
  description: optionalTextSchema,
  address: optionalTextSchema,
  safetyLevel: z.string().trim().min(2, "Vui lòng nhập mức an toàn."),
  popularityScore: z.coerce.number().int().min(0, "Điểm phổ biến không hợp lệ."),
  latitude: z.coerce.number().min(-90, "Vĩ độ không hợp lệ.").max(90, "Vĩ độ không hợp lệ."),
  longitude: z.coerce.number().min(-180, "Kinh độ không hợp lệ.").max(180, "Kinh độ không hợp lệ."),
  searchKeywords: z.array(z.string().trim().min(1)).default([]),
  coverImageUrl: optionalTextSchema,
});

export const serviceCatalogMutationSchema = z.object({
  destinationId: z.string().trim().uuid("Destination ID không hợp lệ."),
  serviceType: z.string().trim().min(2, "Vui lòng nhập loại dịch vụ."),
  providerId: z.string().trim().uuid("Provider ID không hợp lệ.").nullable().optional(),
  name: z.string().trim().min(2, "Vui lòng nhập tên dịch vụ."),
  description: optionalTextSchema,
  basePrice: decimalStringSchema,
  currency: z.string().trim().min(3).max(3).toUpperCase(),
  status: serviceStatusSchema,
});

export const serviceProviderMutationSchema = z.object({
  serviceType: z.string().trim().min(2, "Vui lòng nhập loại dịch vụ."),
  providerName: z.string().trim().min(2, "Vui lòng nhập tên nhà cung cấp."),
  region: z.string().trim().min(2, "Vui lòng nhập khu vực."),
  phone: z.string().trim().min(8, "Vui lòng nhập số điện thoại."),
  email: z.string().trim().email("Email không hợp lệ."),
  rating: z.coerce.number().min(0, "Xếp hạng không hợp lệ.").max(5, "Xếp hạng không hợp lệ."),
  contractStatus: serviceContractStatusSchema,
  status: serviceProviderStatusSchema,
});

export const tourVehicleMutationSchema = z.object({
  vehicleType: z.string().trim().min(2, "Vui lòng nhập loại phương tiện."),
  plateNumber: z.string().trim().min(2, "Vui lòng nhập biển số."),
  model: z.string().trim().min(2, "Vui lòng nhập dòng xe."),
  capacity: z.coerce.number().int().positive("Sức chứa không hợp lệ."),
  driverName: z.string().trim().min(2, "Vui lòng nhập tên tài xế."),
  driverPhone: z.string().trim().min(8, "Vui lòng nhập số điện thoại tài xế."),
  notes: optionalTextSchema,
  status: tourVehicleStatusSchema,
});

export const vehicleCatalogMutationSchema = z.object({
  label: z.string().trim().min(2, "Vui lòng nhập tên phương tiện."),
  vehicleType: z.string().trim().min(2, "Vui lòng nhập loại phương tiện."),
  vehicleModel: z.string().trim().min(2, "Vui lòng nhập dòng xe."),
  vehicleCapacity: z.coerce.number().int().positive("Sức chứa không hợp lệ."),
  status: vehicleCatalogStatusSchema,
});

export type InternalLoginRequest = z.infer<typeof internalLoginRequestSchema>;
export type InternalAccountProfileRequest = z.infer<typeof internalAccountProfileRequestSchema>;
export type TourMutationRequest = z.infer<typeof tourMutationSchema>;
export type ScheduleMutationRequest = z.infer<typeof scheduleMutationSchema>;
export type ItineraryMutationRequest = z.infer<typeof itineraryMutationSchema>;
export type PromotionMutationRequest = z.infer<typeof promotionMutationSchema>;
export type DestinationMutationRequest = z.infer<typeof destinationMutationSchema>;
export type ServiceCatalogMutationRequest = z.infer<typeof serviceCatalogMutationSchema>;
export type ServiceProviderMutationRequest = z.infer<typeof serviceProviderMutationSchema>;
export type TourVehicleMutationRequest = z.infer<typeof tourVehicleMutationSchema>;
export type VehicleCatalogMutationRequest = z.infer<typeof vehicleCatalogMutationSchema>;

export type InternalTour = TourMutationRequest & {
  approvedBy: string | null;
  averageRating: string;
  createdAt: string;
  createdBy: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  ratingCount: number;
  tourId: string;
  updatedAt: string;
};

export type InternalSchedule = ScheduleMutationRequest & {
  scheduleId: string;
};

export type InternalItineraryItem = Required<ItineraryMutationRequest>;

export type InternalPromotion = PromotionMutationRequest & {
  createdBy: string | null;
  promotionId: string;
  usedCount: number;
};

export type InternalDestination = DestinationMutationRequest & {
  averageRating: string;
  createdAt: string;
  destinationId: string;
  mediaCount: number;
  updatedAt: string;
};

export type InternalDestinationMedia = {
  destinationId: string;
  mediaId: string;
  mediaOrder: number;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type InternalServiceCatalog = ServiceCatalogMutationRequest & {
  serviceId: string;
  updatedAt: string;
};

export type InternalServiceProvider = ServiceProviderMutationRequest & {
  providerId: string;
  updatedAt: string;
};

export type InternalVehicleCatalogItem = VehicleCatalogMutationRequest & {
  imageUrl: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
  vehicleCatalogId: string;
};

export type InternalTourMedia = {
  mediaId: string;
  mediaOrder: number;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type InternalTourVehicle = TourVehicleMutationRequest & {
  tourId: string;
  updatedAt: string;
  vehicleId: string;
};

export type InternalRevenueSummary = {
  bookingCount: number;
  grossAmount: string;
  netRevenue: string;
  paymentCount: number;
  refundAmount: string;
  totalRevenue: string;
};

export type InternalRevenueResponse = {
  daily: Array<{
    calculatedAt: string | null;
    currency: string;
    netRevenue: string;
    paymentCount: number;
    refundAmount: string;
    statDay: string;
    totalRevenue: string;
  }>;
  monthly: Array<{
    calculatedAt: string | null;
    currency: string;
    netRevenue: string;
    paymentCount: number;
    refundAmount: string;
    statMonth: string;
    totalRevenue: string;
  }>;
  summary: InternalRevenueSummary;
  tourPerformance: Array<{
    averageRating: string;
    bookingCount: number;
    cancellationCount: number;
    guestCount: number;
    revenue: string;
    statMonth: string;
    title: string;
    tourId: string;
  }>;
};

export type InternalAccountProfile = {
  userId: string;
  email: string;
  fullName: string;
  role: "administrative_staff";
  customerTier: string;
  vipTier: string;
  phone: string;
  department: string;
  staffLevel: string;
  hiredAt: string;
  lastActivityAt: string | null;
  permissions: string[];
};

export type InternalAccountProfileResponse = {
  profile: InternalAccountProfile;
};
