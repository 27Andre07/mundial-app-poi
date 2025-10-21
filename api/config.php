<?php
// --- VERSIÓN CON CREDENCIALES DIRECTAS ---

// !! IMPORTANTE !!
// Reemplaza los valores de abajo con los de TU base de datos de Railway
define('DB_HOST', 'gondola.proxy.rlwy.net');     // Ej: gondola.proxy.rlwy.net
define('DB_USER', 'root');
define('DB_PASS', 'HUFwCLYdpndrZfStJVmZrbRgDgbcYUDx'); // La contraseña larga y aleatoria
define('DB_NAME', 'railway');
define('DB_PORT', '50016');   // Ej: 24351

// Crear conexión
function getDBConnection() {
    // El @ suprime el warning de PHP para asegurar que solo enviamos JSON si hay un error
    @$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    
    if ($conn->connect_error) {
        die(json_encode([
            'success' => false,
            'error' => 'Error de conexión a la BD: ' . $conn->connect_error
        ]));
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
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

header('Content-Type: application/json; charset=UTF-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>