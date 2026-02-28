

const fs   = require("fs");
const path = require("path");

// ─── Configure these paths ────────────────────────────────────────────────────

// Where your extracted ZIP files live (agano-kale-edition.json etc.)
const INPUT_FILES = [
  path.join(__dirname, "src", "hooks", "json", "split_version", "agano-kale-edition.json"),
  path.join(__dirname, "src", "hooks", "json", "split_version", "agano-jipya-edition.json"),
];

// Where per-book files will be written (will be created if missing)
const OUTPUT_DIR = path.join(__dirname, "src", "bible", "swahili");

// ─── Book name → safe filename map ───────────────────────────────────────────
// Swahili book names with spaces or special chars get underscores in filenames,
// matching the same convention as your KJV files.

const toFileName = (bookName) =>
  bookName.trim().replace(/\s+/g, "_");

// ─── Main ─────────────────────────────────────────────────────────────────────

function convert() {
  // Create output dir if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created directory: ${OUTPUT_DIR}`);
  }

  let totalBooks = 0;

  for (const inputPath of INPUT_FILES) {
    if (!fs.existsSync(inputPath)) {
      console.warn(`⚠️  File not found, skipping: ${inputPath}`);
      continue;
    }

    console.log(`\n📖 Processing: ${path.basename(inputPath)}`);
    const raw  = fs.readFileSync(inputPath, "utf-8");
    const data = JSON.parse(raw);

    const books = data["BIBLEBOOK"];
    if (!books || !Array.isArray(books)) {
      console.error(`❌  Unexpected format in ${inputPath} — no BIBLEBOOK array found.`);
      continue;
    }

    for (const book of books) {
      const bookName = book["book_name"]?.trim();
      if (!bookName) {
        console.warn(`  ⚠️  Skipping book with no name (number: ${book["book_number"]})`);
        continue;
      }

      // Normalise CHAPTER — handle array, object, or missing
      let rawChapters = book["CHAPTER"] ?? book["chapter"] ?? [];
      if (!Array.isArray(rawChapters)) {
        // Sometimes a single-chapter book is an object, not an array
        rawChapters = [rawChapters];
      }

      // Transform chapters
      const chapters = rawChapters.map((ch) => {
        // Normalise VERSES the same way
        let rawVerses = ch["VERSES"] ?? ch["verses"] ?? [];
        if (!Array.isArray(rawVerses)) {
          rawVerses = [rawVerses];
        }
        return {
          chapter: String(ch["chapter_number"] ?? ch["chapter"] ?? "1"),
          verses: rawVerses.map((v) => ({
            verse: String(v["verse_number"] ?? v["verse"] ?? "1"),
            text:  (v["verse_text"] ?? v["text"] ?? "").trim(),
          })),
        };
      });

      // Build output object matching your KJV format exactly
      const output = {
        book:     bookName,
        chapters,
      };

      const fileName = toFileName(bookName) + ".json";
      const outPath  = path.join(OUTPUT_DIR, fileName);

      fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
      console.log(`  ✔  ${bookName.padEnd(25)} → ${fileName}  (${chapters.length} chapters)`);
      totalBooks++;
    }
  }

  console.log(`\n🎉 Done! Converted ${totalBooks} books into ${OUTPUT_DIR}\n`);
}

convert();
