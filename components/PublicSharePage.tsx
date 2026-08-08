import { useEffect } from "react";

/**
 * Legacy /@:handle route — redirect to canonical /u/:handle showcase (fail closed on taste leakage).
 */
export const PublicSharePage: React.FC = () => {
  useEffect(() => {
    const handle = window.location.pathname.split("/@")[1]?.split("/")[0]?.trim();
    if (handle) {
      const normalized = handle.toLowerCase().replace(/^@/, "");
      window.location.replace(`/u/${normalized}`);
    } else {
      window.location.replace("/");
    }
  }, []);

  return null;
};
