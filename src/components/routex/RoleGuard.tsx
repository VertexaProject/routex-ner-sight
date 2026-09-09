import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type UserRole, getAuthSession } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  allowedRole: UserRole;
  children: ReactNode;
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const session = user || getAuthSession();

    if (!session) {
      // Unauthenticated -> redirect to login
      navigate({ to: "/" });
      return;
    }

    if (session.role !== allowedRole) {
      // Unauthorized role -> redirect to their authorized dashboard
      navigate({ to: session.dashboardPath });
      return;
    }

    setIsChecking(false);
  }, [user, allowedRole, navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Verifying RouteX Security Clearance...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
