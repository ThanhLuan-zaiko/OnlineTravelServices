"use client";

import { useState, type SetStateAction } from "react";

import type { ToastState } from "@/components/ui/toast";
import { getInternalServiceProviderPage } from "@/lib/client/api-client";

type UseServiceProviderCursorPageInput = {
  initialServiceType: string;
  initialStatus: string;
  missingNextMessage: string;
  missingPageMessage: (page: number) => string;
  showToast: (toast: ToastState) => void;
};

export function useServiceProviderCursorPage({
  initialServiceType,
  initialStatus,
  missingNextMessage,
  missingPageMessage,
  showToast,
}: UseServiceProviderCursorPageInput) {
  const [serviceType, setServiceType] = useState(initialServiceType);
  const [status, setStatus] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(8);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [isPageJumping, setIsPageJumping] = useState(false);

  const resetPage = () => {
    setCursor(null);
    setCursorHistory([]);
  };

  const goToNextPage = (nextCursor: string | null) => {
    if (!nextCursor) {
      return;
    }

    setCursorHistory((history) => [...history, cursor]);
    setCursor(nextCursor);
  };

  const goToPreviousPage = () => {
    setCursorHistory((history) => {
      if (history.length === 0) {
        return history;
      }

      const nextHistory = history.slice(0, -1);
      setCursor(history[history.length - 1] ?? null);
      return nextHistory;
    });
  };

  const jumpToPage = async (targetPage: number, nextCursor: string | null) => {
    const currentPage = cursorHistory.length + 1;

    if (targetPage < 1 || targetPage === currentPage || isPageJumping) {
      return;
    }

    if (targetPage < currentPage) {
      setCursor(targetPage === 1 ? null : cursorHistory[targetPage - 2] ?? null);
      setCursorHistory(cursorHistory.slice(0, targetPage - 1));
      return;
    }

    if (!nextCursor) {
      showToast({
        message: missingNextMessage,
        title: "Không thể chuyển trang",
        variant: "warning",
      });
      return;
    }

    setIsPageJumping(true);

    try {
      let cursorForTargetPage = nextCursor;
      const nextHistory = [...cursorHistory, cursor];

      for (let page = currentPage + 1; page < targetPage; page += 1) {
        const response = await getInternalServiceProviderPage({
          cursor: cursorForTargetPage,
          limit: pageSize,
          q: searchQuery,
          serviceType,
          status,
        });

        if (!response.nextCursor) {
          showToast({
            message: missingPageMessage(page),
            title: "Trang không tồn tại",
            variant: "warning",
          });
          return;
        }

        nextHistory.push(cursorForTargetPage);
        cursorForTargetPage = response.nextCursor;
      }

      setCursorHistory(nextHistory);
      setCursor(cursorForTargetPage);
    } finally {
      setIsPageJumping(false);
    }
  };

  const updateServiceType = (nextServiceType: SetStateAction<string>) => {
    const resolvedServiceType = typeof nextServiceType === "function" ? nextServiceType(serviceType) : nextServiceType;

    if (resolvedServiceType !== serviceType) {
      resetPage();
    }

    setServiceType(resolvedServiceType);
  };

  const updateStatus = (nextStatus: SetStateAction<string>) => {
    const resolvedStatus = typeof nextStatus === "function" ? nextStatus(status) : nextStatus;

    if (resolvedStatus !== status) {
      resetPage();
    }

    setStatus(resolvedStatus);
  };

  const updateSearchQuery = (nextQuery: SetStateAction<string>) => {
    const resolvedQuery = typeof nextQuery === "function" ? nextQuery(searchQuery) : nextQuery;
    resetPage();
    setSearchQuery(resolvedQuery);
  };

  const updatePageSize = (nextPageSize: SetStateAction<number>) => {
    const resolvedPageSize = typeof nextPageSize === "function" ? nextPageSize(pageSize) : nextPageSize;
    resetPage();
    setPageSize(resolvedPageSize);
  };

  return {
    canGoToPreviousPage: cursorHistory.length > 0,
    cursor,
    currentPage: cursorHistory.length + 1,
    goToNextPage,
    goToPreviousPage,
    isPageJumping,
    jumpToPage,
    pageSize,
    searchQuery,
    serviceType,
    setPageSize: updatePageSize,
    setSearchQuery: updateSearchQuery,
    setServiceType: updateServiceType,
    setStatus: updateStatus,
    status,
  } as const;
}
