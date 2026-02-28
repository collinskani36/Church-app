import { ReactNode } from "react";
import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
};

export default Layout;
