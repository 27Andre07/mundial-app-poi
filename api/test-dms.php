<?php
// Test file para debug de DMS
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'test' => 'DMS endpoint test',
    'session_status' => session_status(),
    'session_id' => session_id() ?: 'No session',
    'php_version' => phpversion(),
    'time' => date('Y-m-d H:i:s')
]);
