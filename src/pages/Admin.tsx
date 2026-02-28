import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc,
  getDoc, setDoc,
} from "firebase/firestore";
import {
  BookOpen, Music, Heart, Calendar, LogOut, Plus, Trash2, X,
  ChevronDown, ChevronUp, Globe, Church, Megaphone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "announcements" | "hymns" | "prayers" | "readings" | "parish";

interface SubReading {
  type: string;
  typeSw: string;
  reference: string;
  text: string;
  textSw: string;
}

// Parish info stored as a single Firestore document
interface ParishInfo {
  name: string;
  nameSw: string;
  address: string;
  addressSw: string;
  phone: string;
  email: string;
  // Clergy — up to 5 slots
  clergy: { name: string; role: string; roleSw: string }[];
  // Confession times
  confessionSaturday: string;
  confessionWeekdays: string;
  confessionWeekdaysSw: string;
  // Mass times
  massSunday: string;       // comma-separated times
  massWeekday: string;
  massSaturday: string;
  // Ministries (comma-separated)
  ministries: string;
  ministriesSw: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_TYPES: { label: string; sw: string }[] = [
  { label: "First Reading",      sw: "Somo la Kwanza" },
  { label: "Responsorial Psalm", sw: "Wimbo wa Katikati" },
  { label: "Second Reading",     sw: "Somo la Pili" },
  { label: "Gospel Acclamation", sw: "Wimbo wa Injili" },
  { label: "Gospel",             sw: "Injili" },
];

const SEASONS: { label: string; sw: string; color: string }[] = [
  { label: "Ordinary Time", sw: "Wakati wa Kawaida", color: "green"  },
  { label: "Advent",        sw: "Majilio",           color: "purple" },
  { label: "Christmas",     sw: "Noeli",             color: "white"  },
  { label: "Lent",          sw: "Kwaresima",         color: "purple" },
  { label: "Holy Week",     sw: "Wiki ya Mateso",    color: "red"    },
  { label: "Easter",        sw: "Pasaka",            color: "white"  },
  { label: "Pentecost",     sw: "Pentekoste",        color: "red"    },
];

const SEASON_DOT: Record<string, string> = {
  green:  "bg-green-500",
  purple: "bg-purple-500",
  white:  "bg-gray-300 border border-gray-400",
  red:    "bg-red-500",
  rose:   "bg-rose-400",
};

const FIELD_LABELS: Record<string, string> = {
  title:      "Title (English)",
  titleSw:    "Title (Kiswahili)",
  body:       "Body (English)",
  bodySw:     "Body (Kiswahili)",
  content:    "Content (English)",
  contentSw:  "Content (Kiswahili)",
  lyrics:     "Lyrics",
};

const OPTIONAL_FIELDS = ["titleSw", "contentSw", "bodySw"];
const LONG_FIELDS     = ["lyrics", "content", "contentSw", "body", "bodySw"];

const categoryConfig: Record<string, {
  label: string; icon: any; color: string; fields: string[];
}> = {
  announcements: {
    label: "Announcements",
    icon: Megaphone,
    color: "text-accent",
    fields: ["title", "titleSw", "body", "bodySw"],
  },
  hymns: {
    label: "Hymns",
    icon: Music,
    color: "text-liturgical-purple",
    fields: ["title", "lyrics"],
  },
  prayers: {
    label: "Prayers",
    icon: Heart,
    color: "text-liturgical-red",
    fields: ["title", "titleSw", "content", "contentSw"],
  },
  readings: {
    label: "Readings",
    icon: BookOpen,
    color: "text-liturgical-green",
    fields: [],
  },
  parish: {
    label: "Parish Info",
    icon: Church,
    color: "text-accent",
    fields: [], // handled separately
  },
};

const TABS: Category[] = ["announcements", "readings", "prayers", "hymns", "parish"];

const emptySubReading = (): SubReading => ({
  type: "", typeSw: "", reference: "", text: "", textSw: "",
});

const defaultParish: ParishInfo = {
  name: "St. Gregory Catholic Parish",
  nameSw: "Parokia ya Katoliki ya Mt. Yosefu",
  address: "123 Cathedral Road, Westlands, Nairobi, Kenya",
  addressSw: "123 Barabara ya Kanisa Kuu, Westlands, Nairobi, Kenya",
  phone: "+254 700 123 456",
  email: "info@stjosephnairobi.or.ke",
  clergy: [
    { name: "Fr. John Kamau",       role: "Parish Priest",    roleSw: "Paroko" },
    { name: "Fr. Peter Ochieng",    role: "Assistant Priest", roleSw: "Kasisi Msaidizi" },
    { name: "Deacon Francis Mwangi",role: "Deacon",           roleSw: "Shemasi" },
  ],
  confessionSaturday: "3:00 PM - 5:00 PM",
  confessionWeekdays: "By appointment",
  confessionWeekdaysSw: "Kwa miadi",
  massSunday: "7:00 AM, 9:00 AM, 11:00 AM (Kiswahili), 5:00 PM",
  massWeekday: "6:30 AM, 12:10 PM, 5:30 PM",
  massSaturday: "7:00 AM, 5:30 PM (Vigil)",
  ministries: "Catholic Men Association (CMA), Catholic Women Association (CWA), Youth Group, Choir, Legion of Mary, St. Vincent de Paul Society",
  ministriesSw: "Chama cha Wanaume Wakatoliki, Chama cha Wanawake Wakatoliki, Kikundi cha Vijana, Kwaya, Jeshi la Maria, Shirika la Mt. Vinsenti wa Paulo",
};

// ─── Sub-reading card ─────────────────────────────────────────────────────────

const SubReadingCard = ({
  sr, index, total, onChange, onRemove,
}: {
  sr: SubReading;
  index: number;
  total: number;
  onChange: (updates: Partial<SubReading>) => void;
  onRemove: () => void;
}) => {
  const [showSw, setShowSw] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <div className="px-3 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {sr.type ? sr.type : `Reading ${index + 1}`}
          </span>
          {total > 1 && (
            <button onClick={onRemove} className="ml-auto text-destructive p-0.5 rounded hover:bg-destructive/10 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TYPES.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ type: p.label, typeSw: p.sw })}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                sr.type === p.label
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 space-y-2.5">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Scripture Reference</label>
          <input
            type="text"
            placeholder="e.g. Mark 8:1-10"
            value={sr.reference}
            onChange={(e) => onChange({ reference: e.target.value })}
            className="mt-0.5 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reading Text (English)</label>
          <textarea
            rows={5}
            placeholder="Paste the full reading text here…"
            value={sr.text}
            onChange={(e) => onChange({ text: e.target.value })}
            className="mt-0.5 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowSw(!showSw)}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:opacity-80 transition"
        >
          <Globe className="h-3 w-3" />
          {showSw ? "Hide" : "Add"} Swahili translation
          {showSw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showSw && (
          <>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Aina (Kiswahili)</label>
              <input
                type="text"
                placeholder="e.g. Somo la Kwanza"
                value={sr.typeSw}
                onChange={(e) => onChange({ typeSw: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Maandishi (Kiswahili)</label>
              <textarea
                rows={5}
                placeholder="Andika maandishi hapa…"
                value={sr.textSw}
                onChange={(e) => onChange({ textSw: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Parish Editor ────────────────────────────────────────────────────────────

const ParishEditor = () => {
  const [info, setInfo] = useState<ParishInfo>(defaultParish);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "parish", "info"));
        if (snap.exists()) setInfo(snap.data() as ParishInfo);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = (field: keyof ParishInfo, value: any) =>
    setInfo((prev) => ({ ...prev, [field]: value }));

  const setClergy = (i: number, field: keyof ParishInfo["clergy"][0], value: string) => {
    const updated = [...info.clergy];
    updated[i] = { ...updated[i], [field]: value };
    setInfo((prev) => ({ ...prev, clergy: updated }));
  };

  const addClergy = () =>
    setInfo((prev) => ({ ...prev, clergy: [...prev.clergy, { name: "", role: "", roleSw: "" }] }));

  const removeClergy = (i: number) =>
    setInfo((prev) => ({ ...prev, clergy: prev.clergy.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "parish", "info"), { ...info, updatedAt: serverTimestamp() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      alert("Failed to save parish info.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 block";

  if (loading) return <div className="text-center py-8 text-sm text-muted-foreground">Loading parish info…</div>;

  return (
    <div className="mt-3 space-y-4">

      {/* Basic info */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Details</h4>
        <div>
          <label className={labelCls}>Parish Name (English)</label>
          <input className={inputCls} value={info.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Parish Name (Kiswahili)</label>
          <input className={inputCls} value={info.nameSw} onChange={(e) => set("nameSw", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Address (English)</label>
          <input className={inputCls} value={info.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Address (Kiswahili)</label>
          <input className={inputCls} value={info.addressSw} onChange={(e) => set("addressSw", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={info.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} value={info.email} onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>

      {/* Clergy */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clergy</h4>
          <button onClick={addClergy} className="flex items-center gap-1 text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {info.clergy.map((c, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-background">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Person {i + 1}</span>
              {info.clergy.length > 1 && (
                <button onClick={() => removeClergy(i)} className="text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <input className={inputCls} placeholder="Full name" value={c.name} onChange={(e) => setClergy(i, "name", e.target.value)} />
            <input className={inputCls} placeholder="Role (English) e.g. Parish Priest" value={c.role} onChange={(e) => setClergy(i, "role", e.target.value)} />
            <input className={inputCls} placeholder="Role (Kiswahili) e.g. Paroko" value={c.roleSw} onChange={(e) => setClergy(i, "roleSw", e.target.value)} />
          </div>
        ))}
      </div>

      {/* Confession times */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confession Times</h4>
        <div>
          <label className={labelCls}>Saturday</label>
          <input className={inputCls} placeholder="e.g. 3:00 PM - 5:00 PM" value={info.confessionSaturday} onChange={(e) => set("confessionSaturday", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Weekdays (English)</label>
          <input className={inputCls} placeholder="e.g. By appointment" value={info.confessionWeekdays} onChange={(e) => set("confessionWeekdays", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Weekdays (Kiswahili)</label>
          <input className={inputCls} placeholder="e.g. Kwa miadi" value={info.confessionWeekdaysSw} onChange={(e) => set("confessionWeekdaysSw", e.target.value)} />
        </div>
      </div>

      {/* Mass times */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mass Times</h4>
        <p className="text-[10px] text-muted-foreground">Enter times separated by commas</p>
        <div>
          <label className={labelCls}>Sunday</label>
          <input className={inputCls} placeholder="7:00 AM, 9:00 AM, 11:00 AM" value={info.massSunday} onChange={(e) => set("massSunday", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Weekdays</label>
          <input className={inputCls} placeholder="6:30 AM, 12:10 PM, 5:30 PM" value={info.massWeekday} onChange={(e) => set("massWeekday", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Saturday</label>
          <input className={inputCls} placeholder="7:00 AM, 5:30 PM (Vigil)" value={info.massSaturday} onChange={(e) => set("massSaturday", e.target.value)} />
        </div>
      </div>

      {/* Ministries */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Groups & Ministries</h4>
        <p className="text-[10px] text-muted-foreground">Enter each ministry separated by commas</p>
        <div>
          <label className={labelCls}>English</label>
          <textarea rows={3} className={`${inputCls} resize-none`} value={info.ministries} onChange={(e) => set("ministries", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Kiswahili</label>
          <textarea rows={3} className={`${inputCls} resize-none`} value={info.ministriesSw} onChange={(e) => set("ministriesSw", e.target.value)} />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full rounded-xl py-3 text-sm font-bold transition ${
          saved
            ? "bg-green-500 text-white"
            : "bg-primary text-primary-foreground hover:opacity-90"
        } disabled:opacity-50`}
      >
        {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Parish Info"}
      </button>
    </div>
  );
};

// ─── Main Admin component ─────────────────────────────────────────────────────

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Category>("announcements");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [subReadings, setSubReadings] = useState<SubReading[]>([emptySubReading()]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (activeTab !== "parish") loadPosts();
    setShowForm(false);
    setFormData({});
    setSubReadings([emptySubReading()]);
  }, [activeTab]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, activeTab));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(data);
    } catch (err) {
      console.error("Error loading:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({});
    setSubReadings([emptySubReading()]);
  };

  const updateSubReading = (index: number, updates: Partial<SubReading>) => {
    setSubReadings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const addSubReading = () => setSubReadings((prev) => [...prev, emptySubReading()]);
  const removeSubReading = (index: number) =>
    setSubReadings((prev) => prev.filter((_, i) => i !== index));

  const handleSeasonSelect = (season: typeof SEASONS[number]) => {
    setFormData((prev) => ({ ...prev, season: season.label, seasonSw: season.sw, seasonColor: season.color }));
  };

  const handleSaveReading = async () => {
    if (!formData.title?.trim() || !formData.season || !formData.date)
      return alert("Please fill in Title, Season and Date.");
    for (const sr of subReadings)
      if (!sr.type || !sr.reference?.trim() || !sr.text?.trim())
        return alert("Each reading needs a Type, Reference and Text.");
    setSaving(true);
    try {
      await addDoc(collection(db, "readings"), {
        title: formData.title, titleSw: formData.titleSw || "",
        season: formData.season, seasonSw: formData.seasonSw || "",
        seasonColor: formData.seasonColor || "green",
        date: formData.date, readings: subReadings, createdAt: serverTimestamp(),
      });
      resetForm(); loadPosts();
    } catch (err) { console.error(err); alert("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleSaveOther = async () => {
    const fields = categoryConfig[activeTab].fields;
    const required = fields.filter((f) => !OPTIONAL_FIELDS.includes(f));
    if (required.some((f) => !formData[f]?.trim()))
      return alert("Please fill in all required fields.");
    setSaving(true);
    try {
      await addDoc(collection(db, activeTab), { ...formData, createdAt: serverTimestamp() });
      resetForm(); loadPosts();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleSave = () =>
    activeTab === "readings" ? handleSaveReading() : handleSaveOther();

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this?")) return;
    try { await deleteDoc(doc(db, activeTab, id)); loadPosts(); }
    catch (err) { console.error(err); }
  };

  const handleSignOut = async () => { await signOut(auth); navigate("/"); };

  const config = categoryConfig[activeTab];

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-liturgical">
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">St. Gregory Catholic Parish</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-lg px-3 py-1.5 hover:bg-destructive/10 transition"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto scrollbar-hide">
        {TABS.map((cat) => {
          const Icon = categoryConfig[cat].icon;
          const isActive = activeTab === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {categoryConfig[cat].label}
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-24">

        {/* ── Parish editor (special, no list) ── */}
        {activeTab === "parish" && <ParishEditor />}

        {/* ── All other tabs ── */}
        {activeTab !== "parish" && (
          <>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition"
              >
                <Plus className="h-4 w-4" />
                Add New {activeTab === "readings" ? "Reading" : config.label.slice(0, -1)}
              </button>
            )}

            {showForm && (
              <div className="mt-3 rounded-xl bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-foreground">
                    {activeTab === "readings" ? "New Mass Reading" : `New ${config.label.slice(0, -1)}`}
                  </h3>
                  <button onClick={resetForm}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>

                {/* Readings form */}
                {activeTab === "readings" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of Mass</label>
                      <input type="date" value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day Title</label>
                      <input type="text" placeholder="e.g. Saturday of the 5th Week in Ordinary Time"
                        value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <input type="text" placeholder="Kichwa cha siku (Kiswahili) — optional"
                        value={formData.titleSw || ""} onChange={(e) => setFormData({ ...formData, titleSw: e.target.value })}
                        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liturgical Season</label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {SEASONS.map((s) => (
                          <button key={s.label} type="button" onClick={() => handleSeasonSelect(s)}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                              formData.season === s.label
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:border-primary/50"
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${SEASON_DOT[s.color]}`} />
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {formData.season && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          SW: <span className="font-medium">{formData.seasonSw}</span>
                          {" · "}Color: <span className="font-medium">{formData.seasonColor}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Readings ({subReadings.length})</label>
                        <button type="button" onClick={addSubReading} className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80">
                          <Plus className="h-3.5 w-3.5" /> Add Reading
                        </button>
                      </div>
                      <div className="space-y-3">
                        {subReadings.map((sr, i) => (
                          <SubReadingCard key={i} sr={sr} index={i} total={subReadings.length}
                            onChange={(updates) => updateSubReading(i, updates)}
                            onRemove={() => removeSubReading(i)} />
                        ))}
                      </div>
                    </div>
                  </div>

                ) : (
                  /* Standard form */
                  <div className="space-y-3">
                    {config.fields.map((field) => {
                      const isOptional = OPTIONAL_FIELDS.includes(field);
                      const isLong = LONG_FIELDS.includes(field);
                      const label = FIELD_LABELS[field] ?? field;
                      return (
                        <div key={field}>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                            {label}
                            {isOptional && <span className="normal-case font-normal text-muted-foreground/60 text-[10px]">— optional</span>}
                          </label>
                          {isLong ? (
                            <textarea rows={4} placeholder={isOptional ? "Kiswahili — optional" : `Enter ${label.toLowerCase()}...`}
                              value={formData[field] || ""} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                          ) : (
                            <input type="text" placeholder={isOptional ? "Kiswahili — optional" : `Enter ${label.toLowerCase()}...`}
                              value={formData[field] || ""} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 mt-5">
                  <button onClick={resetForm} className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
                    {saving ? "Saving…" : "Post"}
                  </button>
                </div>
              </div>
            )}

            {/* Posts list */}
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No {config.label.toLowerCase()} yet. Add your first one!
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="rounded-xl bg-card border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {post.date && <span>{post.date} · </span>}
                          {post.season && <span>{post.season} · </span>}
                          {post.readings?.length
                            ? <span>{post.readings.length} readings</span>
                            : (post.body || post.lyrics || post.content || "").slice(0, 60) + "…"
                          }
                        </p>
                      </div>
                      <button onClick={() => handleDelete(post.id)}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;