"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FiSave, FiStar, FiTrash2 } from "react-icons/fi";

import { ImageDropzone } from "@/components/ui/image-dropzone";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import { useToast } from "@/components/ui/toast";
import {
  deleteInternalTourMedia,
  getInternalTourMedia,
  setInternalTourMediaCover,
  uploadInternalTourMedia,
  type ApiError,
} from "@/lib/client/api-client";
import type { InternalTour } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";

type TourMediaManagerProps = {
  coverImageUrl: string | null;
  tour: InternalTour | undefined;
  tourId: string;
};

export function TourMediaManager({ coverImageUrl, tour, tourId }: TourMediaManagerProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [isCover, setIsCover] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const mediaQuery = useQuery({
    queryKey: ["internal", "tour-media", tourId] as const,
    queryFn: () => getInternalTourMedia(tourId),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Vui lòng chọn ảnh để tải lên.");
      }

      return uploadInternalTourMedia(tourId, {
        file: selectedFile,
        isCover,
        mediaType,
        title: mediaTitle.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "tour-media", tourId] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "tour", tourId] }),
      ]);
      setSelectedFile(null);
      setMediaTitle("");
      showToast({
        message: "Ảnh tour đã được chuẩn hóa và lưu.",
        title: "Upload thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể tải ảnh tour.",
        title: "Upload chưa thành công",
        variant: "error",
      });
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: (mediaId: string) => setInternalTourMediaCover(tourId, mediaId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "tour-media", tourId] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "tour", tourId] }),
      ]);
      showToast({
        message: "Ảnh đại diện tour đã được cập nhật.",
        title: "Đã đặt ảnh đại diện",
        variant: "success",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => deleteInternalTourMedia(tourId, mediaId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "tour-media", tourId] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "tour", tourId] }),
      ]);
      showToast({
        message: "Ảnh tour đã bị xóa.",
        title: "Đã xóa ảnh",
        variant: "success",
      });
    },
  });

  const media = mediaQuery.data?.media ?? [];

  return (
    <InternalPanel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Ảnh tour</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Mỗi tour có thể có nhiều ảnh. Ảnh được chuẩn hóa bằng Sharp và lưu riêng theo tour.
          </p>
        </div>
        <StatusPill value={media.length > 0 ? "published" : "draft"} />
      </div>

      <div className="mt-4 grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Tiêu đề ảnh</span>
          <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Loại ảnh"
            name={`tour-media-type-${tourId}`}
            onValueChange={setMediaType}
            options={[
              { label: "image", value: "image" },
              { label: "cover", value: "cover" },
              { label: "gallery", value: "gallery" },
            ]}
            placeholder="Chọn loại ảnh"
            value={mediaType}
          />
          <SwitchField checked={isCover} className="md:self-end" label="Đặt làm ảnh đại diện" name={`tour-media-is-cover-${tourId}`} onCheckedChange={setIsCover} />
        </div>
        <ImageDropzone disabled={uploadMutation.isPending} file={selectedFile} label="Chọn file ảnh" onFileChange={setSelectedFile} />
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950"
          disabled={uploadMutation.isPending || !selectedFile}
          onClick={() => uploadMutation.mutate()}
          type="button"
        >
          <FiSave size={17} />
          Tải ảnh lên
        </button>
      </div>

      {tour?.coverImageUrl ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            Ảnh đại diện hiện tại
          </div>
          <Image alt={tour.title} className="h-52 w-full object-cover" height={208} src={tour.coverImageUrl} width={512} />
        </div>
      ) : null}

      {media.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={mediaQuery.isLoading ? "Đang tải ảnh..." : "Chưa có ảnh nào cho tour này."} />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {media.map((item) => {
            const isCurrentCover = item.mediaUrl === coverImageUrl;

            return (
              <article className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800" key={item.mediaId}>
                <Image alt={item.title ?? tour?.title ?? "Tour media"} className="h-40 w-full object-cover" height={160} src={item.thumbnailUrl} width={320} />
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-neutral-50">{item.title ?? "Ảnh tour"}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{item.mediaType}</p>
                    </div>
                    {isCurrentCover ? <StatusPill value="published" /> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900" disabled={setCoverMutation.isPending || isCurrentCover} onClick={() => setCoverMutation.mutate(item.mediaId)} type="button">
                      <FiStar size={14} />
                      Đặt làm ảnh đại diện
                    </button>
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(item.mediaId)} type="button">
                      <FiTrash2 size={14} />
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </InternalPanel>
  );
}
