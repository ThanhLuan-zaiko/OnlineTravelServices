import "server-only";

export type AuthErrorField = "confirmNewPassword" | "currentPassword" | "email" | "newPassword" | "phone";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly fields: AuthErrorField[] = [],
  ) {
    super(message);
    this.name = "AuthError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
