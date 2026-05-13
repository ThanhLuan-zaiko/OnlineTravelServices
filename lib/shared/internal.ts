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
export const serviceProviderStatusSchema = z.enum(["active", "inactive", "suspended", "archived"]);
export const serviceContractStatusSchema = z.enum(["active", "draft", "expired"]);
export const tourVehicleStatusSchema = z.enum(["active", "inactive", "maintenance"]);
export const vehicleCatalogStatusSchema = z.enum(["active", "inactive", "archived"]);
export const promotionStatusSchema = z.enum(["archived", "draft", "expired", "published", "scheduled"]);
export const scheduleStatusSchema = z.enum(["cancelled", "closed", "open"]);
export const suggestedTourStatusSchema = z.enum(["approved", "converted", "pending", "rejected"]);
export const suggestedTourDecisionSchema = z.enum(["approved", "converted", "rejected"]);
export const tourApprovalStatusSchema = z.enum(["approved", "change_requested", "pending", "rejected"]);
export const tourApprovalDecisionSchema = z.enum(["approved", "change_requested", "rejected"]);
export const staffNotificationStatusSchema = z.enum(["all", "read", "unread"]);
export const customerListModeSchema = z.enum(["all", "status", "tier", "vip"]);
export const operationTourLifecycleStatusSchema = z.enum(["preparing", "in_progress", "completed", "cancelled"]);
export const operationReportStatusSchema = z.enum(["draft", "submitted", "archived"]);
export const operationTrendAnalysisTypeSchema = z.enum([
  "customer_trend",
  "destination_effectiveness",
  "demand_forecast",
  "promotion_sentiment",
]);

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
  customerSegment: z.enum(["all", "regular", "vip"]).default("all"),
  regularGiftTitle: optionalTextSchema,
  vipGiftTitle: optionalTextSchema,
  vipDiscountPriority: z.coerce.number().int().min(0, "Ưu tiên VIP không hợp lệ.").max(100, "Ưu tiên VIP không hợp lệ.").default(0),
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
  label: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập tên phương tiện.")
    .max(120, "Tên phương tiện quá dài.")
    .regex(/^[\p{L}\p{N}\s().,+/&-]+$/u, "Tên phương tiện có ký tự không hợp lệ."),
  vehicleType: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập loại phương tiện.")
    .max(50, "Loại phương tiện quá dài.")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Loại phương tiện chỉ gồm chữ, số, khoảng trắng và dấu gạch ngang."),
  vehicleModel: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập dòng xe.")
    .max(80, "Dòng xe quá dài.")
    .regex(/^[\p{L}\p{N}\s().,+/&-]+$/u, "Dòng xe có ký tự không hợp lệ."),
  vehicleCapacity: z.coerce.number().int("Sức chứa phải là số nguyên.").min(1, "Sức chứa phải lớn hơn 0.").max(120, "Sức chứa vượt giới hạn cho phép."),
  status: vehicleCatalogStatusSchema,
});

export const suggestedTourMutationSchema = z.object({
  budgetAmount: decimalStringSchema,
  currency: z.string().trim().min(3).max(3).toUpperCase(),
  destinationId: z.string().trim().uuid("Destination ID không hợp lệ.").nullable().optional(),
  destinationName: z.string().trim().min(2, "Vui lòng nhập điểm đến."),
  estimatedGuests: z.coerce.number().int().positive("Số khách dự kiến không hợp lệ."),
  feasibilityIssues: z.array(z.string().trim().min(1)).default([]),
  feasibilityScore: z.coerce.number().int().min(0, "Điểm khả thi không hợp lệ.").max(100, "Điểm khả thi không hợp lệ."),
  itinerarySummary: z.string().trim().min(3, "Vui lòng nhập tóm tắt lịch trình."),
  proposedBy: z.string().trim().uuid("Customer ID không hợp lệ.").nullable().optional(),
  proposedByName: optionalTextSchema,
  proposedEndDate: dateSchema.nullable().optional(),
  proposedStartDate: dateSchema.nullable().optional(),
  safetyLevel: z.string().trim().min(2, "Vui lòng nhập mức an toàn."),
  serviceSummary: z.string().trim().min(3, "Vui lòng nhập tóm tắt dịch vụ."),
  sourceType: z.string().trim().min(2, "Vui lòng nhập nguồn đề xuất."),
  status: suggestedTourStatusSchema.default("pending"),
  title: z.string().trim().min(3, "Vui lòng nhập tên tour đề xuất."),
});

