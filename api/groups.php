<?php
require_once 'config.php';

$conn = getDBConnection();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit();
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (isset($_GET['group_id'])) {
        getGroupDetails($conn, $_GET['group_id'], $user_id);
    } else {
        getUserGroups($conn, $user_id);
    }
} else if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    // El frontend ahora enviará una 'action' para especificar la tarea
    if ($action === 'createGroup') {
        createGroup($conn, $data, $user_id);
    } else if ($action === 'invite_member') {
        inviteMember($conn, $data, $user_id);
    } else {
        // Si no se especifica acción, asumimos que es crear grupo por compatibilidad
        createGroup($conn, $data, $user_id);
    }
}

closeDBConnection($conn);

function getUserGroups($conn, $user_id) {
    $stmt = $conn->prepare("SELECT g.id, g.name FROM groups_table g JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = ? ORDER BY g.name");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $groups = $result->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'groups' => $groups]);
}

function getGroupDetails($conn, $group_id, $user_id) {
    // Aquí puedes agregar validación para asegurar que el user_id pertenece al group_id
    $stmt = $conn->prepare("SELECT id, name FROM groups_table WHERE id = ?");
    $stmt->bind_param("i", $group_id);
    $stmt->execute();
    $group = $stmt->get_result()->fetch_assoc();

    $stmt = $conn->prepare("SELECT id, name, type FROM channels WHERE group_id = ? ORDER BY type, name");
    $stmt->bind_param("i", $group_id);
    $stmt->execute();
    $channels = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $stmt = $conn->prepare("SELECT u.id, u.username, u.is_online FROM users u JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ? ORDER BY u.username");
    $stmt->bind_param("i", $group_id);
    $stmt->execute();
    $members = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    echo json_encode(['success' => true, 'group' => $group, 'channels' => $channels, 'members' => $members]);
}

function createGroup($conn, $data, $user_id) {
    $name = sanitize($data['name'] ?? '');
    if (empty($name)) {
        echo json_encode(['success' => false, 'error' => 'El nombre del grupo es obligatorio']);
        return;
    }
    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("INSERT INTO groups_table (name, created_by) VALUES (?, ?)");
        $stmt->bind_param("si", $name, $user_id);
        $stmt->execute();
        $group_id = $conn->insert_id;

        $stmt = $conn->prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $group_id, $user_id);
        $stmt->execute();

        $stmt = $conn->prepare("INSERT INTO channels (name, group_id, type) VALUES ('general', ?, 'text')");
        $stmt->bind_param("i", $group_id);
        $stmt->execute();
        
        $stmt = $conn->prepare("INSERT INTO channels (name, group_id, type) VALUES ('tareas', ?, 'tasks')");
        $stmt->bind_param("i", $group_id);
        $stmt->execute();

        $conn->commit();
        echo json_encode(['success' => true, 'group_id' => $group_id]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => 'Error al crear el grupo.']);
    }
}

// --- NUEVA FUNCIÓN ---
function inviteMember($conn, $data, $user_id) {
    $group_id = $data['group_id'] ?? 0;
    $email = sanitize($data['email'] ?? '');

    // 1. Encontrar el ID del usuario a invitar por su email
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Usuario no encontrado con ese email.']);
        return;
    }
    $user_to_invite = $result->fetch_assoc();

    // 2. Insertar el nuevo miembro en la tabla de miembros
    $stmt = $conn->prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)");
    $stmt->bind_param("ii", $group_id, $user_to_invite['id']);
    
    // La base de datos previene duplicados, así que manejamos el error
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => '¡Usuario invitado correctamente!']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Este usuario ya es miembro del grupo.']);
    }
}

?>