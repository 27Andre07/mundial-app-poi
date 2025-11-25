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
    // Solo mostrar tareas donde el usuario es el creador o el asignado
    $stmt = $conn->prepare("
        SELECT t.*, u_assigned.username as assigned_to_username, u_created.username as created_by_username
        FROM tasks t
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
        LEFT JOIN users u_created ON t.assigned_by = u_created.id
        WHERE t.group_id = ? AND (t.assigned_by = ? OR t.assigned_to = ?)
        ORDER BY t.created_at DESC
    ");
    $stmt->bind_param("iii", $group_id, $user_id, $user_id);
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
    
    // Prevenir auto-asignación
    if ($assigned_to !== null && $assigned_to == $user_id) {
        echo json_encode(['success' => false, 'error' => 'No puedes asignarte tareas a ti mismo']);
        return;
    }

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

    // Verificar que el usuario sea el creador de la tarea
    $check_stmt = $conn->prepare("SELECT assigned_by, assigned_to, status, priority FROM tasks WHERE id = ?");
    $check_stmt->bind_param("i", $task_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Tarea no encontrada']);
        $check_stmt->close();
        return;
    }
    
    $task = $result->fetch_assoc();
    $check_stmt->close();
    
    // Solo el creador puede cambiar el estado
    if ($task['assigned_by'] != $user_id) {
        echo json_encode(['success' => false, 'error' => 'Solo el creador de la tarea puede cambiar su estado']);
        return;
    }

    $stmt = $conn->prepare("UPDATE tasks SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $task_id);

    if ($stmt->execute()) {
        // Si la tarea se está completando (no reabriendo) y tiene un usuario asignado, otorgar puntos
        if ($status === 'completed' && $task['status'] !== 'completed' && $task['assigned_to'] !== null) {
            $points = 0;
            switch ($task['priority']) {
                case 'low':
                    $points = 300;
                    break;
                case 'medium':
                    $points = 500;
                    break;
                case 'high':
                    $points = 800;
                    break;
            }
            
            // Actualizar los puntos del usuario asignado
            if ($points > 0) {
                $points_stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
                $points_stmt->bind_param("ii", $points, $task['assigned_to']);
                $points_stmt->execute();
                $points_stmt->close();
            }
        }
        
        echo json_encode(['success' => true, 'points_awarded' => $points ?? 0]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al actualizar la tarea']);
    }
    $stmt->close();
}

// Eliminar una tarea
function deleteTask($conn, $data, $user_id) {
    $task_id = $data['taskId'] ?? 0;

    // Verificar que el usuario sea el creador de la tarea
    $check_stmt = $conn->prepare("SELECT assigned_by FROM tasks WHERE id = ?");
    $check_stmt->bind_param("i", $task_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Tarea no encontrada']);
        $check_stmt->close();
        return;
    }
    
    $task = $result->fetch_assoc();
    $check_stmt->close();
    
    // Solo el creador puede eliminar la tarea
    if ($task['assigned_by'] != $user_id) {
        echo json_encode(['success' => false, 'error' => 'Solo el creador de la tarea puede eliminarla']);
        return;
    }

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

    // Verificar que el usuario sea el creador de la tarea
    $check_stmt = $conn->prepare("SELECT assigned_by FROM tasks WHERE id = ?");
    $check_stmt->bind_param("i", $task_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Tarea no encontrada']);
        $check_stmt->close();
        return;
    }
    
    $task = $result->fetch_assoc();
    $check_stmt->close();
    
    // Solo el creador puede editar la tarea
    if ($task['assigned_by'] != $user_id) {
        echo json_encode(['success' => false, 'error' => 'Solo el creador de la tarea puede editarla']);
        return;
    }

    $stmt = $conn->prepare("UPDATE tasks SET title = ?, description = ?, assigned_to = ?, priority = ?, due_date = ? WHERE id = ?");
    $stmt->bind_param("ssissi",
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