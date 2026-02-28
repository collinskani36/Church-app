import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Calendar, BookOpen, BookMarked, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubReading {
  type: string;
  typeSw: string;
  reference: string;
  text: string;
  textSw: string;
}

interface DailyReading {
  id: string;
  date: string;        // "YYYY-MM-DD"
  season: string;
  seasonSw: string;
  seasonColor: string;
  title: string;
  titleSw: string;
  readings: SubReading[];
  createdAt?: any;
}

// ─── Colour maps ──────────────────────────────────────────────────────────────

const seasonColorMap: Record<string, string> = {
  green:  "bg-liturgical-green",
  purple: "bg-liturgical-purple",
  white:  "bg-secondary",
  red:    "bg-liturgical-red",
  rose:   "bg-liturgical-rose",
};

const seasonTextMap: Record<string, string> = {
  green:  "text-liturgical-green",
  purple: "text-liturgical-purple",
  white:  "text-foreground",
  red:    "text-liturgical-red",
  rose:   "text-liturgical-rose",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split("T")[0];

const friendlyDate = (dateStr: string): string => {
  const today = todayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  if (dateStr === today)       return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";

  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

const splitReadings = (readings: DailyReading[]) => {
  const today = todayStr();
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((r) => r.date >= today);
  const past     = sorted.filter((r) => r.date <  today).reverse();
  return { upcoming, past };
};

// ─── Component ────────────────────────────────────────────────────────────────

const Readings = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [expandedReading, setExpandedReading] = useState<string | null>(null);
  const [allReadings, setAllReadings] = useState<DailyReading[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailyReading | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "readings"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DailyReading[];

      setAllReadings(data);

      const today = todayStr();
      const todayEntry = data.find((r) => r.date === today);
      const upcoming   = data.filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
      const fallback   = [...data].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
      setSelectedDay(todayEntry ?? upcoming[0] ?? fallback);

      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const { upcoming, past } = splitReadings(allReadings);

  const selectDay = (day: DailyReading) => {
    setSelectedDay(day);
    setExpandedReading(null);
  };

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-fade-in px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-bold text-foreground">
            {t("Daily Mass Readings", "Masomo ya Misa ya Leo")}
          </h2>
        </div>
        <div className="text-center py-12">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">
            {t("Loading readings…", "Inapakia masomo…")}
          </p>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (allReadings.length === 0) {
    return (
      <div className="animate-fade-in px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-bold text-foreground">
            {t("Daily Mass Readings", "Masomo ya Misa ya Leo")}
          </h2>
        </div>

        {/* Bible shortcut even when no readings posted */}
        <button
          onClick={() => navigate("/bible")}
          className="w-full flex items-center gap-3 rounded-xl bg-card border border-border p-4 mb-5 hover:border-accent hover:shadow-liturgical transition"
        >
          <BookMarked className="h-5 w-5 text-liturgical-purple shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">{t("Read the Bible", "Soma Biblia")}</p>
            <p className="text-xs text-muted-foreground">{t("KJV • All 66 books", "KJV • Vitabu 66 vyote")}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="text-center py-8">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground mb-1">
            {t("No readings yet", "Hakuna masomo bado")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Check back soon", "Angalia tena baadaye")}
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in px-4 py-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-bold text-foreground">
            {t("Daily Mass Readings", "Masomo ya Misa ya Leo")}
          </h2>
        </div>

        {/* Bible shortcut button */}
        <button
          onClick={() => navigate("/bible")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent transition text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <BookMarked className="h-3.5 w-3.5 text-liturgical-purple" />
          {t("Bible", "Biblia")}
        </button>
      </div>

      {/* ── Upcoming days strip ─────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <div className="mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {t("Upcoming", "Zinazokuja")}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {upcoming.map((day) => {
              const isToday    = day.date === todayStr();
              const isSelected = selectedDay?.id === day.id;
              return (
                <button
                  key={day.id}
                  onClick={() => selectDay(day)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-left border transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {isToday && (
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${
                      isSelected ? "text-primary-foreground/70" : "text-accent"
                    }`}>
                      {t("Today", "Leo")}
                    </p>
                  )}
                  <p className="text-xs font-semibold">{friendlyDate(day.date)}</p>
                  <p className={`text-[10px] mt-0.5 truncate max-w-[110px] ${
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}>
                    {day.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Past readings (collapsible) ─────────────────────────────────────── */}
      {past.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
          >
            {showPast
              ? <ChevronUp className="h-3 w-3" />
              : <ChevronDown className="h-3 w-3" />}
            {t(`${past.length} past reading${past.length > 1 ? "s" : ""}`,
               `Masomo ${past.length} ya nyuma`)}
          </button>
          {showPast && (
            <div className="flex gap-2 overflow-x-auto pb-2 mt-1.5 scrollbar-hide">
              {past.map((day) => {
                const isSelected = selectedDay?.id === day.id;
                return (
                  <button
                    key={day.id}
                    onClick={() => selectDay(day)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-left border transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-xs font-semibold">{friendlyDate(day.date)}</p>
                    <p className={`text-[10px] mt-0.5 truncate max-w-[110px] ${
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}>
                      {day.title}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Selected day detail ─────────────────────────────────────────────── */}
      {selectedDay && (
        <>
          {/* Season badge */}
          <div className="rounded-lg bg-card border border-border p-3 mb-3 flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full shrink-0 ${seasonColorMap[selectedDay.seasonColor] ?? "bg-secondary"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {t("Liturgical Season", "Msimu wa Liturujia")}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {t(selectedDay.season, selectedDay.seasonSw)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground shrink-0">{selectedDay.date}</p>
          </div>

          {/* Day title */}
          <p className="text-sm font-semibold text-foreground mb-3 leading-snug">
            {t(selectedDay.title, selectedDay.titleSw)}
          </p>

          {/* Sub-readings accordion */}
          <div className="space-y-3">
            {selectedDay.readings && selectedDay.readings.length > 0 ? (
              selectedDay.readings.map((reading, index) => {
                const key    = `${selectedDay.id}-${index}`;
                const isOpen = expandedReading === key;
                return (
                  <div key={key} className="rounded-xl bg-card border border-border overflow-hidden">
                    <button
                      onClick={() => setExpandedReading(isOpen ? null : key)}
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="text-left flex-1 min-w-0">
                        <p className={`text-xs font-medium uppercase tracking-wide ${
                          seasonTextMap[selectedDay.seasonColor] ?? "text-accent"
                        }`}>
                          {t(reading.type, reading.typeSw)}
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                          {reading.reference}
                        </p>
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
                            {t(reading.text, reading.textSw)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("No readings for this day", "Hakuna masomo ya siku hii")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Readings;