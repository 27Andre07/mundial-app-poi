<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$conn = getDBConnection();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit();
}

$user_id = $_SESSION['user_id'];

// Ejecutar la misma query que usa getConversations
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
    ORDER BY 
        CASE WHEN last_message_time IS NULL THEN 1 ELSE 0 END,
        last_message_time DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iiiiiiiiii", $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

$conversations = [];
while ($row = $result->fetch_assoc()) {
    $conversations[] = $row;
}

echo json_encode([
    'success' => true,
    'user_id' => $user_id,
    'conversations' => $conversations,
    'count' => count($conversations)
], JSON_PRETTY_PRINT);

closeDBConnection($conn);
