import "server-only";

export { AUTH_COOKIE_NAME } from "@/lib/server/auth-constants";
export {
  getAuthCookieOptions,
  getAuthCookieValue,
  getClearAuthCookieOptions,
} from "@/lib/server/auth-cookie";
export { AuthError, type AuthErrorField } from "@/lib/server/auth-errors";
export {
  getCurrentCustomer,
  getCurrentCustomerProfile,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  updateCurrentCustomerProfile,
} from "@/lib/server/auth-service";
