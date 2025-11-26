@echo off
echo ========================================
echo INSTALACION DEL SISTEMA DE APUESTAS
echo ========================================
echo.

set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
set DB_USER=root
set DB_PASS=root
set SQL_FILE=C:/xampp/htdocs/mundial-app-poi/sql/tournament_bets_schema.sql

echo Ejecutando script SQL...
"%MYSQL_PATH%" -u %DB_USER% -p%DB_PASS% -e "SOURCE %SQL_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo INSTALACION COMPLETADA EXITOSAMENTE
    echo ========================================
    echo.
    echo El sistema de apuestas de torneo ha sido instalado correctamente.
    echo.
    echo CARACTERISTICAS:
    echo - Campo tournament_points agregado a usuarios (1000 puntos iniciales)
    echo - Tabla tournament_bets creada para almacenar apuestas
    echo - Sistema listo para usar
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR EN LA INSTALACION
    echo ========================================
    echo.
    echo Por favor verifica:
    echo 1. Que XAMPP este ejecutandose
    echo 2. Que MySQL este activo
    echo 3. Que la contrasena de root sea correcta
    echo.
)

pause
