<?php
// =============================================
// API: Teams (Selecciones del Mundial)
// =============================================

require_once 'config.php';

header('Content-Type: application/json');

// Conexión a la base de datos
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a la base de datos']);
    exit();
}

// =============================================
// Obtener todas las selecciones
// =============================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    try {
        $stmt = $pdo->query("
            SELECT id, name, code, flag_emoji as flag
            FROM teams
            ORDER BY name
        ");
        $teams = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'teams' => $teams,
            'total' => count($teams)
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener equipos']);
    }
}
// =============================================
// Agregar nueva selección (opcional)
// =============================================
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['name']) || !isset($data['code']) || !isset($data['flag'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos']);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO teams (name, code, flag_emoji)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['code'],
            $data['flag']
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Equipo agregado exitosamente',
            'team_id' => $pdo->lastInsertId()
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al agregar equipo']);
    }
}
// =============================================
// Método no permitido
// =============================================
else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}
?>
