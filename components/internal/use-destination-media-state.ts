"use client";

import { useEffect, useRef, useState } from "react";

export type DraftMediaItem = {
  file: File;
  id: string;
  isCover: boolean;
  previewUrl: string;
};

export function useDestinationMediaState() {
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [isCover, setIsCover] = useState(true);
  const [selectedFile, setSelectedFileState] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string | null>(null);
  const [draftMediaItems, setDraftMediaItems] = useState<DraftMediaItem[]>([]);
  const draftMediaItemsRef = useRef<DraftMediaItem[]>([]);

  const setSelectedFile = (nextFile: File | null) => {
    setSelectedFileState(nextFile);
    setSelectedFilePreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return nextFile ? URL.createObjectURL(nextFile) : null;
    });
  };

  const addDraftMediaItems = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setDraftMediaItems((currentItems) => {
      const nextItems = files.map((file, index) => ({
        file,
        id: crypto.randomUUID(),
        isCover: currentItems.length === 0 && index === 0,
        previewUrl: URL.createObjectURL(file),
      }));

      return [...currentItems, ...nextItems];
    });
  };

  const removeDraftMediaItem = (itemId: string) => {
    setDraftMediaItems((currentItems) => {
      const itemToRemove = currentItems.find((item) => item.id === itemId);

      if (!itemToRemove) {
        return currentItems;
      }

      URL.revokeObjectURL(itemToRemove.previewUrl);

      const nextItems = currentItems.filter((item) => item.id !== itemId);

      if (itemToRemove.isCover && nextItems.length > 0) {
        nextItems[0] = {
          ...nextItems[0],
          isCover: true,
        };
      }

      return nextItems;
    });
  };

  const clearDraftMediaItems = () => {
    setDraftMediaItems((currentItems) => {
      for (const item of currentItems) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return [];
    });
  };

  const resetMediaFields = () => {
    setMediaTitle("");
    setMediaType("image");
    setIsCover(true);
    setSelectedFile(null);
  };

  const setDraftMediaCover = (itemId: string) => {
    setDraftMediaItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        isCover: item.id === itemId,
      })),
    );
  };

  useEffect(() => {
    draftMediaItemsRef.current = draftMediaItems;
  }, [draftMediaItems]);

  useEffect(
    () => () => {
      for (const item of draftMediaItemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );

  useEffect(
    () => () => {
      if (selectedFilePreviewUrl) {
        URL.revokeObjectURL(selectedFilePreviewUrl);
      }
    },
    [selectedFilePreviewUrl],
  );

  return {
    addDraftMediaItems,
    clearDraftMediaItems,
    draftMediaItems,
    draftMediaItemsRef,
    isCover,
    mediaTitle,
    mediaType,
    removeDraftMediaItem,
    resetMediaFields,
    selectedFile,
    selectedFilePreviewUrl,
    setDraftMediaCover,
    setIsCover,
    setMediaTitle,
    setMediaType,
    setSelectedFile,
  } as const;
}
