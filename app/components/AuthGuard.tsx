import { useAtom } from "jotai";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { isAuthenticatedAtom } from "~/states";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const [isAuthenticated] = useAtom(isAuthenticatedAtom);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null; // または適切なローディング表示
  }

  return <>{children}</>;
};
