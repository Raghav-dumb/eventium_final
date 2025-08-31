import * as React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const Avatar = React.forwardRef(function Avatar({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

function AvatarImage({ src, alt, className }) {
  return src ? (
    <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />
  ) : null;
}

function AvatarFallback({ children, className }) {
  return (
    <span className={cn("flex h-full w-full items-center justify-center text-sm font-medium text-gray-600", className)}>
      {children}
    </span>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
