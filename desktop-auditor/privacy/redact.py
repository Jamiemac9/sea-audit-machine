"""Redaction in: make a copy of a round that Claude can audit without seeing who anyone is.

Runs entirely on this computer. No AI service is involved in redaction.

What is replaced, consistently across every file in the round:
  resident names (from the folder names)        -> [RESIDENT_A], [RESIDENT_B] ...
  any other person's name (your list + found)   -> [PERSON_1], [PERSON_2] ...
  street addresses                              -> [ADDRESS_1] ...
  postcodes, phone numbers, emails              -> [POSTCODE_1], [PHONE_1], [EMAIL_1] ...
  NI numbers, NHS numbers, dates of birth       -> [NI_NUMBER_1], [NHS_NUMBER_1], [DOB_1] ...
  bank sort codes and account numbers           -> [BANK_DETAILS_1] ...

Dates of sessions, document codes, services, goals and the record text stay, because the
audit depends on them. The swap list (the "key") is written to the private folder only and
is what puts real names back afterwards (see reidentify.py).

PDFs with a text layer are redacted in place (boxes over the words, text removed, form
fields and metadata cleaned). Word files are converted to PDF first when LibreOffice is
installed. Scanned pages and photos are read with Tesseract OCR when it is installed and
the matched words are blacked out; without it they are held back and listed. Anything that
cannot be redacted is never copied across.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf as fitz
from PIL import Image

try:
    import spacy
    _NLP = spacy.load("en_core_web_sm", disable=["lemmatizer"])
except Exception:  # optional: names you list and the folder names are still caught
    _NLP = None

try:
    import os as _os
    import pytesseract
    for _exe in (r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                 _os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
                 "/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"):
        if _os.path.exists(_exe) and not shutil.which("tesseract"):
            pytesseract.pytesseract.tesseract_cmd = _exe  # installers often don't add it to PATH
            break
    pytesseract.get_tesseract_version()
    _OCR = True
except Exception:
    _OCR = False

TEXT_EXT = {".txt", ".md", ".csv"}
HTML_EXT = {".html", ".htm", ".mhtml"}
IMG_EXT = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}

# words that look like names to a model but are part of the job, never redacted alone
KEEP_WORDS = {
    "support", "worker", "resident", "session", "goal", "goals", "plan", "risk", "housing", "manager",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february",
    "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    "universal", "credit", "jobcentre", "council", "nhs", "gp", "dr", "mr", "mrs", "ms", "miss", "the",
    "and", "for", "with", "room", "check", "service", "team", "officer", "health", "mental", "agent",
    "key", "staff", "client", "tenant", "landlord", "police", "probation", "hospital", "centre", "road",
    "street", "date", "name", "signature", "signed", "yes", "no", "n/a", "will", "can", "said", "told",
}

STREET = (r"Road|Rd|Street|St|Avenue|Ave|Lane|Ln|Close|Drive|Dr|Way|Crescent|Grove|Place|Gardens|"
          r"Court|Ct|Terrace|Hill|Park|Square|Walk|Mews|Rise|View|Row|Green|Parade")
PATTERNS = [
    ("EMAIL", re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")),
    ("NI_NUMBER", re.compile(r"\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b", re.I)),
    ("NHS_NUMBER", re.compile(r"\b\d{3}\s?\d{3}\s?\d{4}\b")),
    ("PHONE", re.compile(r"(?<!\d)(?:\+44\s?7\d{3}|07\d{3}|\+44\s?\(?0?\)?\s?\d{2,4}|0\d{2,4})[\s-]?\d{3}[\s-]?\d{3,4}(?!\d)")),
    ("BANK_DETAILS", re.compile(r"(?i)sort\s*code\s*:?\s*\d{2}[-\s]?\d{2}[-\s]?\d{2}|\b(?:account|acc)(?:ount)?\s*(?:no\.?|number)?\s*:?\s*\d{8}\b")),
    ("POSTCODE", re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b", re.I)),
    ("ADDRESS", re.compile(rf"\b(?:Flat|Room|Apartment)?\s?\d{{1,4}}[A-Za-z]?,?\s+(?:[A-Z][a-z]+\s+){{1,3}}(?:{STREET})\b")),
    ("DOB", re.compile(r"(?i)(?:d\.?o\.?b\.?|date\s+of\s+birth)\s*[:\-]?\s*\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}")),
]



def run_office(office: str, args: list, timeout: int = 240) -> bool:
    """Run LibreOffice so it can never hang the audit: its own throwaway profile (so a copy
    already open, or a first-run dialog, can't block it) and the whole process tree is killed
    if it runs past the timeout."""
    import tempfile, shutil as _sh
    prof = Path(tempfile.mkdtemp(prefix="sa-office-"))
    cmd = [office, f"-env:UserInstallation={prof.as_uri()}", "--headless", "--norestore", "--nologo", *args]
    nt = os.name == "nt"
    p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL,
                         **({"creationflags": 0x08000000} if nt else {"start_new_session": True}))
    try:
        p.wait(timeout=timeout)
        return p.returncode == 0
    except subprocess.TimeoutExpired:
        if nt:
            subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True, creationflags=0x08000000)
        else:
            import signal
            try:
                os.killpg(p.pid, signal.SIGKILL)
            except Exception:
                p.kill()
        return False
    finally:
        _sh.rmtree(prof, ignore_errors=True)

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def tokens(s: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9@.+'-]+", s.lower()) if t.strip(".'-")]


@dataclass
class Key:
    """The swap list. Never sent anywhere: it lives in the private folder."""
    terms: dict = field(default_factory=dict)       # normalised original -> placeholder
    display: dict = field(default_factory=dict)     # placeholder -> original as first written
    counters: dict = field(default_factory=dict)

    def label(self, kind: str) -> str:
        n = self.counters.get(kind, 0) + 1
        self.counters[kind] = n
        if kind == "RESIDENT":
            return f"[RESIDENT_{chr(64 + n) if n <= 26 else n}]"
        return f"[{kind}_{n}]"

    def add(self, original: str, kind: str, placeholder: str | None = None) -> str:
        k = norm(original)
        if not k or k in KEEP_WORDS:
            return ""
        if k in self.terms:
            return self.terms[k]
        ph = placeholder or self.label(kind)
        self.terms[k] = ph
        self.display.setdefault(ph, original.strip())  # the first spelling seen is what goes back
        return ph

    def save(self, path: Path):
        path.write_text(json.dumps({"terms": self.terms, "display": self.display,
                                    "counters": self.counters}, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "Key":
        d = json.loads(path.read_text(encoding="utf-8"))
        return cls(d["terms"], d["display"], d["counters"])


class Redactor:
    def __init__(self, residents: list[str], other_names: list[str] = (), use_ner: bool = True):
        self.key = Key()
        self.use_ner = use_ner and _NLP is not None
        self.residents = {}
        parts_seen: dict[str, set] = {}
        for r in residents:
            ph = self.key.add(r, "RESIDENT")
            self.residents[r] = ph
            for p in tokens(r):
                if len(p) >= 3:
                    parts_seen.setdefault(p, set()).add(ph)
        # a first name or surname alone identifies a resident only if no one else shares it
        for p, owners in parts_seen.items():
            if len(owners) == 1:
                self.key.add(p, "RESIDENT", next(iter(owners)))
        for n in other_names:
            n = n.strip()
            if n:
                self._add_person(n)

    def _add_person(self, name: str):
        # a model can glue a form label or the next line onto a name ("Name: Sam Sample\nDOB"):
        # split on line breaks and colons and take each piece on its own
        for piece in re.split(r"[\n\r:|;,()]+", name):
            words = re.sub(r"^(?:mr|mrs|ms|miss|dr)\.?\s+", "", piece.strip(), flags=re.I).split()
            while words and (norm(words[0]) in KEEP_WORDS or re.fullmatch(r"[A-Z]{2,4}", words[0])):
                words.pop(0)
            while words and (norm(words[-1]) in KEEP_WORDS or re.fullmatch(r"[A-Z]{2,4}", words[-1])):
                words.pop()
            clean = " ".join(words)
            toks = [t for t in tokens(clean) if t not in KEEP_WORDS]
            if not toks or len(clean) < 3 or norm(clean) in self.key.terms:
                continue
            known = [self.key.terms.get(t) for t in toks]
            if all(known):  # every part is already someone we know: nothing new
                continue
            ph = next((k for k in known if k), None)  # "Jordan Patel" reuses Jordan's label
            ph = self.key.add(clean, "PERSON", ph)
            for t in toks:
                if len(t) >= 3 and t not in self.key.terms:
                    self.key.add(t, "PERSON", ph)

    # ---- pass 1: learn every name and pattern in the round ----
    def learn(self, text: str):
        for kind, rx in PATTERNS:
            for m in rx.finditer(text):
                self.key.add(m.group(0), kind)
        if self.use_ner and text.strip():
            for chunk in _chunks(text, 90_000):
                for ent in _NLP(chunk).ents:
                    if ent.label_ == "PERSON" and len(ent.text) > 2 and not re.search(r"\d|\[", ent.text):
                        self._add_person(ent.text)

    # ---- pass 2: apply ----
    def spans(self, text: str) -> list[tuple[int, int, str]]:
        found = []
        low = text.lower()
        for kind, rx in PATTERNS:
            for m in rx.finditer(text):
                ph = self.key.terms.get(norm(m.group(0))) or self.key.add(m.group(0), kind)
                found.append((m.start(), m.end(), ph))
        for term, ph in self.key.terms.items():
            if " " not in term and not re.fullmatch(r"[a-z'-]+", term):
                continue  # pattern values are handled above
            rx = re.compile(r"(?<![a-z0-9])" + r"\s+".join(map(re.escape, term.split())) + r"(?![a-z0-9])")
            for m in rx.finditer(low):
                found.append((m.start(), m.end(), ph))
        found.sort(key=lambda s: (s[0], -(s[1] - s[0])))
        out, end = [], -1
        for s in found:  # longest match wins where two overlap
            if s[0] >= end:
                out.append(s)
                end = s[1]
        return out

    def text(self, text: str) -> str:
        for a, b, ph in reversed(self.spans(text)):
            text = text[:a] + ph + text[b:]
        return text

    def originals(self) -> list[tuple[str, str]]:
        """(original, placeholder) pairs, longest first, for searching pages."""
        return sorted(self.key.terms.items(), key=lambda kv: -len(kv[0]))


def _chunks(text, size):
    for i in range(0, len(text), size):
        yield text[i:i + size]


# ---------- per-file redaction ----------

def _word_hits(words, needle_tokens):
    """Rects of every run of page words equal to needle_tokens (whole words only)."""
    norm_words = [re.sub(r"^[^\w@+]+|[^\w@+]+$", "", w[4].lower()) for w in words]
    hits, n = [], len(needle_tokens)
    for i in range(len(norm_words) - n + 1):
        if norm_words[i:i + n] == needle_tokens:
            r = fitz.Rect(words[i][:4])
            for w in words[i + 1:i + n]:
                r |= fitz.Rect(w[:4])
            hits.append(r)
    return hits


def redact_pdf(src: Path, dst: Path, rd: Redactor) -> dict:
    doc = fitz.open(src)
    boxes, scanned_pages = 0, []
    for page in doc:
        text = page.get_text("text")
        if len(text.strip()) < 40 and page.get_images():
            scanned_pages.append(page.number)
            continue
        words = page.get_text("words")
        for span_a, span_b, ph in rd.spans(text):
            needle = [re.sub(r"^[^\w@+]+|[^\w@+]+$", "", t) for t in text[span_a:span_b].lower().split()]
            for r in _word_hits(words, [t for t in needle if t]):
                page.add_redact_annot(r, text=ph, fontsize=6, fill=(0.88, 0.88, 0.88))
                boxes += 1
        for w in page.widgets() or []:
            if isinstance(w.field_value, str) and w.field_value:
                new = rd.text(w.field_value)
                if new != w.field_value:
                    w.field_value = new
                    w.update()
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
    if scanned_pages:
        if not _OCR:
            doc.close()
            return {"status": "held back", "reason": "scanned pages and OCR (Tesseract) is not installed"}
        for pno in scanned_pages:
            boxes += _ocr_redact_page(doc, pno, rd)
    meta = {k: (rd.text(v) if isinstance(v, str) else v) for k, v in (doc.metadata or {}).items()}
    doc.set_metadata(meta)
    doc.del_xml_metadata()
    doc.save(dst, garbage=4, deflate=True)
    return {"status": "redacted", "boxes": boxes, "ocr_pages": len(scanned_pages)}


def _ocr_redact_page(doc, pno: int, rd: Redactor) -> int:
    """Rasterise a scanned page, OCR it, black out matched words, replace the page with the image."""
    page = doc[pno]
    pix = page.get_pixmap(dpi=200)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    img, n, text, lines = _ocr_redact_image(img, rd, with_lines=True)
    rect = page.rect
    doc.delete_page(pno)
    new = doc.new_page(pno, width=rect.width, height=rect.height)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        img.save(f.name)
        new.insert_image(new.rect, filename=f.name)
    _text_layer(new, rd.text(lines))
    return n


def _text_layer(page, text: str):
    """Invisible text over the page image, so the page can be read and searched as text.
    (Names in it are already swapped for labels.)"""
    if not text.strip():
        return
    for size in (6, 4, 3, 2, 1.5, 1):
        if page.insert_textbox(page.rect + (4, 4, -4, -4), text, fontsize=size, render_mode=3) >= 0:
            return
    page.insert_textbox(page.rect, text[:20000], fontsize=1, render_mode=3)


def _ocr_redact_image(img: Image.Image, rd: Redactor, with_lines: bool = False):
    from PIL import ImageDraw
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    words = [(data["left"][i], data["top"][i], data["left"][i] + data["width"][i],
              data["top"][i] + data["height"][i], data["text"][i]) for i in range(len(data["text"]))
             if data["text"][i].strip()]
    text = " ".join(w[4] for w in words)
    rd.learn(text)
    draw = ImageDraw.Draw(img)
    n = 0
    for a, b, ph in rd.spans(text):
        needle = [re.sub(r"^[^\w@+]+|[^\w@+]+$", "", t) for t in text[a:b].lower().split()]
        for r in _word_hits([(*w[:4], w[4]) for w in words], [t for t in needle if t]):
            draw.rectangle([r.x0 - 2, r.y0 - 2, r.x1 + 2, r.y1 + 2], fill="black")
            draw.text((r.x0 + 2, r.y0), ph, fill="white", font=_label_font(max(10, int((r.y1 - r.y0) * 0.6))))
            n += 1
    if with_lines:   # the same words, kept in their lines, for the page's text layer
        rows: dict = {}
        for i, t in enumerate(data["text"]):
            if t.strip():
                rows.setdefault((data["block_num"][i], data["par_num"][i], data["line_num"][i]), []).append(t)
        return img, n, text, "\n".join(" ".join(ws) for ws in rows.values())
    return img, n, text


def _label_font(size):
    from PIL import ImageFont
    for name in ("DejaVuSans.ttf", "Arial.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf",
                 "C:/Windows/Fonts/arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def docx_metadata(path: Path) -> dict:
    meta = {}
    try:
        with zipfile.ZipFile(path) as z:
            core = z.read("docProps/core.xml").decode("utf-8", "ignore")
        for tag in ("dc:creator", "cp:lastModifiedBy", "dcterms:created", "dcterms:modified"):
            m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", core)
            if m:
                meta[tag.split(":")[1]] = m.group(1)
    except Exception:
        pass
    return meta


def soffice():
    from shutil import which
    for p in (which("soffice"), which("libreoffice"), "/Applications/LibreOffice.app/Contents/MacOS/soffice",
              r"C:\Program Files\LibreOffice\program\soffice.exe"):
        if p and Path(p).exists():
            return p
    return None


def docx_to_pdf(src: Path, out_dir: Path) -> Path | None:
    office = soffice()
    if not office:
        return None
    run_office(office, ["--convert-to", "pdf", "--outdir", str(out_dir), str(src)])
    pdf = out_dir / (src.stem + ".pdf")
    return pdf if pdf.exists() else None


def extract_text(path: Path) -> str:
    ext = path.suffix.lower()
    try:
        if ext == ".pdf":
            doc = fitz.open(path)
            parts = [p.get_text("text") for p in doc]
            parts += [str(w.field_value) for p in doc for w in (p.widgets() or []) if isinstance(w.field_value, str)]
            parts += [v for v in (doc.metadata or {}).values() if isinstance(v, str)]
            return "\n".join(parts)
        if ext == ".docx":
            import docx
            d = docx.Document(str(path))
            t = [p.text for p in d.paragraphs]
            for tb in d.tables:
                for row in tb.rows:
                    t += [c.text for c in row.cells]
            return "\n".join(t + list(docx_metadata(path).values()))
        if ext in TEXT_EXT:
            return path.read_text(encoding="utf-8", errors="ignore")
        if ext in HTML_EXT:
            raw = path.read_text(encoding="utf-8", errors="ignore")
            return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style).*?</\1>", " ", raw)))
    except Exception:
        return ""
    return ""


def redact_round(round_dirs: dict[str, Path], out_root: Path, private: Path,
                 other_names: list[str] = (), use_ner: bool = True) -> dict:
    """round_dirs: resident name -> their folder. Writes the redacted copy to out_root (the
    only thing Claude sees) and the key and report to private. Returns the report."""
    rd = Redactor(list(round_dirs), other_names, use_ner)
    files = {name: sorted(p for p in d.rglob("*") if p.is_file() and not p.name.startswith((".", "~$")))
             for name, d in round_dirs.items()}
    for fl in files.values():          # pass 1: learn names and identifiers across the round
        for p in fl:
            rd.learn(p.stem.replace("_", " "))
            rd.learn(extract_text(p))
    report = {"files": [], "ner": rd.use_ner, "ocr": _OCR, "office": bool(soffice())}
    tmp = Path(tempfile.mkdtemp())
    for name, fl in files.items():
        res_out = out_root / rd.residents[name].strip("[]")
        for p in fl:
            rel = p.relative_to(round_dirs[name])
            rel_red = Path(*[rd.text(part.replace("_", " ")) for part in rel.parts])
            entry = {"resident": rd.residents[name], "file": str(rel), "as": str(rel_red)}
            dst = res_out / rel_red
            dst.parent.mkdir(parents=True, exist_ok=True)
            ext = p.suffix.lower()
            try:
                if ext == ".pdf":
                    entry.update(redact_pdf(p, dst, rd))
                    entry["original_pdf"] = str(p)
                elif ext == ".docx":
                    meta = docx_metadata(p)
                    pdf = docx_to_pdf(p, tmp)
                    if pdf:
                        keep = private / "originals" / res_out.name / rel.with_suffix(".pdf")
                        keep.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy(pdf, keep)
                        entry.update(redact_pdf(pdf, dst.with_suffix(".pdf"), rd))
                        entry["as"] = str(rel_red.with_suffix(".pdf"))
                        entry["original_pdf"] = str(keep)
                    else:
                        dst.with_suffix(".txt").write_text(rd.text(extract_text(p)), encoding="utf-8")
                        entry.update(status="text only", reason="LibreOffice not installed, layout not kept")
                    if meta:  # who last saved it and when is evidence: keep it, redacted
                        dst.with_suffix(".metadata.txt").write_text(
                            "\n".join(f"{k}: {rd.text(v)}" for k, v in meta.items()), encoding="utf-8")
                elif ext in TEXT_EXT or ext in HTML_EXT:
                    dst.with_suffix(".txt").write_text(rd.text(extract_text(p)), encoding="utf-8")
                    entry["status"] = "redacted"
                elif ext in IMG_EXT:
                    if _OCR:
                        img = Image.open(p).convert("RGB")  # re-saving drops EXIF (location, device)
                        img, n, _ = _ocr_redact_image(img, rd)
                        img.save(dst.with_suffix(".png"))
                        entry.update(status="redacted", boxes=n, note="photo: names written in it are only caught if OCR can read them")
                    else:
                        entry.update(status="held back", reason="photo and OCR (Tesseract) is not installed")
                else:
                    entry.update(status="held back", reason=f"{ext or 'no extension'} files are not redacted")
            except Exception as e:
                entry.update(status="held back", reason=f"could not redact: {type(e).__name__}")
                for leftover in dst.parent.glob(dst.stem + "*"):
                    leftover.unlink(missing_ok=True)
            report["files"].append(entry)
    shutil.rmtree(tmp, ignore_errors=True)
    report["leaks"] = leak_check(out_root, rd)
    report["possible_names"] = possible_names(out_root) if rd.use_ner else []
    report["counts"] = {}
    for ph in rd.key.display:
        kind = re.sub(r"_[A-Z0-9]+\]$", "", ph).strip("[")
        report["counts"][kind] = report["counts"].get(kind, 0) + 1
    private.mkdir(parents=True, exist_ok=True)
    rd.key.save(private / "key.json")
    (private / "redaction-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def redacted_text_of(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return extract_text(path)
    if path.suffix.lower() in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    return ""


def leak_check(root: Path, rd: Redactor) -> list[dict]:
    """Search every redacted file, and every file name, for every original value."""
    leaks = []
    for p in root.rglob("*"):
        hay = p.name.lower() + "\n" + (redacted_text_of(p).lower() if p.is_file() else "")
        for term, ph in rd.key.terms.items():
            if re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", hay):
                leaks.append({"file": str(p.relative_to(root)), "found": ph})
    return leaks


def possible_names(root: Path) -> list[dict]:
    """Second opinion: anything still reading as a person's name after redaction."""
    out = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        text = redacted_text_of(p)
        for chunk in _chunks(text, 90_000):
            for ent in _NLP(chunk).ents:
                if ent.label_ == "PERSON" and "[" not in ent.text and len(ent.text) > 2:
                    out.append({"file": str(p.relative_to(root)), "text": ent.text})
    return out


def redact_reference(src: Path, dst: Path, private: Path, other_names: list[str] = ()) -> dict:
    """Completed audits used as the model contain past residents' names: redact them too.
    The key for these is thrown away: nothing from them ever needs to come back."""
    files = [p for p in src.iterdir() if p.is_file() and not p.name.startswith(".")]
    rd = Redactor([], other_names, use_ner=True)
    for p in files:
        rd.learn(extract_text(p))
    if dst.exists():
        shutil.rmtree(dst)
    dst.mkdir(parents=True)
    report = {"files": []}
    tmp = Path(tempfile.mkdtemp())
    for p in files:
        ext = p.suffix.lower()
        entry = {"file": p.name}
        try:
            if ext == ".pdf":
                entry.update(redact_pdf(p, dst / p.name, rd))
            elif ext == ".docx":
                pdf = docx_to_pdf(p, tmp)
                if pdf:
                    entry.update(redact_pdf(pdf, dst / (p.stem + ".pdf"), rd))
                (dst / (p.stem + ".txt")).write_text(rd.text(extract_text(p)), encoding="utf-8")
                entry.setdefault("status", "redacted")
            elif ext in TEXT_EXT | HTML_EXT:
                (dst / (p.stem + ".txt" if ext in HTML_EXT else p.name)).write_text(rd.text(extract_text(p)), encoding="utf-8")
                entry["status"] = "redacted"
            else:
                entry.update(status="held back", reason="not a document type that can be redacted")
        except Exception as e:
            entry.update(status="held back", reason=f"could not redact: {type(e).__name__}")
        report["files"].append(entry)
    shutil.rmtree(tmp, ignore_errors=True)
    report["leaks"] = leak_check(dst, rd)
    private.mkdir(parents=True, exist_ok=True)
    (private / "reference-redaction-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report
