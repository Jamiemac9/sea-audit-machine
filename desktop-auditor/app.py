"""Support Audit desktop window.

Pick one or more resident folders, press Start. Each is audited in turn and
"Support Audit - <Name>.docx" is saved into that resident's folder.
"""
from __future__ import annotations

import datetime as dt
import os
import queue
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext, ttk

import runner


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Support Audit")
        self.geometry("880x720")
        self.settings = runner.load_settings()
        self.q: queue.Queue = queue.Queue()
        self.current: runner.Run | None = None
        self.stopping = False
        self.last_output: Path | None = None
        self._build()
        self.after(150, self._drain)

    # ---------- layout ----------
    def _build(self):
        pad = {"padx": 8, "pady": 4}
        top = ttk.Frame(self)
        top.pack(fill="x", **pad)

        self.template = tk.StringVar(value=self.settings.get("template", ""))
        self.reference = tk.StringVar(value=self.settings.get("reference", ""))
        self._path_row(top, 0, "Blank form (Support_Audit_OG.docx)", self.template, file=True)
        self._path_row(top, 1, "Reference folder (house style + completed audits)", self.reference, file=False)

        ttk.Label(top, text="Managing agent (as on licence)").grid(row=2, column=0, sticky="w")
        self.ma = tk.StringVar()
        ttk.Entry(top, textvariable=self.ma, width=50).grid(row=2, column=1, sticky="we")
        ttk.Label(top, text="Audit date").grid(row=3, column=0, sticky="w")
        self.date = tk.StringVar(value=dt.date.today().strftime("%d/%m/%y"))
        ttk.Entry(top, textvariable=self.date, width=12).grid(row=3, column=1, sticky="w")
        self.follow = tk.BooleanVar(value=False)
        ttk.Checkbutton(top, text="Follow-up audit (not the agent's first)", variable=self.follow).grid(row=4, column=1, sticky="w")
        ttk.Label(top, text="Notes for these files (optional)").grid(row=5, column=0, sticky="nw")
        self.notes = tk.Text(top, height=3, width=60, wrap="word")
        self.notes.grid(row=5, column=1, sticky="we")
        top.columnconfigure(1, weight=1)

        mid = ttk.LabelFrame(self, text="Resident folders to audit")
        mid.pack(fill="x", **pad)
        self.folders = tk.Listbox(mid, height=5)
        self.folders.pack(side="left", fill="x", expand=True, padx=4, pady=4)
        btns = ttk.Frame(mid)
        btns.pack(side="right", padx=4)
        ttk.Button(btns, text="Add folder…", command=self._add_folder).pack(fill="x", pady=2)
        ttk.Button(btns, text="Add every folder in…", command=self._add_children).pack(fill="x", pady=2)
        ttk.Button(btns, text="Remove", command=self._remove_folder).pack(fill="x", pady=2)

        bar = ttk.Frame(self)
        bar.pack(fill="x", **pad)
        self.start_btn = ttk.Button(bar, text="Start", command=self._start)
        self.start_btn.pack(side="left")
        self.stop_btn = ttk.Button(bar, text="Stop", command=self._stop, state="disabled")
        self.stop_btn.pack(side="left", padx=6)
        self.open_btn = ttk.Button(bar, text="Open last form", command=self._open_last, state="disabled")
        self.open_btn.pack(side="left")
        self.status = ttk.Label(bar, text="Ready")
        self.status.pack(side="right")

        self.log = scrolledtext.ScrolledText(self, wrap="word", font=("Helvetica", 11))
        self.log.pack(fill="both", expand=True, **pad)
        self._say("1. Check the blank form and reference folder above (remembered next time).\n"
                  "2. Add the resident folder(s).  3. Press Start.\n")

    def _path_row(self, parent, row, label, var, file):
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w")
        ttk.Entry(parent, textvariable=var, width=60).grid(row=row, column=1, sticky="we")
        def pick():
            p = (filedialog.askopenfilename(filetypes=[("Word", "*.docx")]) if file
                 else filedialog.askdirectory())
            if p:
                var.set(p)
        ttk.Button(parent, text="Choose…", command=pick).grid(row=row, column=2, padx=4)

    # ---------- folder list ----------
    def _add_folder(self):
        p = filedialog.askdirectory(title="Resident folder")
        if p:
            self.folders.insert("end", p)

    def _add_children(self):
        p = filedialog.askdirectory(title="Property folder holding one folder per resident")
        if p:
            for child in sorted(Path(p).iterdir()):
                if child.is_dir() and not child.name.startswith("."):
                    self.folders.insert("end", str(child))

    def _remove_folder(self):
        for i in reversed(self.folders.curselection()):
            self.folders.delete(i)

    # ---------- running ----------
    def _start(self):
        folders = list(self.folders.get(0, "end"))
        if not folders:
            messagebox.showinfo("Support Audit", "Add at least one resident folder first.")
            return
        self.settings["template"] = self.template.get().strip()
        self.settings["reference"] = self.reference.get().strip()
        runner.save_settings(self.settings)
        self.stopping = False
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        notes = self.notes.get("1.0", "end").strip()
        threading.Thread(target=self._worker, args=(folders, self.ma.get().strip(), self.date.get().strip(),
                                                   self.follow.get(), notes), daemon=True).start()

    def _worker(self, folders, ma, date, follow, notes):
        done = 0
        for i, folder in enumerate(folders, 1):
            if self.stopping:
                break
            self.q.put(("status", f"File {i} of {len(folders)}"))
            self.q.put(("line", f"\n===== {Path(folder).name} =====" ))
            job = runner.make_job(folder, self.settings, ma, date, follow, notes)
            self.current = runner.Run(job, self.settings, lambda s: self.q.put(("line", s)))
            if self.current.start():
                done += 1
                self.q.put(("output", job["output"]))
            if self.current.result_text:
                self.q.put(("line", "\n" + self.current.result_text + "\n"))
        self.q.put(("finished", f"{done} of {len(folders)} forms saved"))

    def _stop(self):
        self.stopping = True
        if self.current:
            self.current.stop()
        self._say("Stopping…")

    def _drain(self):
        try:
            while True:
                kind, val = self.q.get_nowait()
                if kind == "line":
                    self._say(val)
                elif kind == "status":
                    self.status.config(text=val)
                elif kind == "output":
                    self.last_output = Path(val)
                    self.open_btn.config(state="normal")
                elif kind == "finished":
                    self.status.config(text=val)
                    self.start_btn.config(state="normal")
                    self.stop_btn.config(state="disabled")
                    self._say("\n" + val)
        except queue.Empty:
            pass
        self.after(150, self._drain)

    def _say(self, text):
        self.log.insert("end", text + "\n")
        self.log.see("end")

    def _open_last(self):
        if not self.last_output:
            return
        p = str(self.last_output)
        if sys.platform == "darwin":
            subprocess.run(["open", p])
        elif os.name == "nt":
            os.startfile(p)  # type: ignore[attr-defined]
        else:
            subprocess.run(["xdg-open", p])


if __name__ == "__main__":
    App().mainloop()
