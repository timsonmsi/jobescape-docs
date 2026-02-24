# JobEscape Ops — Internal SaaS MVP

An internal document operations dashboard for JobEscape. Generates Invoice PDFs and NDA PDFs from Google Drive DOCX templates, writes results back to Google Sheets, and provides AI-powered legal document review.

## Features

- **Invoices** — Read from Google Sheets, fill DOCX template, convert to PDF, upload to Drive, update Sheets row
- **NDA Generator** — Select disclosure party + receiving type, generate NDA PDF from Drive template, record in Sheets
- **Legal Review** — Upload PDF/DOCX, AI analyses risk with score, red flags, and recommendations

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo>
cd jobescape-docs
npm install
```

### 2. Configure environment variables

Copy the example file and fill in all values:

```bash
cp .env.local.example .env.local
```

See the full variable reference below.

### 3. Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name it (e.g. `jobescape-ops`) and click **Create and Continue**
4. Grant roles: **Editor** (or minimum: Sheets Editor + Drive File)
5. Click **Done**
6. Click the service account → **Keys** tab → **Add Key** → **JSON**
7. Save the downloaded JSON file

### 4. Share Google Sheet and Drive folders with the service account

From the JSON key file, find the `client_email` field (looks like `jobescape-ops@your-project.iam.gserviceaccount.com`).

Share these with that email:

| Resource | Access |
|---|---|
| Google Sheet (`SHEETS_ID`) | **Editor** |
| Invoice templates Drive folder | **Viewer** |
| NDA templates Drive folder | **Viewer** |
| Root output Drive folder (`DRIVE_ROOT_FOLDER_ID`) | **Editor** |

### 5. Add the service account JSON to .env.local

Paste the entire JSON as a single-line string for `GOOGLE_SERVICE_ACCOUNT_JSON`.
On Linux/macOS you can do:

```bash
# Minify the JSON and copy to clipboard
cat path/to/service-account.json | jq -c . | pbcopy
```

Then paste it as the value in `.env.local`.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SHEETS_ID` | Yes | Google Sheets ID from the URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes | Full service account JSON as a string |
| `DRIVE_ROOT_FOLDER_ID` | Yes | Drive folder where `Generated/` subfolders are created |
| `DRIVE_INVOICE_TEMPLATES_FOLDER_ID` | Yes | Drive folder containing invoice DOCX templates |
| `DRIVE_NDA_TEMPLATES_FOLDER_ID` | Yes | Drive folder containing NDA DOCX templates |
| `CLOUDCONVERT_API_KEY` | No | CloudConvert API key for DOCX→PDF. Falls back to LibreOffice headless if not set |
| `LLM_PROVIDER` | No | `anthropic` (default) or `openai` |
| `LLM_API_KEY` | No | API key for LLM. Without it, legal review returns a stub report |
| `LLM_MODEL` | No | e.g. `claude-opus-4-6` or `gpt-4o` |

---

## Google Sheets Structure

The spreadsheet must have these sheets (tabs):

### `Invoices`
| Column | Description |
|---|---|
| `invoice_number` | e.g. `INV-2026-02-001` |
| `invoice_date` | ISO date |
| `due_date` | ISO date |
| `service_period` | e.g. `February 2026` |
| `employee_id` | Foreign key → Employees sheet |
| `amount_kzt` | Amount in KZT |
| `vat_note` | VAT note text |
| `status` | `pending` / `generated` / `error` |
| `pdf_url` | Populated after generation |
| `drive_file_id` | Populated after generation |
| `last_generated_at` | ISO timestamp |

### `Employees`
| Column | Description |
|---|---|
| `employee_id` | Unique identifier |
| `supplier_name` | Full name |
| `supplier_iin_bin` | IIN/BIN |
| `supplier_address` | Address |
| `supplier_bank_name` | Bank name |
| `supplier_iban` | IBAN |
| `supplier_bic` | BIC |
| `supplier_kbe` | KBE code |
| `supplier_phone_email` | Contact info |
| `supplier_sign_name` | Signature name |

