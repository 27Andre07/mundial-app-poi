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
    getMessages($conn, $user_id);
} else if ($method === 'POST') {
    if (isset($_FILES['file'])) {
        uploadFile($conn, $user_id);
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        sendMessage($conn, $data, $user_id);
    }
}

closeDBConnection($conn);

function getMessages($conn, $user_id) {
    $channel_id = $_GET['channel_id'] ?? 0;
    $last_id = $_GET['last_id'] ?? 0;

    $check_stmt = $conn->prepare("SELECT gm.user_id FROM group_members gm JOIN channels c ON gm.group_id = c.group_id WHERE c.id = ? AND gm.user_id = ?");
    $check_stmt->bind_param("ii", $channel_id, $user_id);
    $check_stmt->execute();
    if ($check_stmt->get_result()->num_rows === 0) {
        echo json_encode(['success' => true, 'messages' => []]);
        return;
    }

    $sql = "
        SELECT m.id, m.content, m.file_url, m.file_name, m.file_type, m.latitude, m.longitude,
               u.id as user_id, u.username, m.created_at,
               (SELECT COUNT(*) FROM shop_purchases sp 
                WHERE sp.user_id = u.id 
                AND sp.item_id = 'insignia_bota' 
                AND sp.is_active = TRUE) as has_badge
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ?
    ";

    if ($last_id > 0) {
        $sql .= " AND m.id > ? ORDER BY m.created_at ASC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $channel_id, $last_id);
    } else {
        $sql .= " ORDER BY m.created_at DESC LIMIT 50";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $channel_id);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $messages = $result->fetch_all(MYSQLI_ASSOC);

    if ($last_id == 0) {
        $messages = array_reverse($messages);
    }

    echo json_encode(['success' => true, 'messages' => $messages]);
}

function sendMessage($conn, $data, $user_id) {
    $channel_id = $data['channel_id'] ?? 0;
    $content = $data['content'] ?? '';
    $latitude = $data['latitude'] ?? null;
    $longitude = $data['longitude'] ?? null;

    if ($latitude !== null && $longitude !== null) {
        $stmt = $conn->prepare("INSERT INTO messages (channel_id, user_id, content, latitude, longitude) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iisdd", $channel_id, $user_id, $content, $latitude, $longitude);
    } else {
        $stmt = $conn->prepare("INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)");
        $stmt->bind_param("iis", $channel_id, $user_id, $content);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al enviar mensaje']);
    }
}

function uploadFile($conn, $user_id) {
    $channel_id = $_POST['channel_id'] ?? 0;
    if ($channel_id == 0 || !isset($_FILES['file'])) {
        echo json_encode(['success' => false, 'error' => 'Faltan datos para subir el archivo']);
        return;
    }

    $file = $_FILES['file'];
    $file_name = basename($file['name']);
    $file_type = $file['type'];
    $file_tmp = $file['tmp_name'];
    
    // Crear directorio uploads si no existe
    $upload_dir = '../uploads/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    // Generar nombre único para el archivo
    $file_extension = pathinfo($file_name, PATHINFO_EXTENSION);
    $unique_name = uniqid() . '_' . time() . '.' . $file_extension;
    $file_path = $upload_dir . $unique_name;
    
    // Mover archivo a la carpeta uploads
    if (!move_uploaded_file($file_tmp, $file_path)) {
        echo json_encode(['success' => false, 'error' => 'Error al guardar el archivo']);
        return;
    }
    
    $file_url = 'uploads/' . $unique_name;
    $content = $_POST['content'] ?? "Subió un archivo: " . $file_name;

    $stmt = $conn->prepare(
        "INSERT INTO messages (channel_id, user_id, content, file_url, file_name, file_type) 
         VALUES (?, ?, ?, ?, ?, ?)"
    );

    $stmt->bind_param("iissss", $channel_id, $user_id, $content, $file_url, $file_name, $file_type);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'file_url' => $file_url]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al guardar el archivo en la BD: ' . $stmt->error]);
    }
}