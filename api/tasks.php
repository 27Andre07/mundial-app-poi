<?php
require_once 'config.php';

$conn = getDBConnection();

// Verificar autenticación
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit();
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && isset($_GET['group_id'])) {
    getTasks($conn, $_GET['group_id'], $user_id);
} else if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    // Usamos 'action' para diferenciar entre crear, actualizar y eliminar
    $action = $data['action'] ?? 'create';

    if ($action === 'create') {
        createTask($conn, $data, $user_id);
    } else if ($action === 'update_status') {
        updateTaskStatus($conn, $data, $user_id);
    } else if ($action === 'delete') {
        deleteTask($conn, $data, $user_id);
    } else if ($action === 'edit') {
        editTask($conn, $data, $user_id);
    }
}

closeDBConnection($conn);

// Obtener todas las tareas de un grupo
function getTasks($conn, $group_id, $user_id) {
    // Aquí podrías añadir una verificación para asegurar que el usuario pertenece al grupo
    $stmt = $conn->prepare("
        SELECT t.*, u_assigned.username as assigned_to_username
        FROM tasks t
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
        WHERE t.group_id = ?
        ORDER BY t.created_at DESC
    ");
    $stmt->bind_param("i", $group_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $tasks = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    echo json_encode(['success' => true, 'tasks' => $tasks]);
}

// Crear una nueva tarea
function createTask($conn, $data, $user_id) {
    $title = $data['title'] ?? '';
    $group_id = $data['groupId'] ?? 0;
    // Asignar null si el valor es vacío
    $assigned_to = !empty($data['assignedTo']) ? $data['assignedTo'] : null;

    $stmt = $conn->prepare("INSERT INTO tasks (title, description, group_id, assigned_to, assigned_by, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssiisss", 
        $data['title'], 
        $data['description'], 
        $data['groupId'], 
        $assigned_to,
        $user_id, // assigned_by
        $data['priority'], 
        $data['dueDate']
    );

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'task_id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al crear la tarea']);
    }
    $stmt->close();
}

// Actualizar el estado de una tarea
function updateTaskStatus($conn, $data, $user_id) {
    $task_id = $data['taskId'] ?? 0;
    $status = $data['status'] ?? 'pending';

    $stmt = $conn->prepare("UPDATE tasks SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $task_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al actualizar la tarea']);
    }
    $stmt->close();
}

// Eliminar una tarea
function deleteTask($conn, $data, $user_id) {
    $task_id = $data['taskId'] ?? 0;

    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->bind_param("i", $task_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al eliminar la tarea']);
    }
    $stmt->close();
}

// Editar una tarea existente
function editTask($conn, $data, $user_id) {
    $task_id = $data['id'] ?? 0;
    $assigned_to = !empty($data['assignedTo']) ? $data['assignedTo'] : null;

    $stmt = $conn->prepare("UPDATE tasks SET title = ?, description = ?, assigned_to = ?, priority = ?, due_date = ? WHERE id = ?");
    $stmt->bind_param("ssisssi",
        $data['title'],
        $data['description'],
        $assigned_to,
        $data['priority'],
        $data['dueDate'],
        $task_id
    );

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al editar la tarea']);
    }
    $stmt->close();
}

?>