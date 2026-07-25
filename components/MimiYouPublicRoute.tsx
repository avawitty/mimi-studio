import React from "react";
import { useUser } from "../contexts/UserContext";
import { PublicShowcasePage } from "./PublicShowcasePage";

interface MimiYouPublicRouteProps {
  handle: string;
  navigate: (path: string) => void;
}

export const MimiYouPublicRoute: React.FC<MimiYouPublicRouteProps> = ({ handle, navigate }) => {
  const { user, profile } = useUser();
  const normalizedHandle = handle.trim().toLowerCase();
  const isOwner =
    Boolean(user?.uid) &&
    (profile?.handle?.toLowerCase() === normalizedHandle ||
      (!profile?.handle && profile?.uid === user?.uid));

  return (
    <PublicShowcasePage
      handle={normalizedHandle}
      navigate={navigate}
      isOwner={isOwner}
    />
  );
};
