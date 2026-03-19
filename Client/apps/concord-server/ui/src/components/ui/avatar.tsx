import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline";
}

const sizeClasses = {
  xs: "h-4 w-4 text-[8px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-16 w-16 text-lg",
};

const statusDotSize = {
  xs: "w-2 h-2 -bottom-0.5 -right-0.5 border",
  sm: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-[1.5px]",
  md: "w-3 h-3 -bottom-0.5 -right-0.5 border-2",
  lg: "w-3.5 h-3.5 -bottom-0.5 -right-0.5 border-2",
  xl: "w-4 h-4 bottom-0 right-0 border-2",
};

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name = "?", size = "md", status, ...props }, ref) => {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div ref={ref} className={cn("relative inline-flex shrink-0", className)} {...props}>
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full font-medium text-white",
            sizeClasses[size],
          )}
          style={{ backgroundColor: hashColor(name) }}
        >
          {initials}
        </div>
        {status && (
          <div
            className={cn(
              "absolute rounded-full border-popover",
              statusDotSize[size],
              status === "online" ? "bg-identity" : "bg-muted-foreground/50"
            )}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
