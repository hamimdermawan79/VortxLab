# VortX Labs

> **Unified AI Model Orchestration, High-Throughput Batch Automation & Data Extraction Platform**

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#)

---

## ⚡ Overview

**VortX Labs** is a production-grade web application and background daemon infrastructure built for low-latency AI model routing, massive-scale batch data processing, and game account analysis.

---

## 🚀 Key Features

### 1. 🤖 AI Model Orchestration & Playground
- Multi-provider AI streaming (OpenRouter, DeepSeek, Google Gemini, Anthropic, OpenAI).
- Live playground with dynamic token metering and interactive model comparison.
- Integrated API key management with granular rate-limiting.

### 2. ⚡ High-Throughput Sortir & Validation Engine
- PostgreSQL worker queue with `SKIP LOCKED` concurrency control.
- Burst sorting engine capable of processing thousands of IDs in seconds.
- Real-time visual categorization with dual-card preview, instant clipboard copying, and CSV export.

### 3. 📦 Offline Data Extractor Engine
- 100% offline parsing of `.zip` and `.conf` configuration files.
- Regex numeric ID extraction (6 to 9 digits inclusive) and multi-password pairing.
- Automatic MAC address normalization and duplicate removal.
- Step-by-step visual workflow: Upload &rarr; Deduplicate &rarr; Local Parse &rarr; Instant Export.

### 4. 🛡️ Admin & Operational Suite
- Live system telemetry, license generation, and user token balance management.
- Dynamic per-service pricing configuration without server restart.
- Background Telegram Reporter daemon for automated server alerts and stats.

---

## 🛠️ Tech Stack

- **Frontend & Web Server**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Database & ORM**: PostgreSQL, Prisma ORM, `@prisma/adapter-pg`
- **Background Daemon**: Python 3, `psycopg2` Connection Pooling, `ThreadPoolExecutor`
- **Archive & File Processing**: `adm-zip`, Node.js binary streaming pipeline

---

## 🏁 Quick Start

### Prerequisites
- Node.js `20.x` or later
- Python `3.10` or later
- PostgreSQL database instance

### 1. Web Application Setup
```bash
# Navigate to web workspace
cd web

# Install dependencies
npm install

# Run database migration
npx prisma db push

# Start development server
npm run dev
```

### 2. Python Worker Daemon Setup
```bash
# Install Python dependencies
pip install psycopg2-binary requests

# Start worker daemon
python daemons/vortx_worker.py
```

---

## 📂 Project Structure

```text
├── daemons/
│   └── vortx_worker.py          # Background worker (Sortir & Extractor Engine)
├── web/
│   ├── prisma/                  # Database schema & client definitions
│   ├── src/
│   │   ├── app/                 # Next.js App Router (UI, Dashboard, Admin, API)
│   │   ├── components/          # Reusable UI components & navigation
│   │   └── utils/               # Auth, security, and database helpers
│   └── package.json
└── README.md
```

---

## 📄 License
Proprietary software. All rights reserved &copy; VortX Labs.
