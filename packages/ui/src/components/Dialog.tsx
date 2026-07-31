import { createPortal } from "react-dom";
import type { PropsWithChildren } from "react";
import { Button } from "./Button";

interface DialogProps {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
}

export function Dialog({ open, title, description, onClose, children }: PropsWithChildren<DialogProps>) {
    if (!open || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
                        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
                    </div>
                    <Button variant="ghost" onClick={onClose} aria-label="Close dialog" type="button">
                        Close
                    </Button>
                </div>
                <div className="mt-6">{children}</div>
            </div>
        </div>,
        document.body
    );
}