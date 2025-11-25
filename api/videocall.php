<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();

header('Content-Type: application/json');
header('Cache-Control: no-cache');

// Conexión
$conn = new mysqli('localhost', 'root', 'root', 'POI');
$conn->set_charset('utf8mb4');

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'DB error']);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit();
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET - obtener participantes, señales o estado de llamada
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    $room_id = $_GET['room_id'] ?? '';
    
    if ($action === 'check_call') {
        if (empty($room_id)) {
            echo json_encode(['success' => false, 'error' => 'Room ID requerido']);
            exit();
        }
        
        // Verificar si hay una llamada activa
        $stmt = $conn->prepare("
            SELECT ac.id, ac.started_by, u.username as starter_name
            FROM active_calls ac
            JOIN users u ON ac.started_by = u.id
            WHERE ac.room_id = ? AND ac.is_active = 1
        ");
        $stmt->bind_param("s", $room_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $call = $result->fetch_assoc();
        $stmt->close();
        
        echo json_encode([
            'success' => true, 
            'has_call' => !is_null($call),
            'call_info' => $call
        ]);
        exit();
    }
    
    if (empty($room_id)) {
        echo json_encode(['success' => false, 'error' => 'Room ID requerido']);
        exit();
    }
    
    if ($action === 'participants') {
        $stmt = $conn->prepare("
            SELECT vcp.user_id, u.username 
            FROM video_call_participants vcp
            JOIN users u ON vcp.user_id = u.id
            WHERE vcp.room_id = ? 
            AND vcp.left_at IS NULL 
            AND vcp.joined_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        ");
        $stmt->bind_param("s", $room_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $participants = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        
        echo json_encode(['success' => true, 'participants' => $participants]);
        
    } elseif ($action === 'signals') {
        // Obtener señales
        $stmt = $conn->prepare("
            SELECT id, from_user_id, signal_data as signal 
            FROM video_call_signals 
            WHERE room_id = ? AND to_user_id = ? 
            AND created_at > DATE_SUB(NOW(), INTERVAL 30 SECOND)
            ORDER BY created_at ASC
        ");
        $stmt->bind_param("si", $room_id, $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $signals = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        
        // Eliminar señales leídas
        if (!empty($signals)) {
            $ids = array_column($signals, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $delete_stmt = $conn->prepare("DELETE FROM video_call_signals WHERE id IN ($placeholders)");
            $types = str_repeat('i', count($ids));
            $delete_stmt->bind_param($types, ...$ids);
            $delete_stmt->execute();
            $delete_stmt->close();
        }
        
        echo json_encode(['success' => true, 'signals' => $signals]);
    }
}

// POST - unirse, salir o enviar señal
if ($method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    $action = $data['action'] ?? '';
    
    if ($action === 'join') {
        $room_id = $data['room_id'] ?? '';
        $is_starter = $data['is_starter'] ?? false;
        
        if (empty($room_id)) {
            echo json_encode(['success' => false, 'error' => 'Room ID requerido']);
            exit();
        }
        
        // Si es quien inicia, registrar la llamada activa
        if ($is_starter) {
            $stmt = $conn->prepare("
                INSERT INTO active_calls (room_id, started_by) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE started_by = ?, is_active = 1, started_at = CURRENT_TIMESTAMP
            ");
            $stmt->bind_param("sii", $room_id, $user_id, $user_id);
            $stmt->execute();
            $stmt->close();
        }
        
        $stmt = $conn->prepare("
            INSERT INTO video_call_participants (room_id, user_id, joined_at) 
            VALUES (?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE joined_at = NOW(), left_at = NULL
        ");
        $stmt->bind_param("si", $room_id, $user_id);
        $success = $stmt->execute();
        $stmt->close();
        
        echo json_encode(['success' => $success]);
        
    } elseif ($action === 'leave') {
        $room_id = $data['room_id'] ?? '';
        
        if (empty($room_id)) {
            echo json_encode(['success' => false, 'error' => 'Room ID requerido']);
            exit();
        }
        
        $stmt = $conn->prepare("UPDATE video_call_participants SET left_at = NOW() WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("si", $room_id, $user_id);
        $success = $stmt->execute();
        $stmt->close();
        
        // Limpiar señales
        $clean_stmt = $conn->prepare("DELETE FROM video_call_signals WHERE room_id = ? AND (from_user_id = ? OR to_user_id = ?)");
        $clean_stmt->bind_param("sii", $room_id, $user_id, $user_id);
        $clean_stmt->execute();
        $clean_stmt->close();
        
        echo json_encode(['success' => $success]);
        
    } elseif ($action === 'signal') {
        $room_id = $data['room_id'] ?? '';
        $target_user_id = $data['target_user_id'] ?? 0;
        $signal = $data['signal'] ?? '';
        
        if (empty($room_id) || !$target_user_id || empty($signal)) {
            echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
            exit();
        }
        
        $signal_json = is_string($signal) ? $signal : json_encode($signal);
        
        $stmt = $conn->prepare("
            INSERT INTO video_call_signals (room_id, from_user_id, to_user_id, signal_data, created_at) 
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->bind_param("siis", $room_id, $user_id, $target_user_id, $signal_json);
        $success = $stmt->execute();
        $stmt->close();
        
        echo json_encode(['success' => $success]);
    }
}

$conn->close();
