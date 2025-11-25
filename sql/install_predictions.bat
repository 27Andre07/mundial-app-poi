@echo off
echo =============================================
echo INSTALANDO SISTEMA DE PREDICCIONES
echo Mundial App - POI 2025
echo =============================================
echo.

set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
set DB_NAME=POI
set SQL_FILE=%~dp0predictions_schema.sql

echo Intentando conectar a MySQL...
echo.

%MYSQL_PATH% -u root -e "USE %DB_NAME%;" 2>nul
if errorlevel 1 (
    echo ERROR: No se pudo conectar a MySQL
    echo.
    echo Verifica que:
    echo 1. XAMPP este ejecutando MySQL
    echo 2. La base de datos '%DB_NAME%' exista
    echo 3. El usuario root no requiera contraseña
    echo.
    pause
    exit /b 1
)

echo Conexion exitosa!
echo.
echo Ejecutando script SQL...
echo.

%MYSQL_PATH% -u root %DB_NAME% < "%SQL_FILE%"

if errorlevel 1 (
    echo.
    echo ERROR: Ocurrio un error al ejecutar el script
    echo.
    pause
    exit /b 1
)

echo.
echo =============================================
echo INSTALACION COMPLETADA EXITOSAMENTE
echo =============================================
echo.
echo Se crearon las siguientes tablas:
echo - jornadas (7 jornadas pre-configuradas)
echo - matches (36+ partidos de ejemplo)
echo - predictions (para guardar predicciones)
echo - Se agrego columna reward_points a users
echo.
echo Ya puedes usar el sistema de predicciones!
echo.
pause
