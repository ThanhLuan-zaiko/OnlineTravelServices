import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email.")
  .email("Email không hợp lệ.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(12, "Mật khẩu cần ít nhất 12 ký tự.")
  .max(128, "Mật khẩu quá dài.")
  .regex(/[a-z]/, "Mật khẩu cần có ít nhất 1 chữ thường.")
  .regex(/[A-Z]/, "Mật khẩu cần có ít nhất 1 chữ hoa.")
  .regex(/[0-9]/, "Mật khẩu cần có ít nhất 1 chữ số.")
  .regex(/[^A-Za-z0-9]/, "Mật khẩu cần có ít nhất 1 ký tự đặc biệt.");

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

const optionalDateSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Ngày sinh không hợp lệ.",
  })
  .refine((value) => value.length === 0 || value <= getTodayDateString(), {
    message: "Ngày sinh không được là ngày tương lai.",
  })
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

function getTodayDateString() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export const registerRequestSchema = z
  .object({
    fullName: z.string().trim().min(2, "Vui lòng nhập họ tên."),
    email: emailSchema,
    phone: z.string().trim().min(8, "Vui lòng nhập số điện thoại."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
    gender: optionalTextSchema,
    birthDate: optionalDateSchema,
    address: optionalTextSchema,
    nationality: optionalTextSchema,
    passportNumber: optionalTextSchema,
    emergencyContactName: optionalTextSchema,
    emergencyContactPhone: optionalTextSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  });

export const accountProfileRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên."),
  phone: z.string().trim().min(8, "Vui lòng nhập số điện thoại."),
  gender: optionalTextSchema,
  birthDate: optionalDateSchema,
  address: optionalTextSchema,
  nationality: optionalTextSchema,
  passportNumber: optionalTextSchema,
  emergencyContactName: optionalTextSchema,
  emergencyContactPhone: optionalTextSchema,
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).superRefine((value, context) => {
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

  const parsedNewPassword = passwordSchema.safeParse(value.newPassword ?? "");

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

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type AccountProfileRequest = z.infer<typeof accountProfileRequestSchema>;

export type AuthUser = {
  userId: string;
  email: string;
  fullName: string;
  role: "customer";
  customerTier: string;
  vipTier: string;
};

export type AuthResponse = {
  user: AuthUser;
};

export type AuthMessageResponse = {
  message: string;
};

export type AccountProfile = {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  customerTier: string;
  vipTier: string;
  gender: string | null;
  birthDate: string | null;
  address: string | null;
  nationality: string | null;
  passportNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export type AccountProfileResponse = {
  profile: AccountProfile;
};
