<?php
// Configuración de la base de datos (versión para Railway)

// Lee las variables de entorno que Railway nos proporcionará
$db_host = getenv('MYSQLHOST');
$db_user = getenv('MYSQLUSER');
$db_pass = getenv('MYSQLPASSWORD');
$db_name = getenv('MYSQLDATABASE');
$db_port = getenv('MYSQLPORT');

// Crear conexión
function getDBConnection() {
    global $db_host, $db_user, $db_pass, $db_name, $db_port;
    
    // Se añade el puerto a la conexión, requerido por Railway
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
    
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