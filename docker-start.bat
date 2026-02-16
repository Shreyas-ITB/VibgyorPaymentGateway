@echo off
REM Vibgyor Payment Gateway - Docker Quick Start Script (Windows)
REM This script helps you quickly set up and run the application using Docker

echo ==========================================
echo Vibgyor Payment Gateway - Docker Setup
echo ==========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed.
    echo Please install Docker from https://docs.docker.com/get-docker/
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose is not installed.
    echo Please install Docker Compose from https://docs.docker.com/compose/install/
    exit /b 1
)

echo Docker and Docker Compose are installed
echo.

REM Check if .env file exists
if not exist .env (
    echo No .env file found. Creating from template...
    (
        echo # Payment Provider Configuration
        echo PAYMENT_PROVIDER=razorpay
        echo.
        echo # Razorpay Credentials ^(required if PAYMENT_PROVIDER=razorpay^)
        echo RAZORPAY_KEY_ID=rzp_test_xxxxx
        echo RAZORPAY_KEY_SECRET=xxxxx
        echo.
        echo # PineLabs Credentials ^(required if PAYMENT_PROVIDER=pinelabs^)
        echo # PINELABS_MERCHANT_ID=xxxxx
        echo # PINELABS_ACCESS_CODE=xxxxx
        echo # PINELABS_SECRET_KEY=xxxxx
    ) > .env
    echo Created .env file
    echo.
    echo IMPORTANT: Please edit the .env file with your actual credentials before continuing.
    echo    Run: notepad .env
    echo.
    pause
)

echo Building Docker images...
docker-compose build

echo.
echo Starting services...
docker-compose up -d

echo.
echo Waiting for services to be healthy...
timeout /t 5 /nobreak >nul

echo.
echo ==========================================
echo Vibgyor Payment Gateway is running!
echo ==========================================
echo.
echo Access the application:
echo    Frontend: http://localhost:8080
echo    Backend:  http://localhost:3000
echo.
echo View logs:
echo    All services: docker-compose logs -f
echo    Backend only: docker-compose logs -f backend
echo    Frontend only: docker-compose logs -f frontend
echo.
echo Stop services:
echo    docker-compose down
echo.
echo For more information, see DOCKER.md
echo.
pause
