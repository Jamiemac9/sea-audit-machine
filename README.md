# Seaaudit (sea-audit-machine)

Local Next.js workbench for Support Audit CRM, Audit Workbench (WR-01–WR-22), Property Compliance (Big 8), and the RP & MA Directory. Resident and property files stay on this workstation. Reports use `[Client_RP_Name]` / directory RP names and managing-agent names — never a hard-coded Windrush label.

## Run on your home desktop

You only need Git, Node.js 20+, and a browser. Nothing is hosted in the cloud for day-to-day use.

### 1. Get the code

```bash
git clone https://github.com/Jamiemac9/sea-audit-machine.git
cd sea-audit-machine
git fetch origin
git checkout cursor/seaaudit-architecture-overhaul-9cec
```

If you already have the repo at work and pushed this branch, at home:

```bash
cd sea-audit-machine
git fetch origin
git checkout cursor/seaaudit-architecture-overhaul-9cec
git pull origin cursor/seaaudit-architecture-overhaul-9cec
```

### 2. Install and start

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

### 3. Modules

| Sidebar item | Route | Purpose |
| --- | --- | --- |
| Support Audit CRM | `/` | Monday-style support caseload board |
| Audit Workbench | `/workbench` | Multi-file resident bundle, Missing WR Gate, deep extract, `.docx` report |
| Property Compliance CRM | `/compliance` | Separate Big 8 property board |
| RP & MA Directory | `/directory` | Registered Providers + Managing Agents (rent schedules) |
| Auditor Settings | `/settings` | Lead auditor profile + masterlist |

### 4. Optional production build

```bash
npm run build
npm start
```

## Notes

- Data is in-memory for the browser session (seed demo files + your uploads). It is not synced to a server.
- PDF/image OCR: name files with WR codes (e.g. `WR-01.pdf`) and/or paste extract text in the workbench. `.docx` text is extracted via mammoth.
- Mock training agents (Chantry Housing, Best Choice Housing, etc.) are sample directory data only.
