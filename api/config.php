<?php
// VERSIÓN LIMPIA CON CREDENCIALES DIRECTAS

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', 'Diciembre02');
define('DB_NAME', 'POI');
define('DB_PORT', '3306');

function getDBConnection() {
    @$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    if ($conn->connect_error) {
        die(json_encode(['success' => false, 'error' => 'Error de conexión a la BD: ' . $conn->connect_error]));
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}

function closeDBConnection($conn) {
    if ($conn) {
        $conn->close();
    }
}

function sanitize($data) {
    return htmlspecialchars(stripslashes(trim($data)));
}

// Iniciar sesión antes de cualquier output
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Crear conexión PDO global para APIs que la necesiten
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    // No mostrar error aquí, dejarlo para que lo maneje cada API
    $pdo = null;
}   