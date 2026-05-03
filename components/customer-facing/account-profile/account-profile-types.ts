import type { AccountProfileRequest } from "@/lib/shared/auth";

export type AccountProfileErrors = Partial<Record<keyof AccountProfileRequest, string>>;

export const genderOptions = [
  { label: "Nữ", value: "female" },
  { label: "Nam", value: "male" },
  { label: "Khác", value: "other" },
];
