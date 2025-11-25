<?php
// VERSIÓN LIMPIA CON CREDENCIALES DIRECTAS

// Configurar CORS para permitir acceso desde ngrok con credenciales
$allowed_origins = [
    'https://mundialpoi-app.ngrok.app',
    'http://localhost',
    'http://localhost:80',
    'http://127.0.0.1'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    // Sin credenciales si el origen no está permitido
    header("Access-Control-Allow-Origin: https://mundialpoi-app.ngrok.app");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', 'root');
define('DB_NAME', 'poi');
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

// Configurar sesión para trabajar con ngrok HTTPS
if (session_status() === PHP_SESSION_NONE) {
    // Configurar parámetros de sesión para HTTPS
    ini_set('session.cookie_secure', '1');  // Solo HTTPS
    ini_set('session.cookie_httponly', '1'); // No accesible desde JavaScript
    ini_set('session.cookie_samesite', 'None'); // Permitir cross-site (necesario para ngrok)
    ini_set('session.use_strict_mode', '1');
    
    session_set_cookie_params([
        'lifetime' => 0, // Session cookie (expira al cerrar navegador)
        'path' => '/',
        'domain' => '', // Dominio actual
        'secure' => true, // Solo HTTPS
        'httponly' => true,
        'samesite' => 'None' // Importante para ngrok
    ]);
    
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