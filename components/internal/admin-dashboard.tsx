"use client";

import { usePathname } from "next/navigation";

import { AuditManager } from "./audit-manager";
import { WorkspaceTabs } from "./catalog-workspace-ui";
import { CustomerManager } from "./customer-manager";
import {
  operationModules,
  operationTabs,
  resolveAdminModule,
  revenueTabs,
  type StaffTab,
  type SystemTab,
} from "./admin-dashboard/config";
import { AdminHeader, AdminModuleNavigation, AdminOverview } from "./admin-dashboard/overview-section";
import { AdminStaffSection } from "./admin-dashboard/staff-section";
import { AdminSystemSection } from "./admin-dashboard/system-section";
import { OperationsDashboard, type OperationsModule, type OperationsTab } from "./operations-dashboard";
import { RevenueDashboard } from "./revenue-dashboard";

export function AdminDashboard({ segments = [] }: { segments?: string[] }) {
  const activeModule = resolveAdminModule(segments);

  return (
    <div className="space-y-5">
      <AdminHeader module={activeModule} />
      <AdminModuleNavigation activeModule={activeModule} />

      {activeModule === "overview" ? <AdminOverview /> : null}
      {activeModule === "staff" ? <AdminStaffSection tab={(segments[1] as StaffTab | undefined) ?? "list"} /> : null}
      {activeModule === "customers" ? <CustomerManager basePath="/internal/admin/customers" /> : null}
      {activeModule === "revenue" ? <AdminRevenueSection /> : null}
      {activeModule === "operations" ? <AdminOperationsSection segments={segments.slice(1)} /> : null}
      {activeModule === "system" ? <AdminSystemSection tab={(segments[1] as SystemTab | undefined) ?? "tasks"} /> : null}
      {activeModule === "audit" ? <AuditManager /> : null}
    </div>
  );
}

function AdminRevenueSection() {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <WorkspaceTabs pathname={pathname} tabs={revenueTabs} />
      <RevenueDashboard />
    </div>
  );
}

function AdminOperationsSection({ segments }: { segments: string[] }) {
  const operationsModule = operationModules.includes(segments[0] as OperationsModule)
    ? (segments[0] as OperationsModule)
    : "overview";
  const tab = operationTabs.includes(segments[1] as OperationsTab) ? (segments[1] as OperationsTab) : undefined;

  return <OperationsDashboard basePath="/internal/admin/operations" module={operationsModule} tab={tab} />;
}
