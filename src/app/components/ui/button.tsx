import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", isLoading, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileHover={{ y: -2, x: -2, boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
        whileTap={{ y: 0, x: 0, boxShadow: "0px 0px 0px 0px rgba(0,0,0,1)" }}
        className={cn(
          "inline-flex items-center justify-center border-2 border-black font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white select-none",
          // Base shadow for 3D effect
          "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
          {
            "bg-[#7000FF] text-white hover:bg-[#8020FF]": variant === "primary",
            "bg-white text-black hover:bg-gray-50": variant === "secondary",
            "bg-transparent hover:bg-black/5 shadow-none hover:shadow-none border-transparent hover:border-black/10": variant === "ghost",
            "bg-[#FF0055] text-white hover:bg-[#FF2066]": variant === "destructive",
            
            "h-10 px-4 text-xs": size === "sm",
            "h-12 px-6 text-sm": size === "default",
            "h-16 px-10 text-lg": size === "lg",
            "h-12 w-12": size === "icon",
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button };
