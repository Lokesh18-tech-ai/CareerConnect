import { toast } from "@/hooks/use-toast";

export const notify = {
  success: (title: string, description?: string) =>
    toast({ variant: "success", title, description }),
  error: (title: string, description?: string) =>
    toast({ variant: "destructive", title, description }),
  warning: (title: string, description?: string) =>
    toast({ variant: "warning", title, description }),
  info: (title: string, description?: string) =>
    toast({ variant: "info", title, description }),
};
