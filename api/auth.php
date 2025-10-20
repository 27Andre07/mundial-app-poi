<?php
require_once 'config.php';

$conn = getDBConnection();

// Determinar la acción
$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['action'])) {
        $action = $data['action'];
    }
    
    switch ($action) {
        case 'register':
            register($conn, $data);
            break;
            
        case 'login':
            login($conn, $data);
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Acción no válida']);
    }
} else if ($method === 'GET' && $action === 'check') {
    checkAuth($conn);
} else if ($method === 'POST' && $action === 'logout') {
    logout($conn);
} else {
    echo json_encode(['success' => false, 'error' => 'Método no válido']);
}

closeDBConnection($conn);

// Función de registro
function register($conn, $data) {
    $username = sanitize($data['username'] ?? '');
    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    // Validaciones
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Todos los campos son obligatorios']);
        return;
    }
    
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'error' => 'La contraseña debe tener al menos 6 caracteres']);
        return;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'error' => 'Email no válido']);
        return;
    }
    
    // Verificar si el email ya existe
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'error' => 'Este email ya está registrado']);
        $stmt->close();
        return;
    }
    $stmt->close();
    
    // Hash de la contraseña
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
    // Insertar usuario
    $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $username, $email, $hashed_password);
    
    if ($stmt->execute()) {
        $user_id = $conn->insert_id;
        
        // Crear recompensa de bienvenida
        $stmt2 = $conn->prepare("INSERT INTO rewards (user_id, type, title, description, icon, points) VALUES (?, 'welcome', 'Bienvenido al Mundial 2026', 'Recompensa por unirse a la comunidad', '🎉', 100)");
        $stmt2->bind_param("i", $user_id);
        $stmt2->execute();
        $stmt2->close();
        
        echo json_encode([
            'success' => true,
            'message' => 'Registro exitoso',
            'user_id' => $user_id
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al registrar usuario']);
    }
    
    $stmt->close();
}

// Función de login
function login($conn, $data) {
    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Email y contraseña son obligatorios']);
        return;
    }
    
    // Buscar usuario
    $stmt = $conn->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas']);
        $stmt->close();
        return;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Verificar contraseña
    if (!password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas']);
        return;
    }
    
    // Actualizar estado en línea
    $stmt = $conn->prepare("UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ?");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $stmt->close();
    
    // Guardar en sesión
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email']
        ]
    ]);
}

// Verificar autenticación
function checkAuth($conn) {
    if (isset($_SESSION['user_id'])) {
        // Actualizar última actividad
        $user_id = $_SESSION['user_id'];
        $stmt = $conn->prepare("UPDATE users SET last_seen = NOW(), is_online = TRUE WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $stmt->close();
        
        echo json_encode([
            'authenticated' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'email' => $_SESSION['email']
            ]
        ]);
    } else {
        echo json_encode(['authenticated' => false]);
    }
}

// Cerrar sesión
function logout($conn) {
    if (isset($_SESSION['user_id'])) {
        // Marcar como offline
        $user_id = $_SESSION['user_id'];
        $stmt = $conn->prepare("UPDATE users SET is_online = FALSE WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $stmt->close();
    }
    
    session_destroy();
    echo json_encode(['success' => true]);
}
?>