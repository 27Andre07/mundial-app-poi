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
    // El @ suprime el warning de PHP para asegurar que solo enviamos JSON si hay un error
    @$conn = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
    
    if ($conn->connect_error) {
        // Si la conexión falla, termina el script y devuelve un error JSON
        die(json_encode([
            'success' => false,
            'error' => 'Error de conexión a la BD: ' . $conn->connect_error
        ]));
    }
    
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

header('Content-Type: application/json; charset=UTF-8');

// Iniciar sesión si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>