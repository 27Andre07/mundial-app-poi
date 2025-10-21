<?php
// No incluimos config.php aquí arriba, lo haremos dentro de cada función.

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    
    switch ($action) {
        case 'register':
            register($data);
            break;
        case 'login':
            login($data);
            break;
        case 'logout':
            logout();
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Acción POST no válida']);
    }
} else if ($method === 'GET' && $action === 'check') {
    checkAuth();
} else {
    echo json_encode(['success' => false, 'error' => 'Método no válido']);
}

function register($data) {
    require_once 'config.php';
    $conn = getDBConnection();
    
    $username = sanitize($data['username'] ?? '');
    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Todos los campos son obligatorios']);
        closeDBConnection($conn);
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
    closeDBConnection($conn);
}

function login($data) {
    require_once 'config.php';
    $conn = getDBConnection();

    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';

    $stmt = $conn->prepare("SELECT id, username, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas']);
        closeDBConnection($conn);
        return;
    }
    
    $user = $result->fetch_assoc();
    
    if (!password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas']);
        closeDBConnection($conn);
        return;
    }
    
    $stmt_update = $conn->prepare("UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ?");
    $stmt_update->bind_param("i", $user['id']);
    $stmt_update->execute();
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    
    echo json_encode([
        'success' => true,
        'user' => ['id' => $user['id'], 'username' => $user['username']]
    ]);
    
    closeDBConnection($conn);
}

function checkAuth() {
    require_once 'config.php';
    $conn = getDBConnection();

    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'authenticated' => true,
            'user' => ['id' => $_SESSION['user_id'], 'username' => $_SESSION['username']]
        ]);
    } else {
        echo json_encode(['authenticated' => false]);
    }
    closeDBConnection($conn);
}

function logout() {
    require_once 'config.php';
    $conn = getDBConnection();
    
    if (isset($_SESSION['user_id'])) {
        $user_id = $_SESSION['user_id'];
        $stmt = $conn->prepare("UPDATE users SET is_online = FALSE WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
    }
    session_destroy();
    echo json_encode(['success' => true]);
    closeDBConnection($conn);
}
?>