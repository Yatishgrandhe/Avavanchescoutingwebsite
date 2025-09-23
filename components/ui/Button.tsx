import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium font-inter transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-avalanche-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg hover:from-blue-700 hover:to-indigo-800 hover:shadow-xl transform hover:scale-105",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:from-red-700 hover:to-red-800 hover:shadow-xl transform hover:scale-105",
        outline:
          "border border-slate-600 bg-slate-800/50 text-slate-200 shadow-sm hover:bg-slate-700/50 hover:text-white",
        secondary:
          "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm hover:from-gray-200 hover:to-gray-300 hover:shadow-md",
        ghost: "text-slate-300 hover:bg-slate-700/50 hover:text-white",
        link: "text-avalanche-600 underline-offset-4 hover:underline hover:text-avalanche-700",
        avalanche:
          "bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 text-white shadow-lg hover:from-blue-600 hover:via-indigo-700 hover:to-purple-800 hover:shadow-xl transform hover:scale-105",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
