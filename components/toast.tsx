"use client"

import { useToast } from "@/contexts/toast-context"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"

export function ToastContainer() {
  const { toasts, hideToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-bg-panel border border-[var(--color-border)] rounded-lg shadow-xl p-4 min-w-[300px] max-w-[400px] animate-in slide-in-from-top-2 fade-in duration-300"
          style={{ backgroundColor: "rgba(20, 24, 35, 0.98)" }}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === "success" && (
                <div className="w-5 h-5 rounded-full bg-state-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-state-success" />
                </div>
              )}
              {toast.type === "error" && (
                <div className="w-5 h-5 rounded-full bg-state-error/10 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-state-error" />
                </div>
              )}
              {toast.type === "info" && (
                <div className="w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center">
                  <Info className="w-4 h-4 text-accent-blue" />
                </div>
              )}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white break-words">{toast.message}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => hideToast(toast.id)}
              className="flex-shrink-0 p-1 hover:bg-bg-elevated rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