### `Company`
| Column | Description |
|---|---|
| `buyer_name` | Company name |
| `buyer_bin` | BIN |
| `buyer_address` | Address |
| `buyer_bank_name` | Bank name |
| `buyer_iban` | IBAN |
| `buyer_bic` | BIC |
| `buyer_kbe` | KBE code |

### `Agreements` (auto-created on first NDA)
Columns: `agreement_id`, `type`, `disclosure_party`, `receiving_type`, `receiving_name`, `effective_date`, `purpose`, `pdf_url`, `drive_file_id`, `created_at`

### `LegalReviews` (auto-created on first review)
Columns: `review_id`, `filename`, `policy`, `risk_score`, `red_flags`, `recommendations`, `report_url`, `created_at`

---

## Drive Template Naming Convention

Templates must be DOCX files with `{placeholder}` tags inside:

**Invoice template** — must contain the string `INVOICE_TEMPLATE` in the filename:
```
INVOICE_TEMPLATE.docx
```

Available placeholders: `{invoice_number}`, `{invoice_date}`, `{due_date}`, `{service_period}`, `{amount_kzt}`, `{vat_note}`, `{buyer_name}`, `{buyer_bin}`, `{buyer_address}`, `{buyer_bank_name}`, `{buyer_iban}`, `{buyer_bic}`, `{buyer_kbe}`, `{supplier_name}`, `{supplier_iin_bin}`, `{supplier_address}`, `{supplier_bank_name}`, `{supplier_iban}`, `{supplier_bic}`, `{supplier_kbe}`, `{supplier_phone_email}`, `{supplier_sign_name}`

**NDA templates** — one per receiving type:
```
NDA_Individual_TEMPLATE.docx
NDA_Company_TEMPLATE.docx
```

Available placeholders: `{disclosure_party}`, `{receiving_type}`, `{receiving_name}`, `{effective_date}`, `{purpose}`

---

## Drive Folder Structure (auto-created)

```
DRIVE_ROOT_FOLDER_ID/
└── Generated/
    ├── Invoices/
    │   └── YYYY-MM/
    │       └── INV-2026-02-001_John_Doe.pdf
    ├── NDA/
    │   └── YYYY-MM/
    │       └── NDA_NomadVentures_Individual_2026-02-23_John_Doe.pdf
    └── LegalReviews/
        └── YYYY-MM/
            └── LegalReview_contract.pdf_abc12345.txt
```

---

## PDF Conversion

**CloudConvert** (recommended for production):
- Sign up at [cloudconvert.com](https://cloudconvert.com)
- Create an API key with `task.write` and `task.read` permissions
- Set `CLOUDCONVERT_API_KEY` in `.env.local`

**LibreOffice headless** (local/self-hosted fallback):
- Install LibreOffice: `brew install libreoffice` (macOS) or `apt install libreoffice` (Linux)
- Leave `CLOUDCONVERT_API_KEY` empty — the app auto-detects and uses LibreOffice

---

## Adding Authentication Later

The codebase is ready for auth. Look for `// TODO(auth)` comments in:
- `app/layout.tsx` — wrap with session provider
- `app/invoices/page.tsx`, `app/nda/page.tsx`, `app/legal/page.tsx` — add session checks
- `middleware.ts` — replace the stub with real auth middleware

Recommended: [NextAuth.js](https://next-auth.js.org) with Google OAuth provider.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/invoices/[id]/generate` | `POST` | Generate PDF for invoice number `id` |
| `/api/nda/generate` | `POST` | Generate NDA PDF (JSON body with form fields) |
| `/api/legal/review` | `POST` | Upload and review a legal document (multipart form, field `file`) |

All responses: `{ ok: boolean, message: string, data?: {...} }`

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (light blue theme)
- **Google APIs**: Sheets v4 + Drive v3 via service account
- **DOCX**: docxtemplater + pizzip
- **PDF**: CloudConvert API or LibreOffice headless
- **LLM**: Anthropic Claude or OpenAI (configurable)
