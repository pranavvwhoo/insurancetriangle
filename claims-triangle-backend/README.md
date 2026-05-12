# Claims Triangle Analytics — Backend

Node.js + Express backend for the Actuarial Claims Triangle Analytics Platform.

---

## Project Structure

```
claims-triangle-backend/
├── src/
│   ├── config/
│   │   └── db.js              ← Supabase client
│   ├── engine/
│   │   ├── parser.js          ← Excel / CSV parsing (SheetJS)
│   │   ├── validator.js       ← 6-point data validation
│   │   └── triangleEngine.js  ← Core triangle computation
│   ├── middleware/
│   │   └── errorHandler.js    ← Global error handler
│   ├── routes/
│   │   ├── projects.js        ← Project CRUD
│   │   ├── upload.js          ← File upload, parse, validate, save
│   │   ├── mapping.js         ← Column mapping save/load
│   │   └── triangle.js        ← Triangle generation + view state
│   └── app.js                 ← Express entry point
├── schema.sql                 ← Run this in Supabase SQL editor first
├── .env.example               ← Copy to .env and fill in values
└── package.json
```

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd claims-triangle-backend
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** in your Supabase dashboard
3. Paste the contents of `schema.sql` and run it
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `service_role` key (not the anon key)

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
FRONTEND_URL=http://localhost:5173
```

### 4. Run

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:4000`

---

## API Reference

### Health
```
GET /health
```

---

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/projects | List all projects |
| GET    | /api/projects/:id | Get project + mapping + view state |
| POST   | /api/projects | Create new project |
| PUT    | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project + all data |

**Create project body:**
```json
{
  "name": "Health Book 2025",
  "parameters": {
    "label": "Health Analysis",
    "startPeriod": "2011-01-31",
    "endPeriod": "2026-12-31",
    "maxDelay": 191
  }
}
```

---

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/upload/parse | Parse file, return sheet names + preview |
| POST   | /api/upload/validate | Validate data against a mapping |
| POST   | /api/upload/save/:projectId | Save validated rows to database |

All upload endpoints accept `multipart/form-data` with a `file` field.

**Validation checks performed:**
1. Missing values in required columns
2. Invalid date formats
3. Negative values in amount/count columns
4. Paid Amount > Reported Amount (actuarial rule violation)
5. Non-numeric values in amount/count columns
6. Unusual delay values (warning only)

---

### Column Mapping

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/mapping/fields/required | List all required model fields |
| GET    | /api/mapping/:projectId | Get saved mapping for project |
| POST   | /api/mapping/:projectId | Save/update mapping for project |

**Mapping body:**
```json
{
  "mapping": {
    "Risk_Inception_Month": "Risk_Inception_Month",
    "Data_Month": "Data_Month",
    "Delay_Month": "Delay_month",
    "Delay_Quarter": "Delay_Quarter",
    "Delay_Year": "Delay_Year",
    "Quarter_Flag": "Quarter_Flag",
    "Year_Flag": "Year_Flag",
    "Level_1": "Level 1",
    "Level_2": "Level 2",
    "Paid_Amount": "Paid_Amount",
    "Reported_Amount": "Reported_Amount",
    "Reported_Count": "Reported_Count"
  }
}
```

---

### Triangle

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/triangle/:projectId | Generate triangle |
| GET    | /api/triangle/:projectId/filters | Get available filter values |
| GET    | /api/triangle/:projectId/viewstate | Get last saved view state |

**Generate triangle body:**
```json
{
  "granularity": "monthly",
  "metric": "paid",
  "filters": {
    "level1": ["Health"],
    "level2": ["Attritional"]
  },
  "scale": "lakhs",
  "decimals": 2
}
```

**Triangle response shape:**
```json
{
  "success": true,
  "triangle": {
    "inceptionPeriods": ["2011-01", "2011-02", "..."],
    "delays": [0, 1, 2, "..."],
    "matrix": {
      "2011-01": { "0": 123.45, "1": 678.90, "2": null },
      "2011-02": { "0": 234.56, "1": null }
    },
    "grandTotals": {
      "byInception": { "2011-01": 802.35 },
      "byDelay": { "0": 358.01 }
    },
    "meta": {
      "granularity": "monthly",
      "metric": "paid",
      "scale": "lakhs",
      "decimals": 2,
      "rowsUsed": 18528,
      "totalRows": 18528
    }
  }
}
```

---

## Triangle Engine Logic

The engine follows the same logic as the Excel model:

| View | Rows included | Delay axis |
|------|--------------|------------|
| Monthly | All rows | `Delay_Month` (0–191) |
| Quarterly | `Quarter_Flag = Yes` only | `Delay_Quarter` (0–63) |
| Yearly | `Year_Flag = Yes` only | `Delay_Year` (0–15) |

Scale divisors:
- Units → divide by 1
- Thousands → divide by 1,000
- Lakhs → divide by 100,000
- Crores → divide by 10,000,000

---

## Deployment (Render)

1. Push to GitHub
2. Create a new **Web Service** on Render
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables from `.env`
6. Deploy

Free tier has cold starts (~30s after inactivity). Upgrade to $7/mo to eliminate.
