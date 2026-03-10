# PropertyPulse PMS

A rental property management system for landlords and tenants.  
Built with **Django REST Framework** (backend) and **React + Material UI** (frontend).

---

## Features

- Admin portal: manage properties, units, tenants, payments, maintenance requests
- Tenant portal: view lease, submit payments with evidence, raise maintenance requests
- JWT authentication with role-based access (Admin / Tenant)
- Payment evidence approval workflow
- PDF receipts and CSV/PDF report export
- In-app notifications

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |

---

## Setup

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd Final-year-project
```

### 2. Backend setup

```bash
cd server

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file (copy the template and fill in values)
cp .env .env.local   # or just edit .env directly

# Generate secret keys (run this twice — one for each key)
python -c "import secrets; print(secrets.token_hex(50))"

# Edit .env and set SECRET_KEY, JWT_SECRET_KEY, and DB_PASSWORD
```

**.env must have these set before running:**
```
DB_NAME=property_pulse
DB_USER=postgres
DB_PASSWORD=your_real_postgres_password
SECRET_KEY=<generated_key>
JWT_SECRET_KEY=<different_generated_key>
DEBUG=True
```

```bash
# Create the database in PostgreSQL
psql -U postgres -c "CREATE DATABASE property_pulse;"

# Run migrations
python manage.py migrate

# Create the first admin user
python manage.py createsuperuser

# Start the backend server
python manage.py runserver
```

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# The .env file is already configured for local development
# VITE_API_BASE_URL=http://127.0.0.1:8000/api

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**

---

## Running Both Servers (cross-platform)

```bash
# From the project root:
make dev
```

Or manually open two terminals:
- Terminal 1: `cd server && python manage.py runserver`
- Terminal 2: `cd frontend && npm run dev`

---

## Default Ports

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |
| Frontend | http://localhost:5173 |

---

## Project Structure

```
Final-year-project/
├── server/                  # Django backend
│   ├── accounts/            # User auth, login, JWT
│   ├── properties/          # Properties, units, payments, maintenance
│   ├── ploti_backend/       # Django settings and URLs
│   ├── requirements.txt
│   └── .env                 # Your environment config (not in git)
├── frontend/                # React frontend
│   ├── src/
│   │   ├── pages/           # Admin and tenant pages
│   │   ├── components/      # Shared UI components
│   │   ├── services/        # API service layer
│   │   ├── context/         # Auth context
│   │   └── api/             # Axios instance with token refresh
│   └── package.json
├── Makefile                 # Cross-platform dev commands
└── README.md
```

---

## Security Notes

- Never commit `.env` to git — it is listed in `.gitignore`
- Always use real generated secret keys (not the placeholders)
- Set `DEBUG=False` before deploying to any public server
- The media/ directory (user uploads) is excluded from git

