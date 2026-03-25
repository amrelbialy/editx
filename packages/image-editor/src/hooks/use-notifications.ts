import { useCallback, useMemo } from "react";
import { toast } from "sonner";

export interface EditorNotifications {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export function useNotifications(): EditorNotifications {
  const success = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const error = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const info = useCallback((message: string) => {
    toast.info(message);
  }, []);

  return useMemo(() => ({ success, error, info }), [success, error, info]);
}
