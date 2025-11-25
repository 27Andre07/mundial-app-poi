<?php
// Desactivar todos los errores de PHP para que no interfieran con JSON
error_reporting(0);
ini_set('display_errors', 0);

require_once 'config.php';

// Limpiar cualquier output buffer previo
while (ob_get_level()) {
    ob_end_clean();
}

// Iniciar output buffering limpio
ob_start();

// Asegurar que la respuesta sea JSON
header('Content-Type: application/json; charset=utf-8');

$conn = getDBConnection();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit();
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'conversations';
    
    if ($action === 'conversations') {
        getConversations($conn, $user_id);
    } elseif ($action === 'messages') {
        getMessages($conn, $user_id);
    } elseif ($action === 'find_user') {
        findUserByEmail($conn, $user_id);
    } elseif ($action === 'pending_requests') {
        getPendingRequests($conn, $user_id);
    }
} else if ($method === 'POST') {
    // Manejar upload de archivos
    if (isset($_FILES['file'])) {
        uploadDMFile($conn, $user_id);
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'send_message';
        
        if ($action === 'send_request') {
            sendContactRequest($conn, $data, $user_id);
        } elseif ($action === 'accept_request') {
            acceptContactRequest($conn, $data, $user_id);
        } elseif ($action === 'reject_request') {
            rejectContactRequest($conn, $data, $user_id);
        } elseif ($action === 'send_message') {
            sendMessage($conn, $data, $user_id);
        } elseif ($action === 'send_location') {
            sendLocation($conn, $data, $user_id);
        }
    }
}

closeDBConnection($conn);

// Obtener solicitudes pendientes
function getPendingRequests($conn, $user_id) {
    $sql = "
        SELECT cr.id, cr.sender_id, cr.created_at,
               u.username, u.email
        FROM contact_requests cr
        JOIN users u ON cr.sender_id = u.id
        WHERE cr.receiver_id = ? AND cr.status = 'pending'
        ORDER BY cr.created_at DESC
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $requests = [];
    while ($row = $result->fetch_assoc()) {
        $requests[] = $row;
    }
    
    echo json_encode(['success' => true, 'requests' => $requests]);
}

// Enviar solicitud de contacto
function sendContactRequest($conn, $data, $user_id) {
    $receiver_id = $data['receiver_id'] ?? 0;
    
    if (!$receiver_id) {
        echo json_encode(['success' => false, 'error' => 'ID de usuario requerido']);
        return;
    }
    
    // Verificar que el receptor existe
    $check_stmt = $conn->prepare("SELECT id, username FROM users WHERE id = ?");
    $check_stmt->bind_param("i", $receiver_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
        return;
    }
    
    $user = $result->fetch_assoc();
    
    // Verificar si ya existe una solicitud
    $existing = $conn->prepare("SELECT id, status FROM contact_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)");
    $existing->bind_param("iiii", $user_id, $receiver_id, $receiver_id, $user_id);
    $existing->execute();
    $existing_result = $existing->get_result();
    
    if ($existing_result->num_rows > 0) {
        $req = $existing_result->fetch_assoc();
        if ($req['status'] === 'pending') {
            echo json_encode(['success' => false, 'error' => 'Ya existe una solicitud pendiente con este usuario']);
            return;
        } elseif ($req['status'] === 'accepted') {
            echo json_encode(['success' => false, 'error' => 'Ya son contactos']);
            return;
        }
    }
    
    // Crear nueva solicitud
    $stmt = $conn->prepare("INSERT INTO contact_requests (sender_id, receiver_id) VALUES (?, ?)");
    $stmt->bind_param("ii", $user_id, $receiver_id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud enviada',
            'username' => $user['username']
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al enviar solicitud']);
    }
}

// Aceptar solicitud
function acceptContactRequest($conn, $data, $user_id) {
    $request_id = $data['request_id'] ?? 0;
    
    if (!$request_id) {
        echo json_encode(['success' => false, 'error' => 'ID de solicitud requerido']);
        return;
    }
    
    // Verificar que la solicitud es para este usuario
    $check = $conn->prepare("SELECT sender_id FROM contact_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'");
    $check->bind_param("ii", $request_id, $user_id);
    $check->execute();
    $result = $check->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Solicitud no encontrada']);
        return;
    }
    
    // Actualizar estado
    $stmt = $conn->prepare("UPDATE contact_requests SET status = 'accepted' WHERE id = ?");
    $stmt->bind_param("i", $request_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Solicitud aceptada']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al aceptar solicitud']);
    }
}

