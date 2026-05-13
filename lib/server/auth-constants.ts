import "server-only";

export const AUTH_COOKIE_NAME = "online-travel-session";

export const CUSTOMER_ROLE = "customer";
export const ADMINISTRATIVE_STAFF_ROLE = "administrative_staff";
export const OPERATIONS_STATISTICS_STAFF_ROLE = "operations_statistics_staff";
export const ACTIVE_STATUS = "active";
export const OPERATIONS_ACCESS_PERMISSION = "operations:access";
export const STAFF_MANAGE_PERMISSION = "staff:manage";
export const SUPER_ADMIN_STAFF_LEVEL = "super_admin";
export const SYSTEM_MANAGE_PERMISSION = "system:manage";
export const DEFAULT_CUSTOMER_TIER = "standard";
export const DEFAULT_VIP_TIER = "none";
export const SESSION_TTL_DAYS = 7;
export const GENERIC_LOGIN_ERROR = "Email hoặc mật khẩu không đúng.";
export const DUPLICATE_ACCOUNT_ERROR = "tài khoản đã tồn tại";
export const FAILED_AUTH_DELAY_MS = 450;
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$OQIF5VAcfhGSW2P0RQRA8g$HF+rOHdleU2wYeZ12S2ecOJRbLVlzV8Rnz5Xu0nfJz4";
