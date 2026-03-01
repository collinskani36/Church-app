import { BookOpen, Music, Heart, Church, Calendar, ChevronRight, X, Megaphone, BookMarked } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import heroBanner from "@/assets/hero-banner.jpg";
import { useState, useRef, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubReading {
  type: string;
  typeSw: string;
  reference: string;
}

interface DailyReading {
  id: string;
  date: string;
  season: string;
  seasonSw: string;
  seasonColor: string;
  title: string;
  titleSw: string;
  readings: SubReading[];
}

interface Announcement {
  id: string;
  title: string;
  titleSw?: string;
  body: string;
  bodySw?: string;
  createdAt?: any;
}

interface ParishInfo {
  massSunday: string;
  massWeekday: string;
  massSaturday: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const seasonColorMap: Record<string, string> = {
  green:  "bg-liturgical-green",
  purple: "bg-liturgical-purple",
  white:  "bg-secondary",
  red:    "bg-liturgical-red",
  rose:   "bg-liturgical-rose",
};

const todayStr = () => new Date().toISOString().split("T")[0];

const parseTimes = (str: string) =>
  (str || "").split(",").map((s) => s.trim()).filter(Boolean);

// ─── Component ────────────────────────────────────────────────────────────────

const Home = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // ── Admin login state ──
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Live data from Firestore ──
  const [todayReading, setTodayReading] = useState<DailyReading | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [parishInfo, setParishInfo] = useState<ParishInfo | null>(null);

  // Subscribe to readings — pick today's or nearest upcoming
  useEffect(() => {
    const q = query(collection(db, "readings"), orderBy("date", "asc"));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DailyReading[];
      const today = todayStr();
      const todayEntry  = all.find((r) => r.date === today);
      const upcoming    = all.filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
      const fallback    = [...all].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
      setTodayReading(todayEntry ?? upcoming[0] ?? fallback);
    });
  }, []);

  // Subscribe to latest announcement
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const first = snap.docs[0];
      setLatestAnnouncement(first ? ({ id: first.id, ...first.data() } as Announcement) : null);
    });
  }, []);

  // Subscribe to parish info for mass times
  useEffect(() => {
    return onSnapshot(doc(db, "parish", "info"), (snap) => {
      if (snap.exists()) setParishInfo(snap.data() as ParishInfo);
    });
  }, []);

  // ── Admin login ──
  const handleChurchNameTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1500);
    if (tapCount.current === 3) { tapCount.current = 0; setShowLoginModal(true); }
  };

  const handleAdminLogin = async () => {
    setLoginLoading(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginModal(false);
      navigate("/admin");
    } catch {
      setLoginError("Invalid email or password.");
    } finally {
      setLoginLoading(false);
    }
  };

  const quickLinks = [
    { icon: BookOpen,   label: t("Daily Readings", "Masomo ya Leo"),       path: "/readings",      color: "text-liturgical-green"  },
    { icon: BookMarked, label: t("Bible", "Biblia"),                        path: "/bible",         color: "text-liturgical-purple" },
    { icon: Music,      label: t("Hymns", "Nyimbo"),                        path: "/hymns",         color: "text-liturgical-purple" },
    { icon: Heart,      label: t("Prayers", "Sala"),                        path: "/prayers",       color: "text-liturgical-red"    },
    { icon: Megaphone,  label: t("Announcements", "Matangazo"),             path: "/announcements", color: "text-accent"            },
    { icon: Church,     label: t("Parish Info", "Taarifa za Parokia"),      path: "/parish",        color: "text-accent"            },
  ];

  // Mass schedule — from live parish info or sensible defaults
  const massSchedule = parishInfo
    ? [
        { day: t("Sunday", "Jumapili"),         times: parseTimes(parishInfo.massSunday) },
        { day: t("Weekdays", "Siku za Juma"),   times: parseTimes(parishInfo.massWeekday) },
        { day: t("Saturday", "Jumamosi"),       times: parseTimes(parishInfo.massSaturday) },
      ]
    : [
        { day: t("Sunday", "Jumapili"),         times: ["7:00 AM", "9:00 AM", "11:00 AM (Kiswahili)", "5:00 PM"] },
        { day: t("Weekdays", "Siku za Juma"),   times: ["6:30 AM", "12:10 PM", "5:30 PM"] },
        { day: t("Saturday", "Jumamosi"),       times: ["7:00 AM", "5:30 PM (Vigil)"] },
      ];

  const announcementTitle = latestAnnouncement
    ? (language === "sw" && latestAnnouncement.titleSw?.trim()
        ? latestAnnouncement.titleSw
        : latestAnnouncement.title)
    : null;

  const announcementBody = latestAnnouncement
    ? (language === "sw" && latestAnnouncement.bodySw?.trim()
        ? latestAnnouncement.bodySw
        : latestAnnouncement.body)
    : null;

  return (
    <div className="animate-fade-in">

      {/* ── Admin Login Modal ── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-liturgical relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-3 right-3 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-lg font-bold text-foreground mb-1">Admin Login</h3>
            <p className="text-xs text-muted-foreground mb-4">Parish administrator access only</p>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-ring" />
            {loginError && <p className="text-xs text-destructive mb-3">{loginError}</p>}
            <button onClick={handleAdminLogin} disabled={loginLoading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative h-48 overflow-hidden">
        <img src={heroBanner} alt="Parish" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("Welcome to", "Karibu")}
          </p>
          <h2
            className="text-2xl font-display font-bold text-foreground cursor-pointer select-none"
            onClick={handleChurchNameTap}
          >
            {t("St. Gregory Catholic Church", "Parokia ya Katoliki ya Mt. Gregori")}
          </h2>
        </div>
      </div>

      {/* ── Liturgical Season Badge (from live reading) ── */}
      {todayReading && (
        <div className="px-4 -mt-2 relative z-10">
          <div className="flex items-center gap-2 rounded-lg bg-card p-3 shadow-liturgical border border-border">
            <div className={`h-3 w-3 rounded-full ${seasonColorMap[todayReading.seasonColor] ?? "bg-secondary"}`} />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{t("Liturgical Season", "Msimu wa Liturujia")}</p>
              <p className="text-sm font-semibold text-foreground">
                {t(todayReading.season, todayReading.seasonSw)}
              </p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* ── Quick Links (3-column grid) ── */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {quickLinks.slice(0, 6).map((link) => (
          <button key={link.path} onClick={() => navigate(link.path)}
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-3 border border-border transition-all hover:shadow-liturgical hover:scale-[1.02] active:scale-[0.98]">
            <link.icon className={`h-6 w-6 ${link.color}`} />
            <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{link.label}</span>
          </button>
        ))}
      </div>

      {/* ── Latest Announcement banner ── */}
      {latestAnnouncement && (
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-accent" />
              {t("Latest Announcement", "Tangazo la Hivi Karibuni")}
            </h3>
            <button onClick={() => navigate("/announcements")} className="flex items-center gap-1 text-xs font-medium text-accent">
              {t("All", "Zote")} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={() => navigate("/announcements")}
            className="w-full text-left rounded-xl bg-card border border-border p-4 hover:shadow-liturgical transition"
          >
            <p className="text-sm font-semibold text-foreground mb-1">{announcementTitle}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{announcementBody}</p>
          </button>
        </div>
      )}

      {/* ── Today's Readings Preview ── */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-semibold text-foreground">
            {t("Today's Readings", "Masomo ya Leo")}
          </h3>
          <button onClick={() => navigate("/readings")} className="flex items-center gap-1 text-xs font-medium text-accent">
            {t("View All", "Ona Yote")} <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {todayReading ? (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-sm font-semibold text-foreground mb-1">
              {t(todayReading.title, todayReading.titleSw)}
            </p>
            <p className="text-xs text-muted-foreground mb-3">{todayReading.date}</p>
            <div className="space-y-2">
              {todayReading.readings?.map((reading, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${seasonColorMap[todayReading.seasonColor] ?? "bg-secondary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t(reading.type, reading.typeSw)}</p>
                    <p className="text-sm font-medium text-foreground truncate">{reading.reference}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border p-4 text-center text-sm text-muted-foreground">
            {t("No readings posted yet", "Hakuna masomo bado")}
          </div>
        )}
      </div>

      {/* ── Mass Times (live from Church info) ── */}
      <div className="px-4 mt-5 mb-8">
        <h3 className="font-display text-base font-semibold text-foreground mb-3">
          {t("Mass Times", "Ratiba za Misa")}
        </h3>
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          {massSchedule.map((row) => (
            <div key={row.day} className="flex gap-3">
              <p className="text-sm font-semibold text-foreground w-24 shrink-0">{row.day}</p>
              <div className="flex flex-wrap gap-1.5">
                {row.times.map((time) => (
                  <span key={time} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {time}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;