// Rechazar solicitud
function rejectContactRequest($conn, $data, $user_id) {
    $request_id = $data['request_id'] ?? 0;
    
    if (!$request_id) {
        echo json_encode(['success' => false, 'error' => 'ID de solicitud requerido']);
        return;
    }
    
    // Verificar que la solicitud es para este usuario
    $check = $conn->prepare("SELECT sender_id FROM contact_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'");
    $check->bind_param("ii", $request_id, $user_id);
    $check->execute();
    $result = $check->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Solicitud no encontrada']);
        return;
    }
    
    // Actualizar estado
    $stmt = $conn->prepare("UPDATE contact_requests SET status = 'rejected' WHERE id = ?");
    $stmt->bind_param("i", $request_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Solicitud rechazada']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al rechazar solicitud']);
    }
}

// Obtener todas las conversaciones del usuario (solo contactos aceptados)
function getConversations($conn, $user_id) {
    $sql = "
        SELECT DISTINCT
            u.id as user_id,
            u.username,
            u.email,
            (SELECT content FROM direct_messages dm2
             WHERE (dm2.sender_id = u.id AND dm2.receiver_id = ?)
                OR (dm2.sender_id = ? AND dm2.receiver_id = u.id)
             ORDER BY dm2.created_at DESC LIMIT 1) as last_message,
            (SELECT is_encrypted FROM direct_messages dm2
             WHERE (dm2.sender_id = u.id AND dm2.receiver_id = ?)
                OR (dm2.sender_id = ? AND dm2.receiver_id = u.id)
             ORDER BY dm2.created_at DESC LIMIT 1) as is_encrypted,
            (SELECT created_at FROM direct_messages dm2
             WHERE (dm2.sender_id = u.id AND dm2.receiver_id = ?)
                OR (dm2.sender_id = ? AND dm2.receiver_id = u.id)
             ORDER BY dm2.created_at DESC LIMIT 1) as last_message_time,
            (SELECT COUNT(*) FROM direct_messages dm3
             WHERE dm3.sender_id = u.id AND dm3.receiver_id = ? AND dm3.is_read = 0) as unread_count
        FROM users u
        WHERE u.id IN (
            SELECT CASE 
                WHEN sender_id = ? THEN receiver_id
                ELSE sender_id
            END
            FROM contact_requests
            WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
        )
        ORDER BY last_message_time DESC
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iiiiiiiiii", $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $conversations = [];
    while ($row = $result->fetch_assoc()) {
        $conversations[] = $row;
    }
    
    echo json_encode(['success' => true, 'conversations' => $conversations]);
}

// Obtener mensajes de una conversación específica
function getMessages($conn, $user_id) {
    $other_user_id = $_GET['user_id'] ?? 0;
    $last_id = $_GET['last_id'] ?? 0;
    
    if (!$other_user_id) {
        echo json_encode(['success' => false, 'error' => 'ID de usuario requerido']);
        return;
    }
    
    // Verificar que son contactos
    $check = $conn->prepare("SELECT id FROM contact_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'accepted'");
    $check->bind_param("iiii", $user_id, $other_user_id, $other_user_id, $user_id);
    $check->execute();
    
    if ($check->get_result()->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'No son contactos']);
        return;
    }
    
    $sql = "
        SELECT dm.id, dm.content, dm.sender_id, dm.is_read, dm.is_encrypted,
               dm.message_type, dm.file_path, dm.file_name,
               dm.latitude, dm.longitude,
               u.username, dm.created_at,
               (SELECT COUNT(*) FROM shop_purchases sp 
                WHERE sp.user_id = u.id 
                AND sp.item_id = 'insignia_bota' 
                AND sp.is_active = TRUE) as has_badge
        FROM direct_messages dm
        JOIN users u ON dm.sender_id = u.id
        WHERE ((dm.sender_id = ? AND dm.receiver_id = ?) 
            OR (dm.sender_id = ? AND dm.receiver_id = ?))
    ";
    
    if ($last_id > 0) {
        $sql .= " AND dm.id > ?";
    }
    
    $sql .= " ORDER BY dm.created_at ASC";
    
    if ($last_id > 0) {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iiiii", $user_id, $other_user_id, $other_user_id, $user_id, $last_id);
    } else {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iiii", $user_id, $other_user_id, $other_user_id, $user_id);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    
    // Marcar mensajes como leídos
    if (!empty($messages)) {
        $mark_read = $conn->prepare("UPDATE direct_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0");
        $mark_read->bind_param("ii", $other_user_id, $user_id);
        $mark_read->execute();
    }
    
    echo json_encode(['success' => true, 'messages' => $messages]);
}

