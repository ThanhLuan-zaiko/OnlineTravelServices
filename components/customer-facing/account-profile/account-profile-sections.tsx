"use client";

import {
  FiCalendar,
  FiCreditCard,
  FiFlag,
  FiMapPin,
  FiPhone,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import { PasswordField } from "@/components/ui/password-field";
import { SelectField } from "@/components/ui/select-field";
import type { AccountProfile } from "@/lib/shared/auth";

import { getTodayDateString } from "./account-profile-utils";
import { IconField, SectionPanel } from "./account-profile-layout";
import { genderOptions, type AccountProfileErrors } from "./account-profile-types";

type ProfileSectionProps = {
  errors: AccountProfileErrors;
  gender: string;
  onGenderChange: (value: string) => void;
  profile: AccountProfile;
};

type DocumentSectionProps = {
  errors: AccountProfileErrors;
  profile: AccountProfile;
};

export function PersonalInfoSection({
  errors,
  gender,
  onGenderChange,
  profile,
}: ProfileSectionProps) {
  return (
    <SectionPanel
      description="Thông tin này được dùng để liên hệ và điền nhanh khi đặt dịch vụ."
      icon={<FiUser size={18} />}
      title="Thông tin cá nhân"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <IconField
          autoComplete="name"
          defaultValue={profile.fullName}
          error={errors.fullName}
          icon={<FiUser size={18} />}
          label="Họ tên"
          name="fullName"
        />
        <IconField
          autoComplete="tel"
          defaultValue={profile.phone}
          error={errors.phone}
          icon={<FiPhone size={18} />}
          label="Số điện thoại"
          name="phone"
          type="tel"
        />
        <SelectField
          error={errors.gender}
          label="Giới tính"
          name="gender"
          onValueChange={onGenderChange}
          options={genderOptions}
          placeholder="Không chọn"
          value={gender}
        />
        <IconField
          defaultValue={profile.birthDate ?? ""}
          error={errors.birthDate}
          icon={<FiCalendar size={18} />}
          label="Ngày sinh"
          max={getTodayDateString()}
          name="birthDate"
          type="date"
        />
        <IconField
          autoComplete="country-name"
          defaultValue={profile.nationality ?? ""}
          error={errors.nationality}
          icon={<FiFlag size={18} />}
          label="Quốc tịch"
          name="nationality"
        />
        <IconField
          autoComplete="street-address"
          defaultValue={profile.address ?? ""}
          error={errors.address}
          icon={<FiMapPin size={18} />}
          label="Địa chỉ"
          name="address"
        />
      </div>
    </SectionPanel>
  );
}

export function TravelDocumentSection({ errors, profile }: DocumentSectionProps) {
  return (
    <SectionPanel
      description="Lưu thông tin giấy tờ và người liên hệ để hỗ trợ các chuyến đi cần xác minh."
      icon={<FiCreditCard size={18} />}
      title="Giấy tờ và liên hệ"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <IconField
          defaultValue={profile.passportNumber ?? ""}
          error={errors.passportNumber}
          icon={<FiCreditCard size={18} />}
          label="Số hộ chiếu"
          name="passportNumber"
        />
        <IconField
          defaultValue={profile.emergencyContactName ?? ""}
          error={errors.emergencyContactName}
          icon={<FiUsers size={18} />}
          label="Liên hệ khẩn cấp"
          name="emergencyContactName"
        />
        <IconField
          defaultValue={profile.emergencyContactPhone ?? ""}
          error={errors.emergencyContactPhone}
          icon={<FiPhone size={18} />}
          label="SĐT khẩn cấp"
          name="emergencyContactPhone"
          type="tel"
        />
      </div>
    </SectionPanel>
  );
}

export function SecuritySection({ errors }: { errors: AccountProfileErrors }) {
  return (
    <SectionPanel
      description="Để trống nhóm này nếu bạn chỉ muốn cập nhật hồ sơ."
      icon={<FiShield size={18} />}
      title="Bảo mật"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <PasswordField
          autoComplete="current-password"
          error={errors.currentPassword}
          label="Mật khẩu hiện tại"
          name="currentPassword"
        />
        <PasswordField
          autoComplete="new-password"
          error={errors.newPassword}
          intent="emerald"
          label="Mật khẩu mới"
          minLength={12}
          name="newPassword"
        />
        <PasswordField
          autoComplete="new-password"
          error={errors.confirmNewPassword}
          intent="emerald"
          label="Xác nhận mật khẩu mới"
          minLength={12}
          name="confirmNewPassword"
        />
      </div>
    </SectionPanel>
  );
}
