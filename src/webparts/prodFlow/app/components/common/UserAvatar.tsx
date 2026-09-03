import * as React from "react";
import { useSpfxContext } from "../../config/SpfxContext";
import styles from "./UserAvatar.module.scss";

const AVATAR_COLORS = [
  "#0072ce",
  "#00b4e6",
  "#003b5c",
  "#7c3aed",
  "#db2777",
  "#ff8a00",
  "#10b981",
];

export function getInitials(name: string): string {
  return (name || "")
    .split(" ")
    .filter((p) => !!p)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export interface IUserAvatarProps {
  name: string;
  email?: string;
  size?: number;
  /** SharePoint photo size bucket: S (48px), M (72px), L (300px). */
  photoSize?: "S" | "M" | "L";
  className?: string;
}

// Photos are resolved from SharePoint on every render pass — never persisted as base64.
export const UserAvatar: React.FC<IUserAvatarProps> = ({
  name,
  email,
  size = 40,
  photoSize = "M",
  className,
}) => {
  const spfxContext = useSpfxContext();
  const [failed, setFailed] = React.useState(false);

  const src = React.useMemo(() => {
    if (!email) return "";
    return `${spfxContext.pageContext.web.absoluteUrl}/_layouts/15/userphoto.aspx?size=${photoSize}&username=${encodeURIComponent(email)}`;
  }, [spfxContext, email, photoSize]);

  React.useEffect(() => setFailed(false), [src]);

  return (
    <span
      className={`${styles.avatar} ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        background: src && !failed ? undefined : getAvatarColor(name),
      }}
      title={name}
    >
      {src && !failed ? (
        <img src={src} alt={name} onError={() => setFailed(true)} />
      ) : (
        getInitials(name)
      )}
    </span>
  );
};

export default UserAvatar;
