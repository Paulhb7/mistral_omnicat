# ── OmniCAT — Makefile ────────────────────────────────────────────────────────
# Quick-start commands for the multi-agent OSINT platform
# ──────────────────────────────────────────────────────────────────────────────

.PHONY: all install install-backend install-frontend env start start-backend start-frontend stop test clean help

# ── Default ───────────────────────────────────────────────────────────────────

help: ## Show available commands
	@echo ""
	@echo "  OmniCAT — available commands"
	@echo "  ────────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────

env: ## Create .env from template (won't overwrite existing)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env — edit it with your API keys before starting"; \
	else \
		echo ".env already exists — skipping"; \
	fi

install: env install-backend install-frontend ## Install everything (backend + frontend)
	@echo ""
	@echo "All dependencies installed."
	@echo "  -> Edit .env with your API keys, then run: make start"

install-backend: ## Install Python dependencies
	@echo "-- Installing backend dependencies --"
	cd backend && pip install -r requirements.txt

install-frontend: ## Install Node dependencies
	@echo "-- Installing frontend dependencies --"
	cd frontend && npm install

# ── Run ───────────────────────────────────────────────────────────────────────

start: ## Start backend & frontend (background)
	@if [ ! -f .env ]; then \
		echo ".env not found — run 'make install' first"; \
		exit 1; \
	fi
	@echo "-- Starting OmniCAT --"
	@make start-backend &
	@make start-frontend &
	@echo ""
	@echo "  Backend  -> http://localhost:8000"
	@echo "  Frontend -> http://localhost:3000"
	@echo ""
	@wait

start-backend: ## Start FastAPI server
	cd backend && python server.py

start-frontend: ## Start Next.js dev server
	cd frontend && npm run dev

# ── Test ──────────────────────────────────────────────────────────────────────

test: ## Run backend tests
	cd backend && python -m pytest tests/ -v

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove generated files (node_modules, __pycache__, .db)
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -f backend/maritime_data.db
	rm -rf frontend/node_modules frontend/.next
	@echo "Cleaned."
