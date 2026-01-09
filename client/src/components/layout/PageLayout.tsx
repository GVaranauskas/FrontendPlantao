import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useLocation } from "wouter";
import { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  showBackButton?: boolean;
}

export function PageLayout({ title, children, actions, showBackButton = true }: PageLayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-card border-b-4 border-primary sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/modules")}
                data-testid="button-home"
              >
                <Home className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <main className="container mx-auto p-6">{children}</main>
    </div>
  );
}
