# Property Pulse - Property Management System

Property Pulse is a comprehensive management system designed for landlords and tenants to streamline property operations, payments, and communications.

## Key Features

- **Admin Dashboard**: Real-time overview of property performance, occupancy rates, and financial metrics.
- **Tenant Portal**: Access to lease details, payment history, and maintenance request submissions.
- **Payment Management**: Secure tracking of rent payments with automated status updates.
- **Maintenance Tracking**: End-to-end management of property maintenance requests.
- **Notifications**: Real-time alerts for important updates and actions.

## Technology Stack

### Backend
- **Framework**: Django REST Framework
- **Database**: PostgreSQL
- **Auth**: SimpleJWT (JSON Web Tokens)
- **Background Tasks**: Django Signals

### Frontend
- **Framework**: React with Vite
- **UI Components**: Material UI & shadcn/ui
- **State Management**: React Context & TanStack Query
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL

### Installation

1. **Clone the repository**:
   ```sh
   git clone <repository-url>
   cd property-pulse
   ```

2. **Backend Setup**:
   ```sh
   cd server
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

3. **Frontend Setup**:
   ```sh
   cd frontend
   npm install
   npm run dev
   ```

## License

This project is developed for educational purposes as a final year university project.
