import { Home, BookOpen, Music, Church, Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const navItems = [
  { path: "/", icon: Home, labelEn: "Home", labelSw: "Nyumbani" },
  { path: "/readings", icon: BookOpen, labelEn: "Readings", labelSw: "Masomo" },
  { path: "/hymns", icon: Music, labelEn: "Hymns", labelSw: "Nyimbo" },
  { path: "/prayers", icon: Heart, labelEn: "Prayers", labelSw: "Sala" },
  { path: "/parish", icon: Church, labelEn: "Parish", labelSw: "Parokia" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Hide nav entirely on admin page
  if (location.pathname === "/admin") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">
                {t(item.labelEn, item.labelSw)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;