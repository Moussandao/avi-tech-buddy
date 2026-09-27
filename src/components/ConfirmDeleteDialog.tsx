import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { useSettings } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ConfirmDeleteDialog({
  trigger,
  title,
  description,
  onConfirm,
}: {
  trigger: ReactNode;
  title?: string;
  description?: ReactNode;
  onConfirm: () => void;
}) {
  const { t } = useSettings();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t("confirmDeleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? t("confirmDeleteDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-12">{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }), "h-12")}
            onClick={onConfirm}
          >
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
