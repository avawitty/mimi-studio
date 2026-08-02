import React from "react";
import { useUser } from "../contexts/UserContext";
import { RipPublicPage } from "./RipPublicPage";

interface RipPublicRouteProps {
  handle: string;
  navigate: (path: string) => void;
}

export const RipPublicRoute: React.FC<RipPublicRouteProps> = ({ handle, navigate }) => {
  const { user, profile } = useUser();
  const normalizedHandle = handle.trim().toLowerCase();
  const isOwner =
    Boolean(user?.uid) &&
    (profile?.handle?.toLowerCase() === normalizedHandle ||
      (!profile?.handle && profile?.uid === user?.uid));

  return (
    <RipPublicPage
      handle={normalizedHandle}
      navigate={navigate}
      isOwner={isOwner}
    />
  );
};
