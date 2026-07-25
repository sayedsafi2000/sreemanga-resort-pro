import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow",
        /** Room / day-long bookings — frequent ops */
        booking:
          "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow",
        /** Catalog: day-long products, menu items */
        product:
          "bg-violet-600 text-white shadow-sm hover:bg-violet-700 hover:shadow",
        /** Inventory items / stock */
        stock:
          "bg-teal-600 text-white shadow-sm hover:bg-teal-700 hover:shadow",
        /** Guests / people */
        guest:
          "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow",
        /** Expenses / money out */
        expense:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:shadow",
        ink:
          "bg-ink text-ink-foreground shadow-sm hover:bg-ink/90 hover:shadow",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-10 rounded-lg px-6 text-sm font-semibold",
        xl:      "h-11 rounded-xl px-8 text-base font-semibold",
        icon:    "h-8 w-8",
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
