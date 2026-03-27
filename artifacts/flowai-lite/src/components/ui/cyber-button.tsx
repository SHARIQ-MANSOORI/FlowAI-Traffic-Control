import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface CyberButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
}

const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant = "primary", size = "default", loading, children, ...props }, ref) => {
    
    const variants = {
      primary: "bg-primary/10 text-primary border border-primary/50 hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_15px_rgba(0,255,255,0.4)]",
      destructive: "bg-destructive/10 text-destructive border border-destructive/50 hover:bg-destructive/20 hover:border-destructive hover:shadow-[0_0_15px_rgba(255,50,50,0.4)]",
      outline: "bg-transparent text-foreground border border-white/20 hover:bg-white/5 hover:border-white/40",
      ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5",
    };

    const sizes = {
      sm: "h-9 px-4 text-xs",
      default: "h-11 px-6 text-sm",
      lg: "h-14 px-8 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg font-mono font-medium transition-all duration-200 uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none overflow-hidden",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Tech decorative corners */}
        {variant !== "ghost" && (
          <>
            <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-current opacity-50" />
            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-current opacity-50" />
          </>
        )}
        
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            PROCESSING...
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
CyberButton.displayName = "CyberButton";

export { CyberButton };
