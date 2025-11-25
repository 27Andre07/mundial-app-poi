<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$conn = getDBConnection();

// Información de sesión
$sessionInfo = [
    'session_started' => (session_status() === PHP_SESSION_ACTIVE),
    'session_id' => session_id(),
    'user_logged_in' => isset($_SESSION['user_id']),
    'user_id' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null,
];

// Si hay usuario logueado, obtener sus contactos
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    
    // Obtener info del usuario
    $userStmt = $conn->prepare("SELECT id, username, email FROM users WHERE id = ?");
    $userStmt->bind_param("i", $user_id);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $sessionInfo['current_user'] = $userResult->fetch_assoc();
    
    // Obtener contactos aceptados
    $contactsStmt = $conn->prepare("
        SELECT u.id, u.username, u.email
        FROM users u
        WHERE u.id IN (
            SELECT CASE 
                WHEN sender_id = ? THEN receiver_id
                ELSE sender_id
            END
            FROM contact_requests
            WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
        )
    ");
    $contactsStmt->bind_param("iii", $user_id, $user_id, $user_id);
    $contactsStmt->execute();
    $contactsResult = $contactsStmt->get_result();
    
    $contacts = [];
    while ($row = $contactsResult->fetch_assoc()) {
        $contacts[] = $row;
    }
    $sessionInfo['accepted_contacts'] = $contacts;
    $sessionInfo['contacts_count'] = count($contacts);
}

echo json_encode($sessionInfo, JSON_PRETTY_PRINT);
closeDBConnection($conn);
