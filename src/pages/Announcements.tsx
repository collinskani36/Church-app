import { useState, useEffect } from "react";
import { Megaphone, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

interface Announcement {
  id: string;
  title: string;
  titleSw?: string;
  body: string;
  bodySw?: string;
  createdAt?: any;
}

const Announcements = () => {
  const { language, t } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Announcement[];
      setItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getTitle = (a: Announcement) =>
    language === "sw" && a.titleSw?.trim() ? a.titleSw : a.title;

  const getBody = (a: Announcement) =>
    language === "sw" && a.bodySw?.trim() ? a.bodySw : a.body;

  const formatDate = (ts: any) => {
    if (!ts?.toDate) return "";
    return new Date(ts.toDate()).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div className="animate-fade-in px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Megaphone className="h-5 w-5 text-accent" />
        <h2 className="font-display text-xl font-bold text-foreground">
          {t("Announcements", "Matangazo")}
        </h2>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              {t("Loading announcements...", "Inapakia matangazo...")}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground mb-1">
              {t("No announcements yet", "Hakuna matangazo bado")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Check back soon", "Angalia tena baadaye")}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isOpen = expanded === item.id;
            const hasSwahili = !!(item.titleSw?.trim() || item.bodySw?.trim());

            return (
              <div key={item.id} className="rounded-xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                    <Megaphone className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {getTitle(item)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
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

                {isOpen && (
                  <div className="px-4 pb-4 animate-fade-in">
                    <div className="border-t border-border pt-3">
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                        {getBody(item)}
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

export default Announcements;