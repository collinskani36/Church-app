import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc,
  getDoc, setDoc, updateDoc,
} from "firebase/firestore";
import {
  BookOpen, Music, Heart, LogOut, Plus, Trash2, X,
  ChevronDown, ChevronUp, Globe, Church, Megaphone, Search,
  Loader2, CheckCircle, AlertCircle, Edit3, Pencil, Save,
  LayoutDashboard,
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

interface ParishInfo {
  name: string;
  nameSw: string;
  address: string;
  addressSw: string;
  phone: string;
  email: string;
  clergy: { name: string; role: string; roleSw: string }[];
  confessionSaturday: string;
  confessionWeekdays: string;
  confessionWeekdaysSw: string;
  massSunday: string;
  massWeekday: string;
  massSaturday: string;
  ministries: string;
  ministriesSw: string;
}

// ─── Bible helpers ────────────────────────────────────────────────────────────

const EN_ALIASES: Record<string, string> = {
  "gen": "Genesis", "genesis": "Genesis",
  "ex": "Exodus", "exo": "Exodus", "exodus": "Exodus",
  "lev": "Leviticus", "leviticus": "Leviticus",
  "num": "Numbers", "numbers": "Numbers",
  "deut": "Deuteronomy", "deuteronomy": "Deuteronomy", "dt": "Deuteronomy",
  "josh": "Joshua", "joshua": "Joshua",
  "judg": "Judges", "judges": "Judges",
  "ruth": "Ruth",
  "1 sam": "1Samuel", "1sam": "1Samuel", "1 samuel": "1Samuel", "1samuel": "1Samuel",
  "2 sam": "2Samuel", "2sam": "2Samuel", "2 samuel": "2Samuel", "2samuel": "2Samuel",
  "1 kgs": "1Kings", "1kgs": "1Kings", "1 kings": "1Kings", "1kings": "1Kings",
  "2 kgs": "2Kings", "2kgs": "2Kings", "2 kings": "2Kings", "2kings": "2Kings",
  "1 chr": "1Chronicles", "1chr": "1Chronicles", "1 chron": "1Chronicles", "1chronicles": "1Chronicles",
  "2 chr": "2Chronicles", "2chr": "2Chronicles", "2 chron": "2Chronicles", "2chronicles": "2Chronicles",
  "ezra": "Ezra", "neh": "Nehemiah", "nehemiah": "Nehemiah",
  "esth": "Esther", "esther": "Esther", "job": "Job",
  "ps": "Psalms", "psa": "Psalms", "psalm": "Psalms", "psalms": "Psalms",
  "prov": "Proverbs", "proverbs": "Proverbs",
  "eccl": "Ecclesiastes", "ecclesiastes": "Ecclesiastes",
  "song": "Song_of_Solomon", "sos": "Song_of_Solomon", "song of solomon": "Song_of_Solomon",
  "isa": "Isaiah", "isaiah": "Isaiah",
  "jer": "Jeremiah", "jeremiah": "Jeremiah",
  "lam": "Lamentations", "lamentations": "Lamentations",
  "ezek": "Ezekiel", "ezekiel": "Ezekiel",
  "dan": "Daniel", "daniel": "Daniel",
  "hos": "Hosea", "hosea": "Hosea", "joel": "Joel", "amos": "Amos",
  "obad": "Obadiah", "obadiah": "Obadiah",
  "jonah": "Jonah", "jon": "Jonah",
  "mic": "Micah", "micah": "Micah", "nah": "Nahum", "nahum": "Nahum",
  "hab": "Habakkuk", "habakkuk": "Habakkuk",
  "zeph": "Zephaniah", "zephaniah": "Zephaniah",
  "hag": "Haggai", "haggai": "Haggai",
  "zech": "Zechariah", "zechariah": "Zechariah",
  "mal": "Malachi", "malachi": "Malachi",
  "matt": "Matthew", "matthew": "Matthew", "mt": "Matthew",
  "mark": "Mark", "mk": "Mark", "luke": "Luke", "lk": "Luke",
  "john": "John", "jn": "John", "acts": "Acts",
  "rom": "Romans", "romans": "Romans",
  "1 cor": "1Corinthians", "1cor": "1Corinthians", "1 corinthians": "1Corinthians", "1corinthians": "1Corinthians",
  "2 cor": "2Corinthians", "2cor": "2Corinthians", "2 corinthians": "2Corinthians", "2corinthians": "2Corinthians",
  "gal": "Galatians", "galatians": "Galatians",
  "eph": "Ephesians", "ephesians": "Ephesians",
  "phil": "Philippians", "philippians": "Philippians",
  "col": "Colossians", "colossians": "Colossians",
  "1 thess": "1Thessalonians", "1thess": "1Thessalonians", "1thessalonians": "1Thessalonians",
  "2 thess": "2Thessalonians", "2thess": "2Thessalonians", "2thessalonians": "2Thessalonians",
  "1 tim": "1Timothy", "1tim": "1Timothy", "1timothy": "1Timothy",
  "2 tim": "2Timothy", "2tim": "2Timothy", "2timothy": "2Timothy",
  "titus": "Titus", "philem": "Philemon", "philemon": "Philemon",
  "heb": "Hebrews", "hebrews": "Hebrews",
  "jas": "James", "james": "James",
  "1 pet": "1Peter", "1pet": "1Peter", "1peter": "1Peter",
  "2 pet": "2Peter", "2pet": "2Peter", "2peter": "2Peter",
  "1 john": "1John", "1jn": "1John", "1john": "1John",
  "2 john": "2John", "2jn": "2John", "2john": "2John",
  "3 john": "3John", "3jn": "3John", "3john": "3John",
  "jude": "Jude", "rev": "Revelation", "revelation": "Revelation",
};

const SW_ALIASES: Record<string, string> = {
  "mwanzo": "Mwanzo", "kutoka": "Kutoka",
  "mambo ya walawi": "Mambo_ya_Walawi", "walawi": "Mambo_ya_Walawi",
  "hesabu": "Hesabu",
  "kumbukumbu la torati": "Kumbukumbu_la_Torati", "kumbukumbu": "Kumbukumbu_la_Torati",
  "yoshua": "Yoshua", "waamuzi": "Waamuzi", "ruthu": "Ruthu",
  "1 samueli": "1_Samueli", "1samueli": "1_Samueli",
  "2 samueli": "2_Samueli", "2samueli": "2_Samueli",
  "1 wafalme": "1_Wafalme", "1wafalme": "1_Wafalme",
  "2 wafalme": "2_Wafalme", "2wafalme": "2_Wafalme",
  "1 mambo ya nyakati": "1_Mambo_ya_Nyakati", "1 nyakati": "1_Mambo_ya_Nyakati",
  "2 mambo ya nyakati": "2_Mambo_ya_Nyakati", "2 nyakati": "2_Mambo_ya_Nyakati",
  "ezra": "Ezra", "nehemia": "Nehemia", "esta": "Esta", "ayubu": "Ayubu",
  "zaburi": "Zaburi", "mithali": "Mithali", "mhubiri": "Mhubiri",
  "wimbo ulio bora": "Wimbo_Ulio_Bora", "wimbo": "Wimbo_Ulio_Bora",
  "isaya": "Isaya", "yeremia": "Yeremia", "maombolezo": "Maombolezo",
  "ezekieli": "Ezekieli", "danieli": "Danieli", "hosea": "Hosea",
  "yoeli": "Yoeli", "amosi": "Amosi", "obadia": "Obadia", "yona": "Yona",
  "mika": "Mika", "nahumu": "Nahumu", "habakuki": "Habakuki",
  "sefania": "Sefania", "hagai": "Hagai", "zekaria": "Zekaria", "malaki": "Malaki",
  "mathayo": "Mathayo", "marko": "Marko", "luka": "Luka", "yohana": "Yohana",
  "matendo ya mitume": "Matendo_ya_Mitume", "matendo": "Matendo_ya_Mitume",
  "warumi": "Warumi",
  "1 wakorintho": "1_Wakorintho", "1wakorintho": "1_Wakorintho",
  "2 wakorintho": "2_Wakorintho", "2wakorintho": "2_Wakorintho",
  "wagalatia": "Wagalatia", "waefeso": "Waefeso", "wafilipi": "Wafilipi",
  "wakolosai": "Wakolosai",
  "1 wathesalonike": "1_Wathesalonike", "1wathesalonike": "1_Wathesalonike",
  "2 wathesalonike": "2_Wathesalonike", "2wathesalonike": "2_Wathesalonike",
  "1 timotheo": "1_Timotheo", "1timotheo": "1_Timotheo",
  "2 timotheo": "2_Timotheo", "2timotheo": "2_Timotheo",
  "tito": "Tito", "filemoni": "Filemoni", "waebrania": "Waebrania",
  "yakobo": "Yakobo",
  "1 petro": "1_Petro", "1petro": "1_Petro",
  "2 petro": "2_Petro", "2petro": "2_Petro",
  "1 yohana": "1_Yohana", "1yohana": "1_Yohana",
  "2 yohana": "2_Yohana", "2yohana": "2_Yohana",
  "3 yohana": "3_Yohana", "3yohana": "3_Yohana",
  "yuda": "Yuda",
  "ufunuo wa yohana": "Ufunuo_wa_Yohana", "ufunuo": "Ufunuo_wa_Yohana",
};

function parseReference(ref: string, lang: "en" | "sw") {
  const m = ref.trim().match(/^(\d?\s*[a-zA-Z\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const rawBook = m[1].trim().toLowerCase();
  const chapter = parseInt(m[2]);
  const startVerse = parseInt(m[3]);
  const endVerse = m[4] ? parseInt(m[4]) : startVerse;
  const file = (lang === "sw" ? SW_ALIASES : EN_ALIASES)[rawBook];
  if (!file) return null;
  return { file, chapter, startVerse, endVerse };
}

async function fetchVerses(ref: string, lang: "en" | "sw"): Promise<{ text: string; error?: string }> {
  const parsed = parseReference(ref, lang);
  if (!parsed) {
    const ex = lang === "sw" ? "Marko 8:1-10" : "Mark 8:1-10";
    return { text: "", error: `Could not parse "${ref}". Try e.g. "${ex}"` };
  }
  const { file, chapter, startVerse, endVerse } = parsed;
  const folder = lang === "sw" ? "swahili" : "kjv";
  try {
    const res = await fetch(`/bible/${folder}/${file}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const ch = data.chapters?.find((c: any) => parseInt(c.chapter) === chapter);
    if (!ch) return { text: "", error: `Chapter ${chapter} not found` };
    const verses = ch.verses.filter((v: any) => parseInt(v.verse) >= startVerse && parseInt(v.verse) <= endVerse);
    if (!verses.length) return { text: "", error: `Verses ${startVerse}–${endVerse} not found` };
    return { text: verses.map((v: any) => `[${v.verse}] ${v.text}`).join(" ") };
  } catch {
    return { text: "", error: `Could not load ${file}.json from /bible/${folder}/` };
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_TYPES = [
  { label: "First Reading", sw: "Somo la Kwanza" },
  { label: "Responsorial Psalm", sw: "Wimbo wa Katikati" },
  { label: "Second Reading", sw: "Somo la Pili" },
  { label: "Gospel Acclamation", sw: "Wimbo wa Injili" },
  { label: "Gospel", sw: "Injili" },
];

const SEASONS = [
  { label: "Ordinary Time", sw: "Wakati wa Kawaida", color: "green" },
  { label: "Advent", sw: "Majilio", color: "purple" },
  { label: "Christmas", sw: "Noeli", color: "white" },
  { label: "Lent", sw: "Kwaresima", color: "purple" },
  { label: "Holy Week", sw: "Wiki ya Mateso", color: "red" },
  { label: "Easter", sw: "Pasaka", color: "white" },
  { label: "Pentecost", sw: "Pentekoste", color: "red" },
];

const SEASON_DOT: Record<string, string> = {
  green: "bg-green-500", purple: "bg-purple-500",
  white: "bg-gray-300 border border-gray-400", red: "bg-red-500",
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title (English)", titleSw: "Title (Kiswahili)",
  body: "Body (English)", bodySw: "Body (Kiswahili)",
  content: "Content (English)", contentSw: "Content (Kiswahili)",
  lyrics: "Lyrics",
};

const OPTIONAL_FIELDS = ["titleSw", "contentSw", "bodySw"];
const LONG_FIELDS = ["lyrics", "content", "contentSw", "body", "bodySw"];

const categoryConfig: Record<string, { label: string; icon: any; accent: string; fields: string[] }> = {
  announcements: { label: "Announcements", icon: Megaphone, accent: "#f59e0b", fields: ["title", "titleSw", "body", "bodySw"] },
  hymns:         { label: "Hymns",         icon: Music,     accent: "#8b5cf6", fields: ["title", "lyrics"] },
  prayers:       { label: "Prayers",       icon: Heart,     accent: "#ef4444", fields: ["title", "titleSw", "content", "contentSw"] },
  readings:      { label: "Readings",      icon: BookOpen,  accent: "#10b981", fields: [] },
  parish:        { label: "Parish Info",   icon: Church,    accent: "#3b82f6", fields: [] },
};

const TABS: Category[] = ["announcements", "readings", "prayers", "hymns", "parish"];
const emptySubReading = (): SubReading => ({ type: "", typeSw: "", reference: "", text: "", textSw: "" });

const defaultParish: ParishInfo = {
  name: "St. Gregory Catholic Parish",
  nameSw: "Parokia ya Katoliki ya Mt. Yosefu",
  address: "123 Cathedral Road, Westlands, Nairobi, Kenya",
  addressSw: "123 Barabara ya Kanisa Kuu, Westlands, Nairobi, Kenya",
  phone: "+254 700 123 456",
  email: "info@stjosephnairobi.or.ke",
  clergy: [
    { name: "Fr. John Kamau", role: "Parish Priest", roleSw: "Paroko" },
    { name: "Fr. Peter Ochieng", role: "Assistant Priest", roleSw: "Kasisi Msaidizi" },
    { name: "Deacon Francis Mwangi", role: "Deacon", roleSw: "Shemasi" },
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

const SubReadingCard = ({ sr, index, total, onChange, onRemove }: {
  sr: SubReading; index: number; total: number;
  onChange: (u: Partial<SubReading>) => void; onRemove: () => void;
}) => {
  const [showSw, setShowSw] = useState(false);
  const [refEn, setRefEn] = useState(sr.reference);
  const [refSw, setRefSw] = useState(sr.reference);
  const [loadingEn, setLoadingEn] = useState(false);
  const [loadingSw, setLoadingSw] = useState(false);
  const [errEn, setErrEn] = useState<string | null>(null);
  const [errSw, setErrSw] = useState<string | null>(null);
  const [okEn, setOkEn] = useState(false);
  const [okSw, setOkSw] = useState(false);

  const lookupEn = async () => {
    if (!refEn.trim()) return;
    setLoadingEn(true); setErrEn(null);
    const { text, error } = await fetchVerses(refEn, "en");
    setLoadingEn(false);
    if (error) { setErrEn(error); return; }
    onChange({ reference: refEn, text });
    setOkEn(true); setTimeout(() => setOkEn(false), 2500);
  };

  const lookupSw = async () => {
    if (!refSw.trim()) return;
    setLoadingSw(true); setErrSw(null);
    const { text, error } = await fetchVerses(refSw, "sw");
    setLoadingSw(false);
    if (error) { setErrSw(error); return; }
    onChange({ textSw: text });
    setOkSw(true); setTimeout(() => setOkSw(false), 2500);
  };

  const inp = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition";

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex-1">
          {sr.type || `Reading ${index + 1}`}
        </span>
        {total > 1 && (
          <button onClick={onRemove} className="p-1 rounded-lg hover:bg-destructive/10 text-destructive transition">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="px-4 py-3 border-b border-border flex flex-wrap gap-1.5">
        {PRESET_TYPES.map(p => (
          <button key={p.label} type="button" onClick={() => onChange({ type: p.label, typeSw: p.sw })}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              sr.type === p.label
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary/40"
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="px-4 py-4 space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Scripture Reference (English)
          </label>
          <div className="flex gap-2">
            <input type="text" placeholder="e.g. Mark 8:1-10" value={refEn}
              onChange={e => setRefEn(e.target.value)} onKeyDown={e => e.key === "Enter" && lookupEn()}
              className={inp} />
            <button type="button" onClick={lookupEn} disabled={loadingEn || !refEn.trim()}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40 whitespace-nowrap ${
                okEn ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:opacity-90"
              }`}>
              {loadingEn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
               okEn ? <CheckCircle className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
              {loadingEn ? "…" : okEn ? "Got it" : "Fetch"}
            </button>
          </div>
          {errEn && <p className="mt-1 text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errEn}</p>}
        </div>
        {sr.text ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Edit3 className="h-3 w-3" /> Edit Reading Text
              </label>
              <button type="button" onClick={() => onChange({ text: "" })}
                className="text-[10px] text-muted-foreground hover:text-destructive transition">Clear</button>
            </div>
            <textarea rows={6} value={sr.text} onChange={e => onChange({ text: e.target.value })} className={`${inp} resize-y`} />
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Or paste manually</label>
            <textarea rows={5} placeholder="Paste reading text here…" value={sr.text}
              onChange={e => onChange({ text: e.target.value })} className={`${inp} resize-none`} />
          </div>
        )}
        <button type="button" onClick={() => setShowSw(!showSw)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:opacity-75 transition">
          <Globe className="h-3.5 w-3.5" />
          {showSw ? "Hide" : "Add"} Kiswahili Translation
          {showSw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showSw && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Aina (Kiswahili)</label>
              <input type="text" placeholder="e.g. Somo la Kwanza" value={sr.typeSw}
                onChange={e => onChange({ typeSw: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Rejeleo (Kiswahili)</label>
              <div className="flex gap-2">
                <input type="text" placeholder="e.g. Marko 8:1-10" value={refSw}
                  onChange={e => setRefSw(e.target.value)} onKeyDown={e => e.key === "Enter" && lookupSw()}
                  className={inp} />
                <button type="button" onClick={lookupSw} disabled={loadingSw || !refSw.trim()}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40 whitespace-nowrap ${
                    okSw ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}>
                  {loadingSw ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                   okSw ? <CheckCircle className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                  {loadingSw ? "…" : okSw ? "Sawa" : "Fetch"}
                </button>
              </div>
              {errSw && <p className="mt-1 text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errSw}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Maandishi (Kiswahili)
                </label>
                {sr.textSw && <button type="button" onClick={() => onChange({ textSw: "" })}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition">Clear</button>}
              </div>
              <textarea rows={6} placeholder="Andika maandishi hapa au bonyeza Fetch…" value={sr.textSw}
                onChange={e => onChange({ textSw: e.target.value })} className={`${inp} resize-y`} />
            </div>
          </div>
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
    getDoc(doc(db, "parish", "info"))
      .then(snap => { if (snap.exists()) setInfo(snap.data() as ParishInfo); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof ParishInfo, value: any) => setInfo(p => ({ ...p, [field]: value }));
  const setClergy = (i: number, field: keyof ParishInfo["clergy"][0], value: string) => {
    const u = [...info.clergy]; u[i] = { ...u[i], [field]: value };
    setInfo(p => ({ ...p, clergy: u }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "parish", "info"), { ...info, updatedAt: serverTimestamp() });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { alert("Failed to save parish info."); }
    finally { setSaving(false); }
  };

  const inp = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition";
  const lbl = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block";

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );

  return (
    <div className="space-y-4 mt-2">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Contact Details</h4>
        {[
          ["name","Parish Name (English)"], ["nameSw","Parish Name (Kiswahili)"],
          ["address","Address (English)"], ["addressSw","Address (Kiswahili)"],
          ["phone","Phone"], ["email","Email"],
        ].map(([k,l]) => (
          <div key={k}><label className={lbl}>{l}</label>
            <input className={inp} value={(info as any)[k]} onChange={e => set(k as keyof ParishInfo, e.target.value)} /></div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Clergy</h4>
          <button onClick={() => setInfo(p => ({ ...p, clergy: [...p.clergy, { name: "", role: "", roleSw: "" }] }))}
            className="flex items-center gap-1 text-xs font-bold text-primary">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {info.clergy.map((c, i) => (
          <div key={i} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Person {i + 1}</span>
              {info.clergy.length > 1 && (
                <button onClick={() => setInfo(p => ({ ...p, clergy: p.clergy.filter((_, idx) => idx !== i) }))}
                  className="text-destructive"><X className="h-3.5 w-3.5" /></button>
              )}
            </div>
            <input className={inp} placeholder="Full name" value={c.name} onChange={e => setClergy(i, "name", e.target.value)} />
            <input className={inp} placeholder="Role (English)" value={c.role} onChange={e => setClergy(i, "role", e.target.value)} />
            <input className={inp} placeholder="Role (Kiswahili)" value={c.roleSw} onChange={e => setClergy(i, "roleSw", e.target.value)} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Confession Times</h4>
        {[["confessionSaturday","Saturday"],["confessionWeekdays","Weekdays (English)"],["confessionWeekdaysSw","Weekdays (Kiswahili)"]].map(([k,l]) => (
          <div key={k}><label className={lbl}>{l}</label>
            <input className={inp} value={(info as any)[k]} onChange={e => set(k as keyof ParishInfo, e.target.value)} /></div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mass Times</h4>
        <p className="text-[10px] text-muted-foreground">Separate times with commas</p>
        {[["massSunday","Sunday"],["massWeekday","Weekdays"],["massSaturday","Saturday"]].map(([k,l]) => (
          <div key={k}><label className={lbl}>{l}</label>
            <input className={inp} value={(info as any)[k]} onChange={e => set(k as keyof ParishInfo, e.target.value)} /></div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ministries</h4>
        <div><label className={lbl}>English</label>
          <textarea rows={3} className={`${inp} resize-none`} value={info.ministries} onChange={e => set("ministries", e.target.value)} /></div>
        <div><label className={lbl}>Kiswahili</label>
          <textarea rows={3} className={`${inp} resize-none`} value={info.ministriesSw} onChange={e => set("ministriesSw", e.target.value)} /></div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className={`w-full rounded-2xl py-3.5 text-sm font-bold transition ${
          saved ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:opacity-90"
        } disabled:opacity-50`}>
        {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Parish Info"}
      </button>
    </div>
  );
};

// ─── Post Card (list item with inline edit) ───────────────────────────────────

const PostCard = ({ post, category, onDelete, onSaved }: {
  post: any; category: Category; onDelete: () => void; onSaved: (updated: any) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const config = categoryConfig[category];

  const startEdit = () => {
    const initial: Record<string, string> = {};
    config.fields.forEach(f => { initial[f] = post[f] || ""; });
    setEditData(initial);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, category, post.id), { ...editData, updatedAt: serverTimestamp() });
      onSaved({ ...post, ...editData });
      setEditing(false);
    } catch { alert("Failed to update."); }
    finally { setSaving(false); }
  };

  const inp = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition";

  return (
    <div className={`rounded-2xl border bg-card overflow-hidden transition-all ${editing ? "border-primary/40 shadow-sm" : "border-border"}`}>
      {!editing ? (
        <div className="p-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{post.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {post.date && <span className="mr-1">{post.date} ·</span>}
              {post.season && <span className="mr-1">{post.season} ·</span>}
              {post.readings?.length
                ? `${post.readings.length} reading${post.readings.length > 1 ? "s" : ""}`
                : (post.body || post.lyrics || post.content || "").slice(0, 80) + "…"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {category !== "readings" && (
              <button onClick={startEdit}
                className="p-2 rounded-xl hover:bg-primary/10 text-primary transition" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={onDelete}
              className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">Editing: {post.title}</span>
            </div>
            <button onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-muted transition text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {config.fields.map(field => {
            const isLong = LONG_FIELDS.includes(field);
            const isOptional = OPTIONAL_FIELDS.includes(field);
            return (
              <div key={field}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  {FIELD_LABELS[field] ?? field}
                  {isOptional && <span className="normal-case font-normal opacity-50">— optional</span>}
                </label>
                {isLong
                  ? <textarea rows={4} value={editData[field] || ""} onChange={e => setEditData(p => ({ ...p, [field]: e.target.value }))} className={`${inp} resize-none`} />
                  : <input type="text" value={editData[field] || ""} onChange={e => setEditData(p => ({ ...p, [field]: e.target.value }))} className={inp} />
                }
              </div>
            );
          })}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Admin ───────────────────────────────────────────────────────────────

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
    const unsub = onAuthStateChanged(auth, u => { if (!u) navigate("/"); });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (activeTab !== "parish") loadPosts();
    setShowForm(false); setFormData({}); setSubReadings([emptySubReading()]);
  }, [activeTab]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, activeTab));
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setShowForm(false); setFormData({}); setSubReadings([emptySubReading()]); };

  const updateSubReading = (i: number, updates: Partial<SubReading>) => {
    setSubReadings(prev => { const n = [...prev]; n[i] = { ...n[i], ...updates }; return n; });
  };

  const handleSeasonSelect = (s: typeof SEASONS[0]) => {
    setFormData(p => ({ ...p, season: s.label, seasonSw: s.sw, seasonColor: s.color }));
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
    } catch { alert("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleSaveOther = async () => {
    const fields = categoryConfig[activeTab].fields;
    const required = fields.filter(f => !OPTIONAL_FIELDS.includes(f));
    if (required.some(f => !formData[f]?.trim())) return alert("Please fill in all required fields.");
    setSaving(true);
    try {
      await addDoc(collection(db, activeTab), { ...formData, createdAt: serverTimestamp() });
      resetForm(); loadPosts();
    } catch { console.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try { await deleteDoc(doc(db, activeTab, id)); loadPosts(); }
    catch (e) { console.error(e); }
  };

  const handlePostSaved = (updated: any) => {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const config = categoryConfig[activeTab];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Admin Panel</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">St. Gregory Catholic Parish</p>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(auth); navigate("/"); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive border border-border hover:border-destructive/40 rounded-xl px-3 py-2 transition">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex max-w-2xl mx-auto overflow-x-auto scrollbar-hide px-2">
          {TABS.map(cat => {
            const CatIcon = categoryConfig[cat].icon;
            const isActive = activeTab === cat;
            return (
              <button key={cat} onClick={() => setActiveTab(cat)}
                className={`relative flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <CatIcon className="h-3.5 w-3.5" style={isActive ? { color: categoryConfig[cat].accent } : {}} />
                {categoryConfig[cat].label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ backgroundColor: categoryConfig[cat].accent }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-5">

        {activeTab === "parish" && <ParishEditor />}

        {activeTab !== "parish" && (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: config.accent + "18" }}>
                  <Icon className="h-4 w-4" style={{ color: config.accent }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{config.label}</h2>
                  <p className="text-[10px] text-muted-foreground">
                    {loading ? "Loading…" : `${posts.length} item${posts.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              {!showForm && (
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition text-white"
                  style={{ backgroundColor: config.accent }}>
                  <Plus className="h-3.5 w-3.5" /> Add New
                </button>
              )}
            </div>

            {/* ── New item form ── */}
            {showForm && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden mb-5 shadow-sm">
                <div className="px-4 py-3.5 border-b border-border flex items-center justify-between"
                  style={{ backgroundColor: config.accent + "0d" }}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: config.accent }} />
                    <span className="text-sm font-bold text-foreground">
                      {activeTab === "readings" ? "New Mass Reading" : `New ${config.label.slice(0, -1)}`}
                    </span>
                  </div>
                  <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4">
                  {activeTab === "readings" ? (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-primary/5 border border-primary/15 px-3.5 py-3 flex gap-3 items-start">
                        <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-primary">Bible Auto-fill</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Type a reference like <code className="font-mono bg-muted px-1 rounded text-[10px]">Mark 8:1-10</code> and click Fetch. Edit the result as needed.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Date of Mass</label>
                        <input type="date" value={formData.date || ""} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Day Title</label>
                        <input type="text" placeholder="e.g. Saturday of the 5th Week in Ordinary Time"
                          value={formData.title || ""} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 mb-2" />
                        <input type="text" placeholder="Kichwa cha siku (Kiswahili) — optional"
                          value={formData.titleSw || ""} onChange={e => setFormData(p => ({ ...p, titleSw: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Liturgical Season</label>
                        <div className="flex flex-wrap gap-1.5">
                          {SEASONS.map(s => (
                            <button key={s.label} type="button" onClick={() => handleSeasonSelect(s)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                formData.season === s.label
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border text-muted-foreground hover:border-primary/40"
                              }`}>
                              <span className={`w-2 h-2 rounded-full ${SEASON_DOT[s.color]}`} />
                              {s.label}
                            </button>
                          ))}
                        </div>
                        {formData.season && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            SW: <span className="font-medium">{formData.seasonSw}</span>
                            {" · "}Color: <span className="font-medium">{formData.seasonColor}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Readings ({subReadings.length})
                          </label>
                          <button type="button" onClick={() => setSubReadings(p => [...p, emptySubReading()])}
                            className="flex items-center gap-1 text-xs font-bold text-primary">
                            <Plus className="h-3.5 w-3.5" /> Add Reading
                          </button>
                        </div>
                        <div className="space-y-3">
                          {subReadings.map((sr, i) => (
                            <SubReadingCard key={i} sr={sr} index={i} total={subReadings.length}
                              onChange={u => updateSubReading(i, u)}
                              onRemove={() => setSubReadings(p => p.filter((_, idx) => idx !== i))} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {config.fields.map(field => {
                        const isOptional = OPTIONAL_FIELDS.includes(field);
                        const isLong = LONG_FIELDS.includes(field);
                        return (
                          <div key={field}>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              {FIELD_LABELS[field] ?? field}
                              {isOptional && <span className="normal-case font-normal opacity-50">— optional</span>}
                            </label>
                            {isLong
                              ? <textarea rows={4} placeholder={isOptional ? "Kiswahili — optional" : `Enter ${(FIELD_LABELS[field] ?? field).toLowerCase()}…`}
                                  value={formData[field] || ""} onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none" />
                              : <input type="text" placeholder={isOptional ? "Kiswahili — optional" : `Enter ${(FIELD_LABELS[field] ?? field).toLowerCase()}…`}
                                  value={formData[field] || ""} onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
                            }
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 mt-5">
                    <button onClick={resetForm}
                      className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition">
                      Cancel
                    </button>
                    <button onClick={activeTab === "readings" ? handleSaveReading : handleSaveOther}
                      disabled={saving}
                      className="flex-1 rounded-xl py-3 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
                      style={{ backgroundColor: config.accent }}>
                      {saving ? "Publishing…" : "Publish"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Posts list ── */}
            {loading ? (
              <div className="flex items-center justify-center py-14 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: config.accent + "15" }}>
                  <Icon className="h-6 w-6" style={{ color: config.accent }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">No {config.label.toLowerCase()} yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add your first one using the button above</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    category={activeTab}
                    onDelete={() => handleDelete(post.id)}
                    onSaved={handlePostSaved}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;