import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  List,
  Search,
  X,
  ChevronDown,
  Minus,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Verse {
  verse: string;
  text: string;
}

interface Chapter {
  chapter: string;
  verses: Verse[];
}

interface BibleBook {
  book: string;
  chapters: Chapter[];
}

// ─── Book lists ───────────────────────────────────────────────────────────────

const OLD_TESTAMENT_EN = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
];
const NEW_TESTAMENT_EN = [
  "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
  "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians",
  "1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
  "1 John","2 John","3 John","Jude","Revelation",
];

const OLD_TESTAMENT_SW = [
  "Mwanzo","Kutoka","Mambo ya Walawi","Hesabu","Kumbukumbu la Torati","Yoshua","Waamuzi","Ruthu",
  "1 Samueli","2 Samueli","1 Wafalme","2 Wafalme","1 Mambo ya Nyakati","2 Mambo ya Nyakati","Ezra",
  "Nehemia","Esta","Ayubu","Zaburi","Mithali","Mhubiri","Wimbo Ulio Bora",
  "Isaya","Yeremia","Maombolezo","Ezekieli","Danieli","Hosea","Yoeli","Amosi",
  "Obadia","Yona","Mika","Nahumu","Habakuki","Sefania","Hagai","Zekaria","Malaki",
];
const NEW_TESTAMENT_SW = [
  "Mathayo","Marko","Luka","Yohana","Matendo ya Mitume","Warumi","1 Wakorintho","2 Wakorintho",
  "Wagalatia","Waefeso","Wafilipi","Wakolosai","1 Wathesalonike","2 Wathesalonike",
  "1 Timotheo","2 Timotheo","Tito","Filemoni","Waebrania","Yakobo","1 Petro","2 Petro",
  "1 Yohana","2 Yohana","3 Yohana","Yuda","Ufunuo",
];

const ALL_BOOKS_EN = [...OLD_TESTAMENT_EN, ...NEW_TESTAMENT_EN];
const ALL_BOOKS_SW = [...OLD_TESTAMENT_SW, ...NEW_TESTAMENT_SW];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toFileName = (name: string) => name.replace(/\s+/g, "_");

// ─── Component ────────────────────────────────────────────────────────────────

