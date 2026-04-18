# 🏥 MedVault AI

**India's Centralized Medical Identity Ecosystem — Golden Hour Ready**

> Save lives during the Golden Hour of an emergency while ensuring long-term healthcare accessibility for 1.4 billion Indians.

---

## 🎯 The Problem

Every year, thousands of Indians die during the **Golden Hour** — the critical 60 minutes after an accident — because emergency responders have no access to the patient's medical history. Allergies, blood group, chronic conditions, and current medications are locked away in paper files or scattered across hospital systems.

Meanwhile, **60%+ of India's population** (elderly, rural, illiterate) cannot navigate digital health portals to manage their own health data.

## 💡 The Solution

MedVault AI creates a **Universal Medical ID** (SHA-256 hash of Aadhaar) that links to a secure cloud vault. The system provides **four role-based interfaces**, each showing only the data that role needs — enforced by strict Role-Based Access Control (RBAC).

---

## 🚀 Run It Yourself (Copy-Paste Setup)

### Prerequisites
- **Node.js 18+** — [Download here](https://nodejs.org/)
- **Python 3.11+** — [Download here](https://www.python.org/)
- **Git** — [Download here](https://git-scm.com/)

### Step 1: Clone the repo
```bash
git clone https://github.com/K1S1explorer/MEDVAULT.git
cd MEDVAULT
```

### Step 2: Start the Backend (Terminal 1)
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> ✅ Backend is running at **http://localhost:8000**
> 📝 The database + demo users are auto-created on first run.

### Step 3: Start the Frontend (Terminal 2)
Open a **new terminal tab**, then:
```bash
cd client
npm install
npm install @tailwindcss/vite
npm run dev
```

> ✅ Frontend is running at **http://localhost:5173**

### Step 4: Open in Browser
Go to **http://localhost:5173** — you're in! 🎉

---

## 🔑 Demo Login Credentials

Three users are **auto-created** when the backend starts. No registration needed to test:

| Role | Aadhaar Number | Password | What You Can Do |
|------|---------------|----------|-----------------|
| **Patient** | `123456789012` | `demo123` | View profile, QR code, voice AI chat, audit trail |
| **Doctor** | `987654321098` | `doctor123` | Search patients by Medical ID, view clinical alerts |
| **Lab** | `111222333444` | `lab123` | Upload diagnostic reports, see AI summaries |

### Demo Patient Data (Pre-filled)
- **Name**: Rajesh Kumar
- **Blood Group**: B+
- **Allergies**: Penicillin, Sulfa drugs
- **Conditions**: Diabetes Type 2, Hypertension
- **Medications**: Metformin 500mg, Amlodipine 5mg
- **Emergency Contact**: Priya Kumar (+919876543211)

---

## 🗣️ Voice AI Chat — How to Test

After logging in as the **Patient**, scroll down to the **AI Health Chat** section.

### Type or speak these questions:
| Question | Expected Response |
|----------|------------------|
| `What is my blood group?` | "Your blood group is B+" |
| `Do I have any allergies?` | "Allergies to: Penicillin, Sulfa drugs" |
| `What medications am I on?` | "Metformin 500mg, Amlodipine 5mg" |
| `Do I have diabetes?` | "You have diabetes on record..." |
| `What about my BP?` | "You have hypertension on record..." |

### Hindi (set language to हिंदी):
| Question | Expected Response |
|----------|------------------|
| `Mera blood group kya hai?` | "Aapka blood group B+ hai" |
| `Mujhe kya allergy hai?` | "Aapko Penicillin, Sulfa drugs se allergy hai" |
| `Meri dawaiyan kya hain?` | "Aapki current dawaiyan: Metformin 500mg..." |

### Optional: Enable Gemini AI (Free)
For smarter conversational answers (instead of keyword-based), get a free API key:
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click "Create API Key" (free, no credit card)
3. Set it before starting the backend:
```bash
export GEMINI_API_KEY="your-free-key-here"
uvicorn main:app --reload --port 8000
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    MedVault AI                       │
├──────────┬──────────┬──────────┬────────────────────┤
│ Patient  │ Doctor   │ Emergency│ Lab Interface      │
│ Portal   │ Dashboard│ QR View  │ (Upload & OCR)     │
├──────────┴──────────┴──────────┴────────────────────┤
│              FastAPI Backend (Python)                 │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │  Auth   │ │ RAG Voice│ │    OCR    │ │  RBAC  │ │
│  │(Aadhaar)│ │ (Gemini) │ │(Tesseract)│ │(JWT)   │ │
│  └─────────┘ └──────────┘ └───────────┘ └────────┘ │
├─────────────────────────────────────────────────────┤
│               SQLite Database                        │
│  Users · Medical Records · Audit Logs · Voice AI     │
└─────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. 🚨 Emergency QR Code (Golden Hour)
- No authentication required — scan and see life-critical data instantly
- Shows: Blood Group, Allergies, Chronic Conditions, Medications, Emergency Contact
- **Tap-to-call** emergency contact on mobile
- Every scan is logged in the **Break-Glass Audit Trail**

### 2. 🩺 Doctor Dashboard
- Search patients by Universal Medical ID
- Full clinical profile with AI-flagged **Red/Amber alerts** for abnormal values
- Access is logged and transparent to the patient

### 3. 🧪 Lab Direct Upload
- Diagnostic centers upload reports directly to a patient's vault
- **AI auto-summarizes** PDFs via OCR → parses lab values → flags critical markers
- Supported markers: Glucose, HbA1c, Creatinine, Troponin, TSH, Hemoglobin, Platelets, Cholesterol

### 4. 🗣️ Speech-to-Speech RAG Voice AI
- **Real-time speech recognition** via Web Speech API
- **RAG-powered answers** using patient's medical records as context
- **Auto-speaks responses** via browser SpeechSynthesis
- Supports **Hindi, Tamil, and English**
- Safety guardrails prevent prescriptive language
- Works with **Gemini free tier** or intelligent keyword fallback

### 5. 🔒 Security & Privacy
- **Aadhaar never stored** — only its SHA-256 hash (Universal Medical ID)
- JWT-based authentication with role-based access control
- Complete audit trail: patients see who accessed their data and when

---

## 🛠️ Tech Stack (100% Free & Open Source)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vite + React + TypeScript | Fast, modern SPA |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Backend | FastAPI (Python) | High-performance API |
| Database | SQLite + SQLAlchemy | Zero-config, free DB |
| Auth | JWT + bcrypt | Token-based security |
| OCR | Tesseract (pytesseract) | Free text extraction |
| RAG AI | Gemini 2.0 Flash (free tier) | Conversational health AI |
| Voice STT | Web Speech API | Browser-native speech recognition |
| Voice TTS | Web SpeechSynthesis | Browser-native text-to-speech |
| QR | qrserver.com API | Free QR generation |

**Total cost: ₹0**

---

## 📁 Project Structure

```
MEDVAULT/
├── client/                          # Vite + React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Role-aware navigation
│   │   │   └── VoiceChatRAG.tsx     # Speech-to-speech RAG chat
│   │   ├── pages/
│   │   │   ├── Landing.tsx          # Hero + feature showcase
│   │   │   ├── Login.tsx            # Aadhaar-based auth
│   │   │   ├── Register.tsx         # New user registration
│   │   │   ├── PatientDashboard.tsx # QR, Voice AI, Profile, Chat
│   │   │   ├── PatientRecords.tsx   # Records + AI summaries
│   │   │   ├── DoctorDashboard.tsx  # Search + clinical view
│   │   │   ├── EmergencyView.tsx    # QR scan landing (no auth)
│   │   │   └── LabInterface.tsx     # Drag-drop upload + AI
│   │   ├── lib/
│   │   │   └── api.ts              # API client + auth helpers
│   │   ├── App.tsx                  # React Router setup
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Design system
│   └── index.html
├── server/                          # FastAPI Backend
│   ├── main.py                      # All API routes
│   ├── auth.py                      # Aadhaar hashing, JWT, RBAC
│   ├── models.py                    # SQLAlchemy models (SQLite)
│   ├── ai_engine.py                 # Report summarizer + Voice templates
│   ├── rag_voice.py                 # RAG engine + Gemini integration
│   ├── ocr_processor.py             # Tesseract OCR integration
│   ├── schema.sql                   # Reference SQL schema
│   └── requirements.txt             # Python dependencies
├── .gitignore
└── README.md
```

---

## 🧪 Testing the Full Flow

### Flow 1: Patient Experience
1. Login as Patient → `123456789012` / `demo123`
2. See your stats (Blood Group, Allergies, Conditions)
3. Click "Show QR Code" → this is what goes in your wallet
4. Try the Voice AI Chat → ask "What is my blood group?" or "Meri dawaiyan kya hain?"
5. Check the Audit Trail at the bottom

### Flow 2: Emergency Responder
1. From the Patient Dashboard, copy the QR code URL
2. Open it in an incognito tab (simulates a stranger scanning your QR)
3. See life-critical data with NO login required
4. Go back to Patient Dashboard → the scan appears in your Audit Trail

### Flow 3: Doctor Review
1. Login as Doctor → `987654321098` / `doctor123`
2. You need a patient's Medical ID to search — get it from the Patient Dashboard
3. Search → see patient profile, clinical summary, and any flagged alerts

### Flow 4: Lab Upload
1. Login as Lab → `111222333444` / `lab123`
2. Enter patient's Medical ID
3. Upload any PDF/image/text file
4. AI auto-summarizes + flags critical markers
5. Login as Patient → see the new record in "Records" tab

---

## 🛑 Troubleshooting

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED` on frontend | Backend isn't running. Start it in Terminal 1 |
| `bcrypt` / `passlib` error | We use `bcrypt` directly now. Run `pip install bcrypt` |
| `npm: command not found` | Install Node.js from nodejs.org |
| `python3: command not found` | Install Python from python.org |
| Port 8000 already in use | `lsof -i :8000` then `kill <PID>` |
| Port 5173 already in use | `lsof -i :5173` then `kill <PID>` |
| Speech recognition not working | Use Chrome or Edge (Safari doesn't support Web Speech API) |

---

## 👥 Team

Built for India 🇮🇳 at Hackathon 2026.

## 📄 License

MIT — Free and open source.
