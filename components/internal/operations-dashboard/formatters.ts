import type { OperationReport } from "@/lib/shared/internal";

export function today() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export function money(value: number | string) {
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadReportsCsv(reports: OperationReport[]) {
  const rows = [
    ["report_id", "title", "period_type", "period_value", "status", "created_at", "updated_at", "content"],
    ...reports.map((report) => [
      report.reportId,
      report.title,
      report.periodType,
      report.periodValue,
      report.status,
      report.createdAt,
      report.updatedAt,
      report.content,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "operation-reports.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
