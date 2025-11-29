import { ReactNode } from "react";
import { TopNavbar } from "./navigation/TopNavbar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-background">
      <TopNavbar />
      <main className="pt-20">
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};