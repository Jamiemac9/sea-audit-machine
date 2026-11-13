"""Read a resident folder the same way every time.

Usage:  python read_pack.py <resident_folder> <work_dir>

Writes into <work_dir>:
  text/NN_<file>.txt        layout text of every PDF / DOCX / HTML
  pages/NN_<file>_pXX.png   pages rendered two to an image (shows ticks and signatures)
  pack.json                 everything below in machine form
  summary.md                the index Claude reads first

Checks done mechanically (findings are still Claude's job, not this script's):
  - form field ticks and values on every PDF page (pdftotext loses these)
  - document metadata: PDF creation/modified dates, DOCX core.xml, image EXIF
  - embedded images hashed across every file (one signature pasted everywhere)
  - wording shared between files, 12+ words in a row (copy and paste between sessions)
  - risk scores that cannot be a product of 1-5 x 1-5
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

import pymupdf as fitz
from PIL import Image, ExifTags

DOC_EXT = {".pdf", ".docx", ".html", ".htm", ".mhtml", ".txt"}
IMG_EXT = {".jpg", ".jpeg", ".png", ".heic", ".webp"}
POSSIBLE_SCORES = sorted({a * b for a in range(1, 6) for b in range(1, 6)})


def safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:80]


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


WINDOW = 12  # words; a shared run this long is not chance


def words_of(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


def doc_code(name: str) -> str:
    m = re.search(r"WR[\s_-]?0?(\d+)", name, re.I)
    return f"WR-{int(m.group(1)):02d}" if m else "other"


def shared_passages(texts: dict[str, str]):
    """Passages of WINDOW+ words that appear in more than one file, however the text is
    broken into lines or labels. Returns (copied, template_like)."""
    words = {f: words_of(t) for f, t in texts.items()}
    owners: dict = defaultdict(set)
    for f, w in words.items():
        for i in range(len(w) - WINDOW + 1):
            owners[" ".join(w[i:i + WINDOW])].add(f)
    seen, found = set(), []
    for f, w in words.items():
        i = 0
        while i <= len(w) - WINDOW:
            key = " ".join(w[i:i + WINDOW])
            if len(owners[key]) < 2:
                i += 1
                continue
            j, files = i, set(owners[key])
            while j + 1 <= len(w) - WINDOW and len(owners[" ".join(w[j + 1:j + 1 + WINDOW])]) > 1:
                j += 1
                files |= owners[" ".join(w[j:j + WINDOW])]
            passage = " ".join(w[i:j + WINDOW])
            if passage not in seen and not any(passage in s for s in seen):
                seen.add(passage)
                found.append({"passage": passage, "words": j - i + WINDOW, "files": sorted(files)})
            i = j + WINDOW
    per_code = defaultdict(int)
    for f in texts:
        per_code[doc_code(f)] += 1
    copied, template_like = [], []
    for d in found:
        codes = {doc_code(f) for f in d["files"]}
        same_type_everywhere = len(codes) == 1 and per_code[next(iter(codes))] >= 3 and \
            len(d["files"]) >= 0.8 * per_code[next(iter(codes))]
        (template_like if same_type_everywhere else copied).append(d)
    copied.sort(key=lambda d: -d["words"])
    return copied, template_like


TEXT_ONLY = False


def render_two_up(doc, out_dir: Path, stem: str, dpi: int = 80) -> list[str]:
    if TEXT_ONLY:   # cross-resident check: text and shared passages only, no page images
        return []
    outs = []
    for i in range(0, len(doc), 2):
        imgs = []
        for j in (i, i + 1):
            if j < len(doc):
                pix = doc[j].get_pixmap(dpi=dpi, annots=True)
                imgs.append(Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB"))
        w = sum(im.width for im in imgs) + 10 * (len(imgs) - 1)
        h = max(im.height for im in imgs)
        canvas = Image.new("RGB", (w, h), "white")
        x = 0
        for im in imgs:
            canvas.paste(im, (x, 0))
            x += im.width + 10
        name = f"{stem}_p{i + 1:02d}" + (f"-{i + 2:02d}" if len(imgs) == 2 else "") + ".png"
        canvas.save(out_dir / name)
        outs.append(name)
    return outs


def read_pdf(path: Path, idx: int, work: Path, images: dict):
    doc = fitz.open(path)
    stem = f"{idx:02d}_{safe(path.stem)}"
    text_parts, widgets = [], []
    for pno, page in enumerate(doc, 1):
        text_parts.append(f"\n===== page {pno} =====\n" + page.get_text("text", sort=True))
        for w in page.widgets() or []:
            val = w.field_value
            if w.field_type_string == "CheckBox":
                val = "TICKED" if val not in (False, None, "", "Off") else "not ticked"
            widgets.append({"page": pno, "field": w.field_name, "type": w.field_type_string,
                            "value": val})
        for img in page.get_images(full=True):
            try:
                data = doc.extract_image(img[0])["image"]
            except Exception:
                continue
            images[sha(data)].append({"file": path.name, "page": pno, "bytes": len(data)})
    text = "".join(text_parts)
    (work / "text" / f"{stem}.txt").write_text(text, encoding="utf-8")
    meta = {k: v for k, v in (doc.metadata or {}).items() if v}
    pages = render_two_up(doc, work / "pages", stem)
    chars_per_page = len(text.strip()) / max(len(doc), 1)
    return {"pages": len(doc), "metadata": meta, "widgets": widgets, "page_images": pages,
            "text_file": f"text/{stem}.txt", "needs_ocr": chars_per_page < 100}, text


def read_docx(path: Path, idx: int, work: Path, images: dict):
    stem = f"{idx:02d}_{safe(path.stem)}"
    meta, text = {}, ""
    with zipfile.ZipFile(path) as z:
        if "docProps/core.xml" in z.namelist():
            core = z.read("docProps/core.xml").decode("utf-8", "ignore")
            for tag in ("dc:creator", "cp:lastModifiedBy", "dcterms:created", "dcterms:modified"):
                m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", core)
                if m:
                    meta[tag.split(":")[1]] = m.group(1)
        for n in z.namelist():
            if n.startswith("word/media/"):
                data = z.read(n)
                images[sha(data)].append({"file": path.name, "page": n, "bytes": len(data)})
    page_images = []
    try:  # render through PyMuPDF so the page looks like it does in Word
        doc = fitz.open(path)
        text = "".join(f"\n===== page {i} =====\n" + p.get_text("text", sort=True)
                       for i, p in enumerate(doc, 1))
        page_images = render_two_up(doc, work / "pages", stem)
    except Exception:
        import docx  # python-docx fallback for text only
        d = docx.Document(str(path))
        text = "\n".join(p.text for p in d.paragraphs)
        for t in d.tables:
            for r in t.rows:
                text += "\n" + " | ".join(c.text for c in r.cells)
    (work / "text" / f"{stem}.txt").write_text(text, encoding="utf-8")
    return {"metadata": meta, "page_images": page_images, "text_file": f"text/{stem}.txt"}, text


def read_html(path: Path, idx: int, work: Path):
    raw = path.read_text(encoding="utf-8", errors="ignore")
    raw = re.sub(r"(?is)<(script|style).*?</\1>", " ", raw)
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw))
    stem = f"{idx:02d}_{safe(path.stem)}"
    (work / "text" / f"{stem}.txt").write_text(text, encoding="utf-8")
    flags = [k for k in ("chatgpt", "openai", "claude.ai", "gemini", "copilot") if k in text.lower()]
    return {"text_file": f"text/{stem}.txt", "saved_web_page": True,
            "ai_chat_markers": flags}, text


def read_image(path: Path, images: dict):
    data = path.read_bytes()
    images[sha(data)].append({"file": path.name, "page": "-", "bytes": len(data)})
    info = {}
    try:
        exif = Image.open(path).getexif()
        for k, v in exif.items():
            tag = ExifTags.TAGS.get(k, k)
            if tag in ("DateTime", "DateTimeOriginal", "Make", "Model", "Software"):
                info[tag] = str(v)
    except Exception:
        pass
    return {"exif": info}


def main(folder: Path, work: Path):
    for sub in ("text", "pages"):
        (work / sub).mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in folder.rglob("*") if p.is_file() and not p.name.startswith(("~$", ".")))
    images: dict = defaultdict(list)
    texts: dict = {}
    entries, risk_flags = [], []
    for idx, p in enumerate(files, 1):
        ext = p.suffix.lower()
        rel = str(p.relative_to(folder))
        entry = {"n": idx, "path": rel, "size": p.stat().st_size}
        text = ""
        try:
            if ext == ".pdf":
                info, text = read_pdf(p, idx, work, images)
            elif ext == ".docx":
                info, text = read_docx(p, idx, work, images)
            elif ext in (".html", ".htm", ".mhtml"):
                info, text = read_html(p, idx, work)
            elif ext in IMG_EXT:
                info = read_image(p, images)
            elif ext == ".txt":
                text = p.read_text(encoding="utf-8", errors="ignore")
                info = {}
            else:
                info = {"skipped": "unsupported type, open it yourself if relevant"}
        except Exception as e:  # never stop the whole pack for one bad file
            info = {"error": f"{type(e).__name__}: {e}"}
        entry.update(info)
        entries.append(entry)
        if text.strip():
            texts[rel] = text
        for m in re.finditer(r"(?i)(?:risk\s*)?score\s*[:=]?\s*(\d{1,2})\b", text):
            n = int(m.group(1))
            if n not in POSSIBLE_SCORES and n <= 25:
                risk_flags.append({"file": rel, "score": n, "context": text[max(0, m.start() - 80):m.end() + 40].replace("\n", " ")})

    dup_passages, template_like = shared_passages(texts)
    reused_images = []
    for h, uses in images.items():
        files_using = sorted({u["file"] for u in uses})
        if len(files_using) > 1:
            reused_images.append({"sha256": h[:16], "bytes": uses[0]["bytes"],
                                  "file_count": len(files_using), "uses": uses})
    reused_images.sort(key=lambda d: -d["file_count"])

    pack = {"folder": str(folder), "files": entries, "repeated_passages": dup_passages, "repeated_in_every_form_of_a_type": template_like,
            "reused_images": reused_images, "impossible_risk_scores": risk_flags,
            "possible_scores": POSSIBLE_SCORES}
    (work / "pack.json").write_text(json.dumps(pack, indent=2, default=str), encoding="utf-8")

    lines = [f"# Resident pack: {folder.name}", "", f"{len(entries)} files. Read every text file and look at every page image before writing.", ""]
    lines.append("## Files")
    for e in entries:
        bits = [f"{e['n']:02d}. {e['path']}"]
        if e.get("pages"): bits.append(f"{e['pages']}p")
        if e.get("needs_ocr"): bits.append("**SCANNED - no text layer, read the page images**")
        if e.get("saved_web_page"): bits.append("saved web page")
        if e.get("ai_chat_markers"): bits.append(f"**AI chat markers: {', '.join(e['ai_chat_markers'])}**")
        if e.get("metadata"): bits.append(f"meta {e['metadata']}")
        if e.get("exif"): bits.append(f"exif {e['exif']}")
        if e.get("error"): bits.append(f"ERROR {e['error']}")
        lines.append(" - " + " | ".join(bits))
        ticked = [w for w in e.get("widgets", []) if w["value"] not in (None, "", "not ticked")]
        if ticked:
            lines.append("    fields: " + "; ".join(f"p{w['page']} {w['field']}={w['value']}" for w in ticked[:60]))
    lines += ["", "## Images used in more than one file (check signatures / evidence photos)"]
    lines += [f" - {r['sha256']} ({r['bytes']} bytes) in {r['file_count']} files: " +
              ", ".join(sorted({u['file'] for u in r['uses']})) for r in reused_images[:40]] or [" - none"]
    lines += ["", f"## Wording shared between files, {WINDOW}+ words in a row (check for copy and paste)",
              "Lower case and without punctuation: find the passage in the text files to quote or crop it."]
    lines += [f" - {d['words']} words in {', '.join(d['files'])}: \"{d['passage'][:300]}\"" for d in dup_passages[:60]] or [" - none"]
    lines += ["", "## Wording found in nearly every form of one type (probably the form's own printed text, glance only)"]
    lines += [f" - {len(d['files'])} files: \"{d['passage'][:120]}\"" for d in template_like[:15]] or [" - none"]
    lines += ["", "## Risk scores that are not a product of 1-5 x 1-5 (confirm against the WR-09 itself)"]
    lines += [f" - {r['file']}: {r['score']} ... {r['context']}" for r in risk_flags] or [" - none found by text search"]
    (work / "summary.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Read {len(entries)} files into {work}. Start with summary.md")


if __name__ == "__main__":
    TEXT_ONLY = "--text-only" in sys.argv
    if TEXT_ONLY:
        sys.argv.remove("--text-only")
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).expanduser().resolve(), Path(sys.argv[2]).expanduser().resolve())
