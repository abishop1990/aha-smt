import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

function getInitials(name: string | undefined): string {
  if (!name || name.trim() === "") return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

export function UserAvatar({ name, avatarUrl, size = "md", className }: UserAvatarProps) {
  const displayName = name || "Unknown";

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={displayName}
        width={40}
        height={40}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary-muted text-primary flex items-center justify-center font-medium",
        sizeClasses[size],
        className
      )}
      title={displayName}
    >
      {getInitials(name)}
    </div>
  );
}
