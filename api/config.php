<?php
// Configuración de la base de datos
define('DB_HOST', 'gondola.proxy.rlwy.net');
define('DB_USER', 'root');
define('DB_PASS', 'HUFwCLYdpndrZfStJVmZrbRgDgbcYUDx'); // Cambiar si tienes contraseña en XAMPP
define('DB_NAME', 'railway');

// Crear conexión
function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    // Verificar conexión
    if ($conn->connect_error) {
        die(json_encode([
            'success' => false,
            'error' => 'Error de conexión: ' . $conn->connect_error
        ]));
    }
    
    // Establecer charset UTF-8
    $conn->set_charset("utf8mb4");
    
    return $conn;
}

// Función para cerrar la conexión
function closeDBConnection($conn) {
    if ($conn) {
        $conn->close();
    }
}

// Función para sanitizar datos de entrada
function sanitize($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Configurar headers para permitir CORS (desarrollo local)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Iniciar sesión si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>