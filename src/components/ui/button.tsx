import clsx from "clsx";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger" | "whatsapp" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-[background,color,border-color,transform] duration-150 disabled:opacity-60 disabled:pointer-events-none select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-brand-strong text-on-fill hover:bg-brand-dark",
  dark: "bg-ink text-on-fill hover:bg-ink-soft",
  outline: "border border-line-strong bg-surface text-ink hover:border-ink",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-danger text-on-fill hover:bg-[#8f1c13] dark:hover:bg-[#f99d94]",
  whatsapp: "bg-whatsapp text-white hover:bg-[#0d6e3a]",
  soft: "bg-brand-soft text-brand-dark hover:bg-brand-soft-hover",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-6 text-[15px]",
  icon: "h-10 w-10 p-0",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return twMerge(clsx(base, variants[variant], sizes[size], className));
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant, size, loading, icon, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode };

export function ButtonLink({ variant, size, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

type ExternalButtonProps = ComponentProps<"a"> & { variant?: Variant; size?: Size; icon?: ReactNode };

export function ExternalButton({ variant, size, icon, className, children, ...props }: ExternalButtonProps) {
  return (
    <a className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </a>
  );
}
