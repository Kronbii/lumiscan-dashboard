import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold tracking-[0.01em] transition-colors duration-100 outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-[0.5px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]",
        secondary:
          "border border-border-strong bg-surface text-foreground hover:border-faint hover:bg-surface-2",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-surface-2",
        ghost: "text-muted hover:bg-surface-3 hover:text-foreground",
        soft: "bg-primary-soft text-primary-soft-foreground hover:brightness-[0.97]",
        /* Border-only: filled red is reserved for malignancy. */
        danger:
          "border border-malignant-border bg-surface text-malignant hover:bg-malignant-soft",
        /* Final confirm step only. */
        dangerSolid: "bg-malignant text-white hover:bg-malignant-ink",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-[0.8125rem] [&_svg]:size-3.5",
        default: "h-9 px-4 text-[0.8125rem] [&_svg]:size-4",
        lg: "h-10 px-5 text-sm [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { buttonVariants };
