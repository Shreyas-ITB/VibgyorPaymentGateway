#!/bin/bash

# Vibgyor Payment Gateway - Docker Quick Start Script
# This script helps you quickly set up and run the application using Docker

set -e

echo "=========================================="
echo "Vibgyor Payment Gateway - Docker Setup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed."
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cat > .env << 'EOF'
# Payment Provider Configuration
PAYMENT_PROVIDER=razorpay

# Razorpay Credentials (required if PAYMENT_PROVIDER=razorpay)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# PineLabs Credentials (required if PAYMENT_PROVIDER=pinelabs)
# PINELABS_MERCHANT_ID=xxxxx
# PINELABS_ACCESS_CODE=xxxxx
# PINELABS_SECRET_KEY=xxxxx
EOF
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file with your actual credentials before continuing."
    echo "   Run: nano .env (or use your preferred editor)"
    echo ""
    read -p "Press Enter after you've configured the .env file..."
fi

echo "📦 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check backend health
echo "Checking backend health..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Backend health check timeout. Check logs with: docker-compose logs backend"
    fi
    sleep 2
done

# Check frontend health
echo "Checking frontend health..."
for i in {1..30}; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Frontend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Frontend health check timeout. Check logs with: docker-compose logs frontend"
    fi
    sleep 2
done

echo ""
echo "=========================================="
echo "✅ Vibgyor Payment Gateway is running!"
echo "=========================================="
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:3000"
echo ""
echo "📊 View logs:"
echo "   All services: docker-compose logs -f"
echo "   Backend only: docker-compose logs -f backend"
echo "   Frontend only: docker-compose logs -f frontend"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
echo "📖 For more information, see DOCKER.md"
echo ""
