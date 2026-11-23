"use client";

import React, { useEffect, useRef } from "react";

let supportsDisplayTransitionCache: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (supportsDisplayTransitionCache !== undefined) return supportsDisplayTransitionCache;
  if (
    typeof window === "undefined" ||
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransitionCache = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransitionCache;
}

function supportsTopLayerExit(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.CSS?.supports?.("overlay", "auto")) &&
    canTransitionDisplay()
  );
}

interface ModalDialogProps {
  variant?: "modal" | "drawer";
  isOpen: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  maxWidthClass?: string;
  className?: string;
  children: React.ReactNode;
}

export default function ModalDialog({
  variant = "modal",
  isOpen,
  onClose,
  ariaLabelledBy,
  ariaLabel,
  maxWidthClass = variant === "drawer" ? "max-w-xl" : "max-w-2xl",
  className = "",
  children,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const isOpenRef = useRef(isOpen);
  onCloseRef.current = onClose;
  isOpenRef.current = isOpen;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let cancelled = false;

    const closeTopLayer = async () => {
      if (!dialog.open) return;
      if (!supportsTopLayerExit()) {
        dialog.setAttribute("data-closing", "");
        const animations = dialog.getAnimations({ subtree: true });
        if (animations.length > 0) {
          await Promise.race([
            Promise.allSettled(animations.map((a) => a.finished)),
            new Promise((resolve) => setTimeout(resolve, 350)),
          ]);
        }
        if (cancelled || !dialog.hasAttribute("data-closing")) return;
        dialog.removeAttribute("data-closing");
      }
      if (!cancelled && dialog.open) {
        dialog.close();
      }
    };

    if (isOpen) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      closeTopLayer();
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };

    const handleNativeClose = () => {
      if (isOpenRef.current) {
        onCloseRef.current();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleNativeClose);

    // Safari / browsers without closedby="any" fallback: test press & release outside dialog rect
    let removePointerListeners: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const handlePointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const handlePointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          onCloseRef.current();
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
      removePointerListeners = () => {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleNativeClose);
      removePointerListeners?.();
    };
  }, []);

  const baseVariantClass =
    variant === "drawer"
      ? "gasline-dialog gasline-dialog--drawer"
      : "gasline-dialog gasline-dialog--modal";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={ariaLabelledBy}
      aria-label={!ariaLabelledBy ? ariaLabel : undefined}
      {...({ closedby: "any" } as Record<string, string>)}
      className={`${baseVariantClass} ${maxWidthClass} ${className}`}
    >
      {children}
    </dialog>
  );
}
