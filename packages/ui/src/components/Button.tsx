import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-slate-950 text-white shadow-sm hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-950 hover:bg-slate-200",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-500"
};

export function Button({ className = "", variant = "primary", children, ...props }: PropsWithChildren<ButtonProps>) {
    return (
        <button
            className={[
                "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition",
                "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                variantClasses[variant],
                className
            ].join(" ")}
            {...props}
        >
            {children}
        </button>
    );
}