"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiXCircle } from "react-icons/fi";

export type ToastVariant = "error" | "info" | "success" | "warning";

export type ToastState = {
  message: string;
  title: string;
  variant: ToastVariant;
};

type ToastInput = ToastState & {
  autoCloseMs?: number;
};

type ToastContextValue = {
  dismissToast: () => void;
  showToast: (toast: ToastInput) => void;
};

type ToastViewportProps = {
  autoCloseMs?: number;
  onClose: () => void;
  toast: ToastState | null;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<
  ToastVariant,
  {
    accent: string;
    icon: ReactNode;
    panel: string;
    title: string;
  }
> = {
  success: {
    accent: "bg-emerald-500",
    icon: <FiCheckCircle size={22} />,
    panel: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
    title: "text-emerald-900 dark:text-emerald-50",
  },
  error: {
    accent: "bg-rose-500",
    icon: <FiXCircle size={22} />,
    panel: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100",
    title: "text-rose-900 dark:text-rose-50",
  },
  warning: {
    accent: "bg-amber-500",
    icon: <FiAlertTriangle size={22} />,
    panel: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
    title: "text-amber-900 dark:text-amber-50",
  },
  info: {
    accent: "bg-sky-500",
    icon: <FiInfo size={22} />,
    panel: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100",
    title: "text-sky-900 dark:text-sky-50",
  },
};

function ToastViewport({ autoCloseMs = 3600, onClose, toast }: ToastViewportProps) {
  const [isShown, setIsShown] = useState(false);

  const handleClose = useCallback(() => {
    setIsShown(false);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => setIsShown(true));
    const timeoutId = window.setTimeout(handleClose, autoCloseMs);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [autoCloseMs, handleClose, toast]);

  if (!toast) {
    return null;
  }

  const styles = variantStyles[toast.variant];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
      <div
        className={`pointer-events-auto grid w-full max-w-md grid-cols-[4px_1fr_auto] overflow-hidden rounded-2xl border shadow-2xl shadow-slate-900/15 transition-all duration-300 ease-out dark:shadow-black/40 ${styles.panel} ${
          isShown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        role="status"
      >
        <div className={styles.accent} />
        <div className="flex gap-3 px-4 py-4">
          <div className="mt-0.5 shrink-0">{styles.icon}</div>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${styles.title}`}>{toast.title}</p>
            <p className="mt-1 text-sm leading-5">{toast.message}</p>
          </div>
        </div>
        <button
          aria-label="Đóng thông báo"
          className="m-2 flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          onClick={handleClose}
          type="button"
        >
          <FiX size={17} />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastInput | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((nextToast: ToastInput) => {
    setToast(nextToast);
  }, []);
  const value = useMemo(
    () => ({
      dismissToast,
      showToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport
        autoCloseMs={toast?.autoCloseMs}
        onClose={dismissToast}
        toast={toast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return value;
}
