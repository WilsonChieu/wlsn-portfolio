import { toast } from "sonner";
import type { ToastMessage } from "@/lib/admin-messages";

// Errors stay up longer than confirmations: they're the ones you need time to read and act on.
export const ERROR_TOAST_MS = 7000;

export function showToast({ type, title, description }: ToastMessage): void {
  if (type === "error") toast.error(title, { description, duration: ERROR_TOAST_MS });
  else if (type === "warning") toast.warning(title, { description, duration: ERROR_TOAST_MS });
  else toast.success(title, { description });
}
