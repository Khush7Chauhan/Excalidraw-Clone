import type { PropsWithChildren } from "react";

interface FloatingToolbarProps {
    className?: string;
}

export function FloatingToolbar({ className = "", children }: PropsWithChildren<FloatingToolbarProps>) {
    return (
        <div
            className={[
                "pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md",
                className
            ].join(" ")}
        >
            {children}
        </div>
    );
}