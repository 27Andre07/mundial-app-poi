<?php
require_once 'config.php';

$conn = getDBConnection();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    
    switch ($action) {
        case 'register':
            register($conn, $data);
            break;
        case 'login':
            login($conn, $data);
            break;
        case 'logout':
            logout($conn);
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Acción POST no válida']);
    }
} else if ($method === 'GET' && $action === 'check') {
    checkAuth($conn);
} else {
    echo json_encode(['success' => false, 'error' => 'Método no válido']);
}

closeDBConnection($conn);

function register($conn, $data) {
    $username = sanitize($data['username'] ?? '');
    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Todos los campos son obligatorios']);
        return;
    }
    
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $username, $email, $hashed_password);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Registro exitoso']);
    } else {
        echo json_encode(['success' => false, 'error' => 'El email ya está en uso.']);
    }
    $stmt->close();
}

function login($conn, $data) {
    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $stmt = $conn->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas']);
        return;
    }
    
    $user = $result->fetch_assoc();
    if (!password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas']);
        return;
    }
    
    $stmt_update = $conn->prepare("UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ?");
    $stmt_update->bind_param("i", $user['id']);
    $stmt_update->execute();
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    
    echo json_encode(['success' => true, 'user' => ['id' => $user['id'], 'username' => $user['username'], 'email' => $user['email']]]);
}

function checkAuth($conn) {
    if (isset($_SESSION['user_id'])) {
        $user_id = $_SESSION['user_id'];
        
        // Actualizar última actividad y obtener puntos del usuario
        $stmt = $conn->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $user_data = $result->fetch_assoc();
        $stmt->close();
        
        // Actualizar estado en línea
        $update_stmt = $conn->prepare("UPDATE users SET last_seen = NOW(), is_online = TRUE WHERE id = ?");
        $update_stmt->bind_param("i", $user_id);
        $update_stmt->execute();
        $update_stmt->close();
        
        echo json_encode([
            'authenticated' => true, 
            'user' => [
                'id' => $_SESSION['user_id'], 
                'username' => $_SESSION['username'], 
                'email' => $_SESSION['email'],
                'points' => $user_data['points'] ?? 0
            ]
        ]);
    } else {
        echo json_encode(['authenticated' => false]);
    }
}

function logout($conn) {
    if (isset($_SESSION['user_id'])) {
        $user_id = $_SESSION['user_id'];
        $stmt = $conn->prepare("UPDATE users SET is_online = FALSE WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $stmt->close();
    }
    
    // Limpiar todas las variables de sesión
    $_SESSION = array();
    
    // Destruir la cookie de sesión si existe
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // Destruir la sesión
    session_destroy();
    
    // Iniciar una nueva sesión limpia para enviar la respuesta
    session_start();
    
    echo json_encode(['success' => true, 'message' => 'Sesión cerrada']);
}