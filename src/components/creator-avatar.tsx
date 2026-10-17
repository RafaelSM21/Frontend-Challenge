import { useState } from "react";

type CreatorAvatarProps = {
  name: string;
  avatar?: string;
  className?: string;
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0]![0]}${parts[1]![0]}`.toLocaleUpperCase();
  }

  return (parts[0]?.slice(0, 2) || "?").toLocaleUpperCase();
}

export function CreatorAvatar({
  name,
  avatar,
  className = "",
}: CreatorAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getInitials(name);

  return (
    <div className={`creator-avatar ${className}`} aria-hidden="true">
      <span>{initials}</span>
      {avatar && !imageFailed && (
        <img src={avatar} alt="" onError={() => setImageFailed(true)} />
      )}
    </div>
  );
}
