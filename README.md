# 🏭 Cleanroom EMS — Environmental Monitoring System

A full-stack Environmental Monitoring System (EMS) designed for pharmaceutical and semiconductor cleanrooms. Monitors temperature, humidity, and differential pressure in real time with automated alerts, batch tracking, and compliance reporting.

---

## 📐 Architecture

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   React + Vite │────▶│  Express API   │────▶│  PostgreSQL    │
│   (Frontend)   │◀────│  (Backend)     │◀────│  (Database)    │
└────────────────┘     └────────────────┘     └────────────────┘
                              ▲
                              │
                       ┌──────┴───────┐
                       │ Python Sensor │
                       │  Simulator   │
                       └──────────────┘
```

## ✨ Features

- **Real-time Monitoring** — Live temperature, humidity, and pressure readings per room
- **Threshold Alerts** — Automatic `green / yellow / red` status with configurable limits
- **Batch Tracking** — Track production batches per cleanroom with start/end timestamps
- **Interactive Dashboard** — Charts and data visualization via Chart.js & Recharts
- **Floor Plan View** — Visual room status overview
- **PDF Reports** — Generate compliance reports with digital signatures
- **Email Notifications** — Alert notifications via Nodemailer
- **Automated Backups** — Scheduled data backup service
- **Sensor Simulation** — Python script to generate realistic sensor data with fault injection
- **Role-Based Access** — Admin, Supervisor, and Operator roles via JWT auth

---

## 🛠️ Tech Stack

| Layer        | Technology                                      |
|--------------|--------------------------------------------------|
| **Frontend** | React 18, Vite, TailwindCSS, Chart.js, Recharts |
| **Backend**  | Node.js, Express, JWT, Nodemailer, node-cron     |
| **Database** | PostgreSQL 15                                    |
| **Simulation** | Python 3 (requests)                            |
| **Infra**    | Docker, Docker Compose                           |

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) v18+ (for local development)
- [Python 3](https://www.python.org/) (for sensor simulator)

### Quick Start (Docker)

```bash
# Clone the repository
git clone <your-repo-url>
cd cleanroom-ems

# Start all services
docker-compose up --build
```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:5173         |
| Backend API| http://localhost:5000         |
| PostgreSQL | localhost:5432               |

### Local Development

**Backend:**
```bash
cd backend
cp .env.example .env     # Configure your environment
npm install
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Sensor Simulator:**
```bash
cd simulation
pip install requests
python sensor_sim.py
```

---

## 📁 Project Structure

```
cleanroom-ems/
├── backend/
│   ├── config/           # Database configuration
│   ├── routes/           # API route handlers
│   ├── services/         # Email & backup services
│   ├── utils/            # Utility functions
│   ├── server.js         # Main Express server
│   ├── Dockerfile
│   └── .env.example      # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/   # React components (FloorPlan, Reports, etc.)
│   │   ├── utils/        # Frontend utilities
│   │   └── App.jsx       # Main application component
│   ├── Dockerfile
│   └── vite.config.js
├── database/
│   └── init.sql          # Schema + seed data
├── simulation/
│   └── sensor_sim.py     # Sensor data simulator
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🔐 Default Credentials

> ⚠️ **Change these in production!**

| Role  | Email           | Password  |
|-------|-----------------|-----------|
| Admin | admin@ems.com   | admin123  |

---

## 🗄️ Database Schema

| Table          | Purpose                                |
|----------------|----------------------------------------|
| `users`        | Authentication & role management       |
| `rooms`        | Cleanroom definitions & status         |
| `settings`     | Per-room threshold configuration       |
| `readings`     | Sensor data time series                |
| `alerts`       | Active/acknowledged/resolved alerts    |
| `batches`      | Production batch tracking              |
| `backup_logs`  | Data backup audit trail                |

---

## 📡 Key API Endpoints

| Method | Endpoint            | Description                |
|--------|---------------------|----------------------------|
| POST   | `/api/auth/login`   | Authenticate user          |
| GET    | `/api/rooms`        | List all cleanrooms        |
| POST   | `/api/data/record`  | Submit sensor readings     |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional format: `git commit -m "feat: add new feature"`
4. Push to your fork: `git push origin feat/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is proprietary. All rights reserved.
