import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { TourDetailManager } from "@/components/internal/tour-detail-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chi tiết tour | Online Travel Services",
};

type PageProps = {
  params: Promise<{
    tourId: string;
  }>;
};

export default async function InternalTourDetailPage({ params }: PageProps) {
  const { tourId } = await params;
  const user = await requireAdministrativeStaffPage(`/internal/tours/${tourId}`);

  return (
    <InternalShell user={user}>
      <TourDetailManager tourId={tourId} />
    </InternalShell>
  );
}
