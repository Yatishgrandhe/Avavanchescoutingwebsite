import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-inter transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-avalanche-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-avalanche-500 to-avalanche-600 text-white shadow-md hover:from-avalanche-600 hover:to-avalanche-700 hover:shadow-lg",
        secondary:
          "border-transparent bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300",
        destructive:
          "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:from-red-600 hover:to-red-700 hover:shadow-lg",
        outline: "text-avalanche-700 border-avalanche-300 bg-white/10 backdrop-blur-sm hover:bg-avalanche-50",
        avalanche:
          "border-transparent bg-gradient-to-r from-avalanche-400 via-avalanche-500 to-avalanche-600 text-white shadow-md hover:from-avalanche-500 hover:via-avalanche-600 hover:to-avalanche-700 hover:shadow-lg",
        success:
          "border-transparent bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:from-green-600 hover:to-green-700 hover:shadow-lg",
        warning:
          "border-transparent bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md hover:from-yellow-600 hover:to-yellow-700 hover:shadow-lg",
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
