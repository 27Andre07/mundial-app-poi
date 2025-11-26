<?php
// Test simple para verificar que la API funcione
session_start();

// Simular una sesión para prueba
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1; // Usuario admin
}

echo "<!DOCTYPE html><html><head><title>Test API Apuestas</title></head><body>";
echo "<h1>Test de API de Apuestas de Torneo</h1>";

echo "<h2>1. Verificando sesión...</h2>";
if (isset($_SESSION['user_id'])) {
    echo "<p style='color:green'>✅ Sesión activa - User ID: " . $_SESSION['user_id'] . "</p>";
} else {
    echo "<p style='color:red'>❌ No hay sesión activa</p>";
}

echo "<h2>2. Probando endpoint get_data...</h2>";
$url = 'http://localhost/mundial-app-poi/api/tournament_bets.php?action=get_data';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<p>HTTP Code: $httpCode</p>";
echo "<h3>Respuesta:</h3>";
echo "<pre style='background:#f4f4f4; padding:10px; border:1px solid #ddd; overflow:auto;'>";
echo htmlspecialchars($response);
echo "</pre>";

$data = json_decode($response, true);
if ($data) {
    echo "<h3>Datos decodificados:</h3>";
    echo "<ul>";
    echo "<li>Success: " . ($data['success'] ? 'true' : 'false') . "</li>";
    if ($data['success']) {
        echo "<li>Tournament Points: " . ($data['tournament_points'] ?? 'N/A') . "</li>";
        echo "<li>Teams: " . count($data['teams'] ?? []) . " equipos</li>";
        echo "<li>Bets: " . count($data['bets'] ?? []) . " apuestas</li>";
    } else {
        echo "<li>Message: " . ($data['message'] ?? 'N/A') . "</li>";
    }
    echo "</ul>";
} else {
    echo "<p style='color:red'>❌ Error: La respuesta no es JSON válido</p>";
}

echo "<hr>";
echo "<h2>3. Verificando base de datos...</h2>";

require_once 'api/config.php';

try {
    $conn = getDbConnection();
    
    // Verificar tabla users
    $stmt = $conn->query("SHOW COLUMNS FROM users LIKE 'tournament_points'");
    $columnExists = $stmt->fetch();
    
    if ($columnExists) {
        echo "<p style='color:green'>✅ Columna tournament_points existe en tabla users</p>";
    } else {
        echo "<p style='color:red'>❌ Columna tournament_points NO existe en tabla users</p>";
    }
    
    // Verificar tabla tournament_bets
    $stmt = $conn->query("SHOW TABLES LIKE 'tournament_bets'");
    $tableExists = $stmt->fetch();
    
    if ($tableExists) {
        echo "<p style='color:green'>✅ Tabla tournament_bets existe</p>";
    } else {
        echo "<p style='color:red'>❌ Tabla tournament_bets NO existe</p>";
    }
    
    // Verificar tabla teams
    $stmt = $conn->query("SELECT COUNT(*) as count FROM teams");
    $result = $stmt->fetch();
    $teamCount = $result['count'];
    
    echo "<p style='color:green'>✅ Tabla teams tiene $teamCount equipos</p>";
    
    // Verificar usuario
    $stmt = $conn->prepare("SELECT id, username, tournament_points FROM users WHERE id = ?");
    $stmt->execute([1]);
    $user = $stmt->fetch();
    
    if ($user) {
        echo "<p style='color:green'>✅ Usuario encontrado: " . $user['username'] . " - Puntos: " . ($user['tournament_points'] ?? 'NULL') . "</p>";
    } else {
        echo "<p style='color:red'>❌ Usuario no encontrado</p>";
    }
    
} catch (PDOException $e) {
    echo "<p style='color:red'>❌ Error de base de datos: " . $e->getMessage() . "</p>";
}

echo "</body></html>";
?>
