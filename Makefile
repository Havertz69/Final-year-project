# PropertyPulse PMS - Cross-platform dev commands
# Usage: make <target>

.PHONY: dev backend frontend install setup help

help:
	@echo "Available commands:"
	@echo "  make dev        - Start both backend and frontend"
	@echo "  make backend    - Start Django backend only"
	@echo "  make frontend   - Start React frontend only"
	@echo "  make install    - Install all dependencies"
	@echo "  make migrate    - Run Django migrations"
	@echo "  make setup      - Full first-time setup"

backend:
	cd server && python manage.py runserver

frontend:
	cd frontend && npm run dev

install:
	cd server && pip install -r requirements.txt
	cd frontend && npm install

migrate:
	cd server && python manage.py migrate

setup: install migrate
	@echo ""
	@echo "Setup complete. Next steps:"
	@echo "  1. Edit server/.env with your real values"
	@echo "  2. Run: cd server && python manage.py createsuperuser"
	@echo "  3. Run: make dev"

dev:
	@echo "Starting backend and frontend..."
	@(cd server && python manage.py runserver) & (cd frontend && npm run dev)
