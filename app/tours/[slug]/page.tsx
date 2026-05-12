import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PublicTourDetail } from "@/components/customer-facing/public-tour-detail";
import { getPublicTourDetail } from "@/lib/server/public-tours";

type TourDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: TourDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getPublicTourDetail(slug);

  if (!tour) {
    return {
      title: "Không tìm thấy tour | Online Travel Services",
    };
  }

  return {
    description: tour.summary ?? `${tour.destinationName} - ${tour.durationDays} ngày ${tour.durationNights} đêm`,
    title: `${tour.title} | Online Travel Services`,
  };
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { slug } = await params;
  const tour = await getPublicTourDetail(slug);

  if (!tour) {
    notFound();
  }

  return <PublicTourDetail tour={tour} />;
}
