import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-white hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-white/10 bg-transparent hover:bg-white/5",
        success:
          "border-transparent bg-success/15 text-success border-success/40",
        warning:
          "border-transparent bg-warning/10 text-warning border-warning/20",
        danger:
          "border-transparent bg-danger/15 text-danger border-danger/40",
        team:
          "font-mono rounded-md border-white/10 bg-secondary text-primary px-2 py-0.5",
        red:
          "border-danger/40 bg-danger/15 text-danger",
        blue:
          "border-primary/40 bg-primary/15 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }