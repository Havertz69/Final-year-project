@echo off
echo Starting Property Pulse Backend Server...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Run database migrations
echo Running database migrations...
python manage.py makemigrations
python manage.py migrate

REM Create superuser if needed (optional)
echo.
echo If you need to create a superuser, run: python manage.py createsuperuser
echo.

REM Start the development server
echo Starting Django development server...
echo Server will be available at: http://127.0.0.1:8000
echo API endpoints will be at: http://127.0.0.1:8000/api/
echo.
echo Press Ctrl+C to stop the server
echo.

python manage.py runserver 127.0.0.1:8000

pause