const BibleReader = () => {
  // language is "en" or "sw" — driven by the app-wide toggle, not local state
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const isSwahili = language === "sw";

  // ── State ──
  const [bookIndex, setBookIndex] = useState<number>(0);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [bookData, setBookData] = useState<BibleBook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [highlightedVerse, setHighlightedVerse] = useState<string | null>(null);

  const verseContainerRef = useRef<HTMLDivElement>(null);

  // Derived — pick the right book list based on app language
  const OT  = isSwahili ? OLD_TESTAMENT_SW : OLD_TESTAMENT_EN;
  const NT  = isSwahili ? NEW_TESTAMENT_SW : NEW_TESTAMENT_EN;
  const ALL = isSwahili ? ALL_BOOKS_SW     : ALL_BOOKS_EN;
  const selectedBookDisplay = ALL[bookIndex];

  // ── Load book JSON ──
  const loadBook = useCallback(async (idx: number, sw: boolean) => {
    setLoading(true);
    setError(null);
    try {
      let data: BibleBook | null = null;

      if (sw) {
        const fileName = toFileName(ALL_BOOKS_SW[idx]);
        const mod = await import(`../bible/swahili/${fileName}.json`);
        data = mod.default as BibleBook;
      } else {
        const fileName = toFileName(ALL_BOOKS_EN[idx]);
        try {
          const mod = await import(`../bible/kjv/${fileName}.json`);
          data = mod.default as BibleBook;
        } catch {
          const mod = await import(`../bible/${fileName}.json`);
          data = mod.default as BibleBook;
        }
      }

      if (!data) throw new Error("not found");
      setBookData(data);
    } catch {
      setError(
        sw
          ? `Haikuweza kupakia "${ALL_BOOKS_SW[idx]}". Hakikisha convert-swahili.cjs ilifanya kazi.`
          : `Could not load "${ALL_BOOKS_EN[idx]}". Check src/bible/kjv/ has the file.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever book or language changes
  useEffect(() => {
    loadBook(bookIndex, isSwahili);
    setSelectedChapter(1);
    setHighlightedVerse(null);
  }, [bookIndex, isSwahili, loadBook]);

  // Scroll to top on chapter change
  useEffect(() => {
    verseContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setHighlightedVerse(null);
  }, [selectedChapter]);

  // Clamp sentinel (999 = last chapter) after book data loads
  useEffect(() => {
    if (selectedChapter === 999 && bookData) {
      setSelectedChapter(bookData.chapters.length);
    }
  }, [bookData, selectedChapter]);

  // ── Derived ──
  const chapterData = bookData?.chapters.find(
    (c) => parseInt(c.chapter) === selectedChapter
  );
  const totalChapters = bookData?.chapters.length ?? 0;

  const filteredVerses = chapterData?.verses.filter((v) =>
    searchQuery ? v.text.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const bookSearch = (list: string[]) =>
    list.filter((b) => b.toLowerCase().includes(searchQuery.toLowerCase()));

  const prevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter((c) => c - 1);
    } else if (bookIndex > 0) {
      setBookIndex((i) => i - 1);
      setSelectedChapter(999);
    }
  };

  const nextChapter = () => {
    if (selectedChapter < totalChapters) {
      setSelectedChapter((c) => c + 1);
    } else if (bookIndex < ALL_BOOKS_EN.length - 1) {
      setBookIndex((i) => i + 1);
      setSelectedChapter(1);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* ── Top Bar ── */}
      <header className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Book selector */}
        <button
          onClick={() => { setShowBookPicker(true); setShowChapterPicker(false); setSearchQuery(""); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-accent transition min-w-0"
        >
          <BookOpen className="h-4 w-4 text-accent shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate max-w-[110px]">
            {selectedBookDisplay}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>

        {/* Chapter selector */}
        <button
          onClick={() => { setShowChapterPicker(true); setShowBookPicker(false); setSearchQuery(""); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-accent transition shrink-0"
        >
          <List className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{selectedChapter}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        <div className="flex-1" />

        {/* Font − */}
        <button onClick={() => setFontSize((f) => Math.max(12, f - 2))}
          className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground shrink-0">
          <Minus className="h-4 w-4" />
        </button>
        {/* Font + */}
        <button onClick={() => setFontSize((f) => Math.min(26, f + 2))}
          className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground shrink-0">
          <Plus className="h-4 w-4" />
        </button>

        {/* Search */}
        <button
          onClick={() => setShowSearch((s) => !s)}
          className={`p-1.5 rounded-lg transition shrink-0 ${
            showSearch ? "bg-accent text-accent-foreground" : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <Search className="h-4 w-4" />
        </button>
      </header>

      {/* ── Search Bar ── */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-border bg-background">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder={t("Search verses in this chapter…", "Tafuta mistari katika sura hii…")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Book Picker Modal ── */}
      {showBookPicker && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button onClick={() => { setShowBookPicker(false); setSearchQuery(""); }}
              className="p-2 rounded-lg hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
            <h2 className="font-display font-bold text-foreground text-lg">
              {t("Select Book", "Chagua Kitabu")}
            </h2>
          </div>
          <div className="px-4 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder={t("Search books…", "Tafuta kitabu…")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {bookSearch(OT).length > 0 && (
              <>
                <p className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 sticky top-0">
                  {t("Old Testament", "Agano la Kale")}
                </p>
                <div className="grid grid-cols-2 gap-1 px-3 py-2">
                  {bookSearch(OT).map((bookName) => {
                    const idx = ALL.indexOf(bookName);
                    return (
                      <button
                        key={bookName}
                        onClick={() => { setBookIndex(idx); setShowBookPicker(false); setSearchQuery(""); }}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition ${
                          idx === bookIndex
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-card text-foreground"
                        }`}
                      >
                        {bookName}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {bookSearch(NT).length > 0 && (
              <>
                <p className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 sticky top-0">
                  {t("New Testament", "Agano Jipya")}
                </p>
                <div className="grid grid-cols-2 gap-1 px-3 py-2">
                  {bookSearch(NT).map((bookName) => {
                    const idx = ALL.indexOf(bookName);
                    return (
                      <button
                        key={bookName}
                        onClick={() => { setBookIndex(idx); setShowBookPicker(false); setSearchQuery(""); }}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition ${
                          idx === bookIndex
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-card text-foreground"
                        }`}
                      >
                        {bookName}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Chapter Picker Modal ── */}
      {showChapterPicker && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button onClick={() => setShowChapterPicker(false)}
              className="p-2 rounded-lg hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
            <h2 className="font-display font-bold text-foreground text-lg">
              {selectedBookDisplay} — {t("Select Chapter", "Chagua Sura")}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
                <button
                  key={ch}
                  onClick={() => { setSelectedChapter(ch); setShowChapterPicker(false); }}
                  className={`aspect-square rounded-xl text-sm font-semibold transition ${
                    ch === selectedChapter
                      ? "bg-accent text-accent-foreground"
                      : "bg-card border border-border hover:border-accent text-foreground"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Chapter heading ── */}
      <div className="px-5 pt-4 pb-1 flex items-baseline gap-2 flex-wrap">
        <h1 className="font-display text-xl font-bold text-foreground">
          {selectedBookDisplay}{" "}
          <span className="text-accent">{selectedChapter}</span>
        </h1>
        <span className="text-xs text-muted-foreground">
          {isSwahili ? "Kiswahili" : "King James Version"}
        </span>
        {searchQuery && filteredVerses && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredVerses.length} {t("results", "matokeo")}
          </span>
        )}
      </div>

      {/* ── Verses ── */}
      <div ref={verseContainerRef} className="flex-1 overflow-y-auto px-5 py-3 pb-28">
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">{t("Loading…", "Inapakia…")}</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive space-y-1">
            <p className="font-semibold">{t("Could not load this book", "Imeshindwa kupakia kitabu hiki")}</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        )}

        {!loading && !error && filteredVerses && (
          <div className="space-y-0.5">
            {filteredVerses.map((verse) => (
              <button
                key={verse.verse}
                onClick={() =>
                  setHighlightedVerse((h) => (h === verse.verse ? null : verse.verse))
                }
                className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                  highlightedVerse === verse.verse
                    ? "bg-accent/15 border-l-2 border-accent pl-3"
                    : "hover:bg-muted/50"
                }`}
              >
                <span className="leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                  <sup className="text-accent font-bold mr-1.5 text-[11px] select-none">
                    {verse.verse}
                  </sup>
                  {verse.text}
                </span>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && !chapterData && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {t("No content available", "Hakuna maudhui")}
          </div>
        )}
      </div>

      {/* ── Prev / Next Chapter Bar ── */}
      <div className="fixed bottom-16 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur-sm border-t border-border">
        <button
          onClick={prevChapter}
          disabled={selectedChapter === 1 && bookIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border hover:border-accent disabled:opacity-30 transition text-sm font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("Prev", "Iliyopita")}
        </button>

        <span className="text-xs text-muted-foreground font-medium">
          {selectedChapter} / {totalChapters}
        </span>

        <button
          onClick={nextChapter}
          disabled={selectedChapter === totalChapters && bookIndex === ALL_BOOKS_EN.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border hover:border-accent disabled:opacity-30 transition text-sm font-medium"
        >
          {t("Next", "Inayofuata")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BibleReader;