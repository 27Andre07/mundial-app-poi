<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'session_started' => (session_status() === PHP_SESSION_ACTIVE),
    'session_id' => session_id(),
    'user_id_in_session' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET',
    'session_vars' => $_SESSION,
    'cookies' => $_COOKIE,
    'db_test' => 'Connecting...'
]);

try {
    $conn = getDBConnection();
    $result = $conn->query("SELECT COUNT(*) as count FROM users");
    $row = $result->fetch_assoc();
    echo json_encode(['db_connected' => true, 'users_count' => $row['count']]);
} catch (Exception $e) {
    echo json_encode(['db_connected' => false, 'error' => $e->getMessage()]);
}
