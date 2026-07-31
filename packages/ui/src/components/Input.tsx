import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ className = "", label, error, id, ...props }: InputProps) {
    const inputProps = id ? { ...props, id } : props;

    return (
        <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
            {label ? <span>{label}</span> : null}
            <input
                className={[
                    "rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition",
                    "placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
                    error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "",
                    className
                ].join(" ")}
                {...inputProps}
            />
            {error ? <span className="text-xs font-normal text-rose-600">{error}</span> : null}
        </label>
    );
}