// Enviar un mensaje directo
function sendMessage($conn, $data, $user_id) {
    $receiver_id = $data['receiver_id'] ?? 0;
    $content = trim($data['content'] ?? '');
    $is_encrypted = isset($data['is_encrypted']) && $data['is_encrypted'] ? 1 : 0;
    
    if (!$receiver_id || !$content) {
        echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
        return;
    }
    
    // Verificar que son contactos
    $check = $conn->prepare("SELECT id FROM contact_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'accepted'");
    $check->bind_param("iiii", $user_id, $receiver_id, $receiver_id, $user_id);
    $check->execute();
    
    if ($check->get_result()->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'No son contactos']);
        return;
    }
    
    $stmt = $conn->prepare("INSERT INTO direct_messages (sender_id, receiver_id, content, is_encrypted) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iisi", $user_id, $receiver_id, $content, $is_encrypted);
    
    if ($stmt->execute()) {
        $message_id = $conn->insert_id;
        echo json_encode([
            'success' => true, 
            'message_id' => $message_id
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al enviar mensaje']);
    }
}

// Buscar usuario por email
function findUserByEmail($conn, $user_id) {
    $email = trim($_GET['email'] ?? '');
    
    if (!$email) {
        echo json_encode(['success' => false, 'error' => 'Email requerido']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT id, username, email FROM users WHERE email = ? AND id != ?");
    $stmt->bind_param("si", $email, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'user' => $row]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
    }
}

// Enviar ubicación
function sendLocation($conn, $data, $user_id) {
    $receiver_id = $data['receiver_id'] ?? 0;
    $latitude = $data['latitude'] ?? null;
    $longitude = $data['longitude'] ?? null;
    
    if (!$receiver_id || !$latitude || !$longitude) {
        echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
        return;
    }
    
    // Verificar que son contactos
    $check = $conn->prepare("SELECT id FROM contact_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'accepted'");
    $check->bind_param("iiii", $user_id, $receiver_id, $receiver_id, $user_id);
    $check->execute();
    
    if ($check->get_result()->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'No son contactos']);
        return;
    }
    
    $content = "Ubicación compartida";
    $message_type = 'location';
    
    $stmt = $conn->prepare("INSERT INTO direct_messages (sender_id, receiver_id, content, message_type, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iissdd", $user_id, $receiver_id, $content, $message_type, $latitude, $longitude);
    
    if ($stmt->execute()) {
        $message_id = $conn->insert_id;
        echo json_encode([
            'success' => true, 
            'message_id' => $message_id
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al enviar ubicación']);
    }
}

// Subir y enviar archivo
function uploadDMFile($conn, $user_id) {
    $receiver_id = $_POST['receiver_id'] ?? 0;
    
    if (!$receiver_id) {
        echo json_encode(['success' => false, 'error' => 'Receptor no especificado']);
        return;
    }
    
    // Verificar que son contactos
    $check = $conn->prepare("SELECT id FROM contact_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'accepted'");
    $check->bind_param("iiii", $user_id, $receiver_id, $receiver_id, $user_id);
    $check->execute();
    
    if ($check->get_result()->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'No son contactos']);
        return;
    }
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'Error al subir archivo']);
        return;
    }
    
    $file = $_FILES['file'];
    $fileName = $file['name'];
    $fileTmpName = $file['tmp_name'];
    $fileSize = $file['size'];
    $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    // Validar tipo de archivo
    $allowedImages = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $allowedVideos = ['mp4', 'webm', 'ogg', 'mov'];
    $allowedDocs = ['pdf'];
    
    $message_type = 'text';
    if (in_array($fileExt, $allowedImages)) {
        $message_type = 'image';
        $maxSize = 10 * 1024 * 1024; // 10MB
    } elseif (in_array($fileExt, $allowedVideos)) {
        $message_type = 'video';
        $maxSize = 50 * 1024 * 1024; // 50MB
    } elseif (in_array($fileExt, $allowedDocs)) {
        $message_type = 'pdf';
        $maxSize = 20 * 1024 * 1024; // 20MB
    } else {
        echo json_encode(['success' => false, 'error' => 'Tipo de archivo no permitido']);
        return;
    }
    
    if ($fileSize > $maxSize) {
        echo json_encode(['success' => false, 'error' => 'Archivo demasiado grande']);
        return;
    }
    
    // Crear directorio si no existe
    $uploadDir = '../uploads/dms/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // Generar nombre único
    $uniqueName = uniqid() . '_' . time() . '.' . $fileExt;
    $filePath = $uploadDir . $uniqueName;
    
    if (move_uploaded_file($fileTmpName, $filePath)) {
        $content = $fileName;
        $dbFilePath = 'uploads/dms/' . $uniqueName;
        
        $stmt = $conn->prepare("INSERT INTO direct_messages (sender_id, receiver_id, content, message_type, file_path, file_name) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iissss", $user_id, $receiver_id, $content, $message_type, $dbFilePath, $fileName);
        
        if ($stmt->execute()) {
            $message_id = $conn->insert_id;
            echo json_encode([
                'success' => true,
                'message_id' => $message_id,
                'file_path' => $dbFilePath,
                'message_type' => $message_type
            ]);
        } else {
            unlink($filePath);
            echo json_encode(['success' => false, 'error' => 'Error al guardar en BD']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al mover archivo']);
    }
}

