import { useState, useEffect } from "react";
import { Search, Music, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

interface Hymn {
  id: string;
  title: string;
  lyrics: string;
  createdAt?: any;
}

const Hymns = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedHymn, setExpandedHymn] = useState<string | null>(null);
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);

  // Live fetch from Firestore
  useEffect(() => {
    const q = query(collection(db, "hymns"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Hymn[];
      setHymns(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredHymns = hymns.filter((hymn) =>
    searchQuery === "" ||
    hymn.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in px-4 py-4">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">
        {t("Hymn Library", "Mkusanyiko wa Nyimbo")}
      </h2>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("Search hymns...", "Tafuta nyimbo...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg bg-card border border-border pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Hymn list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              {t("Loading hymns...", "Inapakia nyimbo...")}
            </p>
          </div>
        ) : filteredHymns.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground mb-1">
              {t("No hymns yet", "Hakuna nyimbo bado")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Check back soon", "Angalia tena baadaye")}
            </p>
          </div>
        ) : (
          filteredHymns.map((hymn) => (
            <div key={hymn.id} className="rounded-xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => setExpandedHymn(expandedHymn === hymn.id ? null : hymn.id)}
                className="w-full flex items-center gap-3 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <Music className="h-5 w-5 text-liturgical-purple" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {hymn.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hymn.createdAt?.toDate?.()
                      ? new Date(hymn.createdAt.toDate()).toLocaleDateString()
                      : ""}
                  </p>
                </div>
                {expandedHymn === hymn.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {expandedHymn === hymn.id && (
                <div className="px-4 pb-4 animate-fade-in">
                  <div className="border-t border-border pt-3">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                      {hymn.lyrics}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Hymns;