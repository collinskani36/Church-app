import { Cross } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const AppHeader = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-gold shadow-gold">
            <Cross className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-display font-semibold leading-tight text-foreground">
              {t("St. Gregory Parish", "Parokia ya Mt. Gregori")}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {t("Eldoret, Kenya", "Eldoret, Kenya")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setLanguage(language === "en" ? "sw" : "en")}
          className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-muted"
        >
          {language === "en" ? "SW" : "EN"}
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
