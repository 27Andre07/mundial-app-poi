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

if ($method === 'GET') {
    getMessages($conn, $user_id);
} else if ($method === 'POST') {
    // Verificar si es subida de archivo
    if (isset($_FILES['file'])) {
        uploadFile($conn, $user_id);
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        sendMessage($conn, $data, $user_id);
    }
}

closeDBConnection($conn);

// Obtener mensajes de un canal
function getMessages($conn, $user_id) {
    $channel_id = $_GET['channel_id'] ?? 0;
    $limit = $_GET['limit'] ?? 50;
    $last_id = $_GET['last_id'] ?? 0; // Para obtener solo mensajes nuevos
    
    if ($channel_id == 0) {
        echo json_encode(['success' => false, 'error' => 'ID de canal requerido']);
        return;
    }
    
    // Verificar que el usuario tenga acceso al canal
    $stmt = $conn->prepare("
        SELECT c.id 
        FROM channels c
        INNER JOIN groups_table g ON c.group_id = g.id
        INNER JOIN group_members gm ON g.id = gm.group_id
        WHERE c.id = ? AND gm.user_id = ?
    ");
    $stmt->bind_param("ii", $channel_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'No tienes acceso a este canal']);
        $stmt->close();
        return;
    }
    $stmt->close();
    
    // Obtener mensajes
    if ($last_id > 0) {
        // Solo obtener mensajes nuevos (para polling)
        $stmt = $conn->prepare("
            SELECT m.id, m.content, m.file_url, m.file_name, m.file_type, 
                   m.latitude, m.longitude, m.created_at,
                   u.id as user_id, u.username
            FROM messages m
            INNER JOIN users u ON m.user_id = u.id
            WHERE m.channel_id = ? AND m.id > ?
            ORDER BY m.created_at ASC
        ");
        $stmt->bind_param("ii", $channel_id, $last_id);
    } else {
        // Obtener últimos N mensajes
        $stmt = $conn->prepare("
            SELECT m.id, m.content, m.file_url, m.file_name, m.file_type, 
                   m.latitude, m.longitude, m.created_at,
                   u.id as user_id, u.username
            FROM messages m
            INNER JOIN users u ON m.user_id = u.id
            WHERE m.channel_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?
        ");
        $stmt->bind_param("ii", $channel_id, $limit);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $message = [
            'id' => $row['id'],
            'channelId' => $channel_id,
            'userId' => $row['user_id'],
            'username' => $row['username'],
            'content' => $row['content'],
            'createdAt' => $row['created_at']
        ];
        
        // Agregar ubicación si existe
        if ($row['latitude'] && $row['longitude']) {
            $message['location'] = [
                'latitude' => floatval($row['latitude']),
                'longitude' => floatval($row['longitude'])
            ];
        }
        
        // Agregar archivo si existe
        if ($row['file_url']) {
            $message['fileUrl'] = $row['file_url'];
            $message['fileName'] = $row['file_name'];
            $message['fileType'] = $row['file_type'];
        }
        
        $messages[] = $message;
    }
    
    $stmt->close();
    
    // Si no estamos obteniendo nuevos mensajes, invertir el orden
    if ($last_id == 0) {
        $messages = array_reverse($messages);
    }
    
    echo json_encode([
        'success' => true,
        'messages' => $messages
    ]);
}

// Enviar un mensaje
function sendMessage($conn, $data, $user_id) {
    $channel_id = $data['channel_id'] ?? 0;
    $content = $data['content'] ?? '';
    $latitude = $data['location']['latitude'] ?? null;
    $longitude = $data['location']['longitude'] ?? null;
    
    if ($channel_id == 0) {
        echo json_encode(['success' => false, 'error' => 'ID de canal requerido']);
        return;
    }
    
    if (empty($content)) {
        echo json_encode(['success' => false, 'error' => 'El contenido del mensaje es obligatorio']);
        return;
    }
    
    // Verificar acceso al canal
    $stmt = $conn->prepare("
        SELECT c.id 
        FROM channels c
        INNER JOIN groups_table g ON c.group_id = g.id
        INNER JOIN group_members gm ON g.id = gm.group_id
        WHERE c.id = ? AND gm.user_id = ?
    ");
    $stmt->bind_param("ii", $channel_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'No tienes acceso a este canal']);
        $stmt->close();
        return;
    }
    $stmt->close();
    
    // Insertar mensaje
    if ($latitude && $longitude) {
        $stmt = $conn->prepare("
            INSERT INTO messages (channel_id, user_id, content, latitude, longitude) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("iisdd", $channel_id, $user_id, $content, $latitude, $longitude);
    } else {
        $stmt = $conn->prepare("
            INSERT INTO messages (channel_id, user_id, content) 
            VALUES (?, ?, ?)
        ");
        $stmt->bind_param("iis", $channel_id, $user_id, $content);
    }
    
    if ($stmt->execute()) {
        $message_id = $conn->insert_id;
        
        // Obtener información del usuario
        $stmt2 = $conn->prepare("SELECT username FROM users WHERE id = ?");
        $stmt2->bind_param("i", $user_id);
        $stmt2->execute();
        $result = $stmt2->get_result();
        $user = $result->fetch_assoc();
        $stmt2->close();
        
        echo json_encode([
            'success' => true,
            'message_id' => $message_id,
            'username' => $user['username']
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al enviar mensaje']);
    }
    
    $stmt->close();
}

// Subir archivo
function uploadFile($conn, $user_id) {
    $channel_id = $_POST['channel_id'] ?? 0;
    
    if ($channel_id == 0) {
        echo json_encode(['success' => false, 'error' => 'ID de canal requerido']);
        return;
    }
    
    if (!isset($_FILES['file'])) {
        echo json_encode(['success' => false, 'error' => 'No se recibió ningún archivo']);
        return;
    }
    
    $file = $_FILES['file'];
    
    // Validar tamaño (máximo 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        echo json_encode(['success' => false, 'error' => 'El archivo es demasiado grande (máximo 5MB)']);
        return;
    }
    
    // Crear directorio de uploads si no existe
    $upload_dir = '../uploads/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    // Generar nombre único para el archivo
    $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $file_name = uniqid() . '_' . time() . '.' . $file_extension;
    $file_path = $upload_dir . $file_name;
    
    // Mover archivo
    if (move_uploaded_file($file['tmp_name'], $file_path)) {
        // Guardar en base de datos
        $file_url = 'uploads/' . $file_name;
        $content = 'Compartió un archivo: ' . $file['name'];
        
        $stmt = $conn->prepare("
            INSERT INTO messages (channel_id, user_id, content, file_url, file_name, file_type) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("iissss", $channel_id, $user_id, $content, $file_url, $file['name'], $file['type']);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message_id' => $conn->insert_id,
                'file_url' => $file_url
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Error al guardar archivo en BD']);
        }
        
        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al subir archivo']);
    }
}
?>