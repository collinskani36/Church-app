import { useState, useEffect } from "react";
import { Heart, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

interface Prayer {
  id: string;
  title: string;
  titleSw?: string;
  content: string;
  contentSw?: string;
  createdAt?: any;
}

const Prayers = () => {
  const { language, t } = useLanguage();
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "prayers"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Prayer[];
      setPrayers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Resolve the correct text based on active language and whether SW exists
  const getTitle = (prayer: Prayer) => {
    if (language === "sw" && prayer.titleSw?.trim()) return prayer.titleSw;
    return prayer.title;
  };

  const getContent = (prayer: Prayer) => {
    if (language === "sw" && prayer.contentSw?.trim()) return prayer.contentSw;
    return prayer.content;
  };

  return (
    <div className="animate-fade-in px-4 py-4">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">
        {t("Prayer Corner", "Kona ya Sala")}
      </h2>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              {t("Loading prayers...", "Inapakia sala...")}
            </p>
          </div>
        ) : prayers.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground mb-1">
              {t("No prayers yet", "Hakuna sala bado")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Check back soon", "Angalia tena baadaye")}
            </p>
          </div>
        ) : (
          prayers.map((prayer) => {
            const isOpen = expandedPrayer === prayer.id;
            const hasSwahili = !!(prayer.titleSw?.trim() || prayer.contentSw?.trim());

            return (
              <div key={prayer.id} className="rounded-xl bg-card border border-border overflow-hidden">

                {/* ── Accordion header ── */}
                <button
                  onClick={() => setExpandedPrayer(isOpen ? null : prayer.id)}
                  className="w-full flex items-center gap-3 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                    <Heart className="h-5 w-5 text-liturgical-red" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {getTitle(prayer)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {prayer.createdAt?.toDate?.()
                          ? new Date(prayer.createdAt.toDate()).toLocaleDateString()
                          : ""}
                      </p>
                      {/* Show SW badge only if Swahili content exists */}
                      {hasSwahili && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-primary/70 border border-primary/20 rounded px-1 py-0.5">
                          <Globe className="h-2.5 w-2.5" />
                          SW
                        </span>
                      )}
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {/* ── Expanded content ── */}
                {isOpen && (
                  <div className="px-4 pb-4 animate-fade-in">
                    <div className="border-t border-border pt-3">
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                        {getContent(prayer)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Prayers;