export const suggestedTourDecisionRequestSchema = z.object({
  alternativeSuggestion: optionalTextSchema,
  decision: suggestedTourDecisionSchema,
  decisionNote: z.string().trim().min(2, "Vui lòng nhập ghi chú quyết định."),
  publishConvertedTour: z.coerce.boolean().default(false),
});

export const tourApprovalMutationSchema = z.object({
  requestNote: optionalTextSchema,
  requestedByName: optionalTextSchema,
  riskFlags: z.array(z.string().trim().min(1)).default([]),
  tourId: z.string().trim().uuid("Tour ID không hợp lệ."),
  tourTitle: z.string().trim().min(2, "Vui lòng nhập tên tour."),
});

export const tourApprovalDecisionRequestSchema = z.object({
  changeRequestDetail: optionalTextSchema,
  decision: tourApprovalDecisionSchema,
  reviewNote: z.string().trim().min(2, "Vui lòng nhập ghi chú duyệt."),
});

export const customerTierMutationSchema = z.object({
  customerTier: z.string().trim().min(2, "Vui lòng nhập hạng khách hàng."),
  vipTier: z.string().trim().min(2, "Vui lòng nhập hạng VIP."),
});

export const customerRewardMutationSchema = z.object({
  description: optionalTextSchema,
  expiresAt: timestampSchema.nullable().optional(),
  pointsDelta: z.coerce.number().int("Điểm thưởng phải là số nguyên."),
  promotionId: z.string().trim().uuid("Promotion ID không hợp lệ.").nullable().optional(),
  rewardType: z.string().trim().min(2, "Vui lòng nhập loại quà."),
  title: z.string().trim().min(2, "Vui lòng nhập tên quà."),
});

export const operationTourStatusMutationSchema = z.object({
  guestCount: z.coerce.number().int().min(0, "Số lượng khách không hợp lệ.").optional(),
  note: optionalTextSchema,
  status: operationTourLifecycleStatusSchema,
});

export const operationScheduleAdjustmentSchema = z.object({
  availableSlots: z.coerce.number().int().min(0, "Số chỗ còn lại không hợp lệ.").optional(),
  bookedSlots: z.coerce.number().int().min(0, "Số chỗ đã đặt không hợp lệ.").optional(),
  currency: z.string().trim().min(3).max(3).toUpperCase().optional(),
  departureDate: dateSchema,
  departureTime: z.string().trim().min(1, "Vui lòng nhập giờ khởi hành.").optional(),
  note: optionalTextSchema,
  price: decimalStringSchema.optional(),
  status: scheduleStatusSchema.optional(),
}).refine((value) => Object.keys(value).some((key) => key !== "departureDate" && key !== "note" && value[key as keyof typeof value] !== undefined), {
  message: "Vui lòng chọn ít nhất một thông tin cần điều chỉnh.",
  path: ["departureDate"],
});

export const operationCustomerNotificationSchema = z.object({
  body: z.string().trim().min(3, "Vui lòng nhập nội dung thông báo."),
  bookingId: z.string().trim().uuid("Booking ID không hợp lệ.").nullable().optional(),
  title: z.string().trim().min(3, "Vui lòng nhập tiêu đề thông báo."),
  updateType: z.string().trim().min(2, "Vui lòng nhập loại cập nhật."),
  userId: z.string().trim().uuid("User ID không hợp lệ.").nullable().optional(),
});

