#!/bin/bash
# MONITOR Platform - Complete Demo Startup Script
# This script starts the backend and opens the correct frontend URL

set -e

echo "=========================================="
echo "🏥 MONITOR Platform - Demo Startup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Kill any existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f uvicorn 2>/dev/null || true
sleep 2

# Step 2: Verify we're in the right directory
if [ ! -f "app/main.py" ]; then
    echo "Error: Please run this script from the MONITOR repository root"
    exit 1
fi

# Step 3: Check git status
echo -e "${BLUE}Repository Status:${NC}"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
echo ""

# Step 4: Start backend
echo -e "${BLUE}Starting backend on port 8000...${NC}"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/monitor_backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Backend started successfully (PID: $BACKEND_PID)${NC}"
else
    echo "❌ Backend failed to start. Check logs:"
    tail -20 /tmp/monitor_backend.log
    exit 1
fi

# Step 5: Test backend health
echo -e "${BLUE}Testing backend health...${NC}"
HEALTH_CHECK=$(curl -s http://localhost:8000/health || echo "failed")
if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo "❌ Backend health check failed"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 MONITOR Platform is READY!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📍 DEMO URLs:${NC}"
echo ""
echo "  🎯 PRODUCTION PLATFORM (Main UI):"
echo "     http://localhost:8000/"
echo "     http://localhost:8000/demo"
echo ""
echo "  🧪 Phase 3 Only Demo:"
echo "     http://localhost:8000/phase3-only"
echo ""
echo "  🔧 Test Harness (Dev/QA):"
echo "     http://localhost:8000/test-harness"
echo ""
echo "  📚 API Documentation (Swagger):"
echo "     http://localhost:8000/docs"
echo ""
echo "=========================================="
echo ""
echo -e "${YELLOW}📝 Quick Start:${NC}"
echo "  1. Open http://localhost:8000/ in your browser"
echo "  2. Sign up / Log in"
echo "  3. Submit Part A data (Manual or File Upload)"
echo "  4. Check Data Quality (A2)"
echo "  5. Generate Part B Report (35 outputs)"
echo "  6. View Results & Export"
echo ""
echo "=========================================="
echo ""
echo "Backend logs: tail -f /tmp/monitor_backend.log"
echo "To stop: kill $BACKEND_PID"
echo ""

# Keep script running to monitor backend
wait $BACKEND_PID
