# Syllabus-to-Study-Plan Agent

[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/Google%20Gemini-Multimodal%20%26%20Live-FF8800.svg)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28.svg)](https://firebase.google.com/)

An intelligent, agentic full-stack web application that transforms raw course syllabi into dynamic, adaptive, and personalized study schedules. Powered by **Google Gemini Multimodal API**, **Real-Time Voice AI Coaching**, **RAG (Retrieval-Augmented Generation)**, and deep integration with the **Google Workspace Ecosystem** (Drive, Gmail, Slides, Forms).

---

## Key Highlights & Features

### 1. Agentic Syllabus Processing & RAG Engine
- **Multimodal Document Ingestion**: Upload course syllabi in PDF or plain text. The agent extracts course milestones, grading rubrics, exam dates, and chapter dependencies.
- **RAG-Powered Knowledge Retrieval**: Course content is chunked, indexed, and retrieved contextually during study planning and tutoring sessions.
- **Adaptive Scheduling Algorithm**: Dynamically balances exam timelines, weekly student bandwidth, difficult subject weighting, and revision intervals.

### 2. Real-Time Voice Study Coach & AI Tutor
- **Gemini Live Audio Interaction**: Low-latency, bidirectional audio coach that conducts interactive study check-ins and explains complex concepts.
- **Voice Recall Quizzes**: Oral flashcard and active recall drills with automated speech evaluation.
- **Generative AI Chatbot**: Built-in interactive assistant with support for Google Gemini models and customizable local/on-device options (Gemma 4 12B to 31B architecture support).

### 3. Seamless Google Workspace Integrations
- **Google Sign-In**: Unified, secure authentication with custom cyberpunk-academic styling.
- **Google Drive**: Export and sync study plans, curated reading lists, and revision notes directly to Google Drive folders.
- **Gmail Automation**: Scheduled email reminders, exam countdown digests, and calendar notifications.
- **Google Slides Generator**: Turn complex syllabus modules and weekly outlines into lecture slide decks automatically.
- **Google Forms Exporter**: Automatically generate self-assessment quizzes and practice exams from syllabus objectives.

### 4. Modern Cyber-Academic UI / UX
- **Dynamic Glassmorphism**: Tailored cyber-academic color palette with deep obsidian, neon cyan accents, and glowing card borders.
- **Micro-Animations**: Fluid transitions powered by motion (Framer Motion).
- **Responsive Master Dashboard**: Interactive timeline, weekly task breakdowns, progress rings, and milestone checklists.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion (motion)
- **Backend / Server**: Node.js, Express, 	sx
- **AI & Multimodal**: @google/genai (Gemini 2.0 Flash / Live API), Local Gemma 4 Engine interface
- **Cloud & Auth**: Firebase Auth, Firebase Admin SDK, Cloud Firestore
- **Audio Processing**: Web Audio API (PCM 16kHz / 24kHz recorder and player)

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** / **pnpm**
- **Google Gemini API Key**: Get one at [Google AI Studio](https://aistudio.google.com/)
- *(Optional)* **Firebase Project**: For Firebase Authentication and Cloud Firestore storage

### Installation

1. **Clone the repository:**
   `ash
   git clone https://github.com/Bvamsikiran/Syllabus-to-Study-Plan-Agent.git
   cd Syllabus-to-Study-Plan-Agent
   `

2. **Install dependencies:**
   `ash
   npm install
   `

3. **Configure Environment Variables:**
   Copy the example .env file:
   `ash
   cp .env.example .env
   `
   Fill in your configuration:
   `env
   # Google Gemini API
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_LIVE_MODEL=gemini-2.0-flash-exp

   # Firebase Configuration (Optional for cloud sync)
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_SERVICE_ACCOUNT_JSON=

   # Server Port
   PORT=3000
   `

4. **Start the Development Server:**
   `ash
   npm run dev
   `
   The application will start at http://localhost:3000.

---

## Application Workflow

1. **Step 1 - Upload Syllabus**: Drag-and-drop your course syllabus (PDF or text).
2. **Step 2 - Exam & Milestones**: Enter upcoming exam dates, quiz schedules, and assignment deadlines.
3. **Step 3 - Bandwidth Allocation**: Set your daily/weekly study hours, preferred rest days, and study duration.
4. **Step 4 - Learning Preferences**: Select preferred resources (video lectures, textbooks, practice problems, flashcards).
5. **Interactive Dashboard**:
   - Track daily study tasks.
   - Practice with the Voice Recall Coach.
   - Ask the AI Tutor questions with citation-backed syllabus references.
   - Export your calendar to Google Drive, Slides, or Forms.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| 
pm run dev | Starts the Express server and Vite development bundler with hot reload |
| 
pm run build | Builds the optimized production assets in /dist |
| 
pm run start | Runs the production server via 	sx server.ts |
| 
pm run lint | Type-checks the codebase using TypeScript (	sc --noEmit) |
| 
pm run preview | Locally previews the production build |

---

## Project Structure

`	ext
├── public/                 # Static assets and icons
├── src/
│   ├── components/         # UI components
│   │   ├── GoogleAuthButton.tsx    # Styled Google Authentication component
│   │   ├── ModernStudyDashboard.tsx # Main cyber-academic dashboard
│   │   ├── VoiceStudyCoach.tsx      # Real-time Gemini Live voice interaction
│   │   ├── GenerativeAITutor.tsx    # Context-aware AI chat tutor
│   │   ├── Step1Upload.tsx          # Syllabus upload wizard
│   │   ├── Step2Exam.tsx            # Exam schedule configuration
│   │   ├── Step3Bandwidth.tsx       # Hours & bandwidth allocator
│   │   ├── Step4Resources.tsx       # Resource & style selector
│   │   ├── GoogleDriveModal.tsx     # Google Drive export modal
│   │   ├── GoogleSlidesModal.tsx    # Google Slides deck generator
│   │   ├── GoogleFormsModal.tsx     # Google Forms quiz creator
│   │   └── GmailSyncModal.tsx       # Gmail reminder synchronizer
│   ├── context/            # Global React context (Auth & state)
│   ├── lib/                # Audio utilities, Live API client, Knowledge base
│   ├── services/           # Firebase, Gemini API, RAG, and Google Workspace services
│   ├── types/              # TypeScript interfaces and schema types
│   ├── App.tsx             # Root application orchestrator
│   └── main.tsx            # React DOM mounting
├── server.ts               # Express server with Vite middleware & Gemini proxy
└── package.json            # Project dependencies and run scripts
`

---

## Contributing

1. Fork the repository.
2. Create a feature branch: git checkout -b feature/amazing-feature.
3. Commit your changes: git commit -m 'Add amazing feature'.
4. Push to the branch: git push origin feature/amazing-feature.
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License.