export const operationTrendSnapshotMutationSchema = z.object({
  analysisType: operationTrendAnalysisTypeSchema,
  dataUri: optionalTextSchema,
  inputPeriod: z.string().trim().min(2, "Vui lòng nhập kỳ dữ liệu."),
  positiveTrend: z.coerce.boolean(),
  resultSummary: z.string().trim().min(3, "Vui lòng nhập kết quả phân tích."),
  title: z.string().trim().min(3, "Vui lòng nhập tiêu đề phân tích."),
});

export const operationReportMutationSchema = z.object({
  content: z.string().trim().min(3, "Vui lòng nhập nội dung báo cáo."),
  periodType: z.enum(["day", "week", "month", "year"]),
  periodValue: z.string().trim().min(2, "Vui lòng nhập kỳ báo cáo."),
  sourceDataUri: optionalTextSchema,
  status: operationReportStatusSchema.default("draft"),
  title: z.string().trim().min(3, "Vui lòng nhập tiêu đề báo cáo."),
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
export type SuggestedTourMutationRequest = z.infer<typeof suggestedTourMutationSchema>;
export type SuggestedTourDecisionRequest = z.infer<typeof suggestedTourDecisionRequestSchema>;
export type TourApprovalMutationRequest = z.infer<typeof tourApprovalMutationSchema>;
export type TourApprovalDecisionRequest = z.infer<typeof tourApprovalDecisionRequestSchema>;
export type CustomerTierMutationRequest = z.infer<typeof customerTierMutationSchema>;
export type CustomerRewardMutationRequest = z.infer<typeof customerRewardMutationSchema>;
export type OperationTourStatusMutationRequest = z.infer<typeof operationTourStatusMutationSchema>;
export type OperationScheduleAdjustmentRequest = z.infer<typeof operationScheduleAdjustmentSchema>;
export type OperationCustomerNotificationRequest = z.infer<typeof operationCustomerNotificationSchema>;
export type OperationTrendSnapshotMutationRequest = z.infer<typeof operationTrendSnapshotMutationSchema>;
export type OperationReportMutationRequest = z.infer<typeof operationReportMutationSchema>;

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
  archivedAt: string | null;
  archivedFromStatus: "draft" | "expired" | "published" | "scheduled" | null;
  createdBy: string | null;
  imageUrl: string | null;
  promotionId: string;
  revenueImpact: string;
  thumbnailUrl: string | null;
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
  archivedAt: string | null;
  archivedFromStatus: "draft" | "published" | null;
  imageUrl: string | null;
  serviceId: string;
  thumbnailUrl: string | null;
  updatedAt: string;
};

export type InternalServiceMedia = {
  destinationId: string;
  isCover: boolean;
  mediaId: string;
  mediaOrder: number;
  mediaUrl: string;
  serviceId: string;
  serviceType: string;
  thumbnailUrl: string;
  title: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type InternalPromotionMedia = {
  isCover: boolean;
  mediaId: string;
  mediaOrder: number;
  mediaUrl: string;
  promotionId: string;
  thumbnailUrl: string;
  title: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type InternalServiceProvider = ServiceProviderMutationRequest & {
  archivedAt: string | null;
  archivedFromStatus: "active" | "inactive" | "suspended" | null;
  imageUrl: string | null;
  providerId: string;
  thumbnailUrl: string | null;
  updatedAt: string;
};

export type InternalServiceProviderMedia = {
  isCover: boolean;
  mediaId: string;
  mediaOrder: number;
  mediaUrl: string;
  providerId: string;
  serviceType: string;
  thumbnailUrl: string;
  title: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type InternalVehicleCatalogItem = VehicleCatalogMutationRequest & {
  archivedAt: string | null;
  archivedFromStatus: "active" | "inactive" | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
  vehicleCatalogId: string;
};

export type InternalVehicleCatalogMedia = {
  isCover: boolean;
  mediaId: string;
  mediaOrder: number;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
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

export type InternalSuggestedTour = SuggestedTourMutationRequest & {
  alternativeSuggestion: string | null;
  convertedTourId: string | null;
  createdAt: string;
  decisionAt: string | null;
  decisionBy: string | null;
  decisionNote: string | null;
  suggestionId: string;
};

export type InternalTourApproval = TourApprovalMutationRequest & {
  approvalId: string;
  changeRequestDetail: string | null;
  requestedAt: string;
  requestedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  status: z.infer<typeof tourApprovalStatusSchema>;
};

export type InternalCustomerProfile = {
  createdAt: string;
  customerTier: string;
  email: string;
  fullName: string;
  lastBookingAt: string | null;
  loyaltyPoints: number;
  phone: string;
  status: string;
  totalBookings: number;
  totalSpent: string;
  userId: string;
  violationCount: number;
  vipTier: string;
};

export type InternalCustomerHistory = {
  amount: string | null;
  detail: string | null;
  entityId: string | null;
  entityType: string | null;
  eventTime: string;
  eventType: string;
  title: string;
};

export type InternalCustomerReward = {
  description: string | null;
  expiresAt: string | null;
  pointsDelta: number;
  promotionId: string | null;
  redeemedAt: string | null;
  rewardTime: string;
  rewardType: string;
  status: "active" | "expired" | "redeemed";
  title: string;
  userId: string;
};

export type InternalAuditEvent = {
  action: string;
  actorId: string;
  actorRole: string;
  auditId: string;
  description: string;
  entityId: string | null;
  entityType: string;
  eventTime: string;
  ipAddress: string | null;
};

export type InternalStaffNotification = {
  body: string;
  entityId: string | null;
  entityLabel: string | null;
  entityType: string | null;
  notificationId: string;
  notificationTime: string;
  notificationType: string;
  readAt: string | null;
  staffId: string;
  title: string;
};

export type OperationTourEvent = {
  changedBy: string;
  eventId: string;
  eventTime: string;
  guestCount: number | null;
  note: string | null;
  status: z.infer<typeof operationTourLifecycleStatusSchema>;
  tourId: string;
  tourTitle: string;
};

export type OperationTourOverview = InternalTour & {
  lifecycleEvent: OperationTourEvent | null;
  schedules: InternalSchedule[];
};

export type OperationCustomerVisitStat = {
  bookingCount: number;
  calculatedAt: string | null;
  locationKey: string;
  newCustomerCount: number;
  periodType: "day" | "week" | "month" | "year";
  periodValue: string;
  vipCustomerCount: number;
  visitorCount: number;
};

export type OperationTrendSnapshot = {
  analysisType: z.infer<typeof operationTrendAnalysisTypeSchema>;
  createdBy: string | null;
  dataUri: string | null;
  inputPeriod: string;
  positiveTrend: boolean;
  resultSummary: string;
  snapshotId: string;
  snapshotTime: string;
  title: string;
};

export type OperationReport = {
  content: string;
  createdAt: string;
  createdBy: string;
  periodType: "day" | "week" | "month" | "year";
  periodValue: string;
  reportId: string;
  sourceDataUri: string | null;
  status: z.infer<typeof operationReportStatusSchema>;
  title: string;
  updatedAt: string;
};

export type OperationCustomerNotification = {
  body: string;
  bookingId: string | null;
  deliveryStatus: string;
  notificationId: string;
  notificationTime: string;
  title: string;
  tourId: string;
  updateType: string;
  userId: string | null;
};

export type OperationDashboardResponse = {
  bookingSummary: InternalRevenueSummary;
  customerVisitStats: OperationCustomerVisitStat[];
  recentEvents: OperationTourEvent[];
  revenue: InternalRevenueResponse;
  tours: OperationTourOverview[];
  trendSnapshots: OperationTrendSnapshot[];
};

export type InternalAccountProfile = {
  userId: string;
  email: string;
  fullName: string;
  role: "administrative_staff" | "operations_statistics_staff";
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
