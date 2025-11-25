<?php
// =============================================
// API DE PREDICCIONES DE TORNEO
// Mundial App - POI 2025
// =============================================

// Suprimir todos los errores de PHP para evitar output no-JSON
error_reporting(0);
ini_set('display_errors', 0);

require_once 'config.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

// Verificar autenticación
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Leer acción de GET, POST o JSON body
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Si no hay acción y es POST, intentar leer del JSON body
if (empty($action) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = json_decode(file_get_contents('php://input'), true);
    if ($json && isset($json['action'])) {
        $action = $json['action'];
        // Hacer disponibles los datos del JSON en $_POST para las funciones
        $_POST = array_merge($_POST, $json);
    }
}

try {
    switch ($action) {
        case 'get_matches':
            getMatches($pdo, $user_id);
            break;
        
        case 'save_predictions':
            savePredictions($pdo, $user_id);
            break;
        
        case 'get_leaderboard':
            getLeaderboard($pdo, $user_id);
            break;
        
        case 'calculate_scores':
            calculateScores($pdo);
            break;
        
        case 'save_simulation_results':
            saveSimulationResults($pdo, $user_id);
            break;
        
        case 'reset_predictions':
            resetPredictions($pdo, $user_id);
            break;
        
        case 'sync_matches':
            syncMatches($pdo, $user_id);
            break;
        
        default:
            echo json_encode(['success' => false, 'error' => 'Acción no válida']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// =============================================
// FUNCIONES
// =============================================

function getMatches($pdo, $user_id) {
    $jornada = $_GET['jornada'] ?? 1;
    
    // Verificar si la tabla existe
    try {
        $pdo->query("SELECT 1 FROM matches LIMIT 1");
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false, 
            'error' => 'Tablas no creadas. Ejecuta sql/install_predictions.bat'
        ]);
        exit;
    }
    
    // Obtener partidos de la jornada
    $stmt = $pdo->prepare("
        SELECT 
            m.id,
            m.home_team,
            m.away_team,
            m.date,
            m.home_score,
            m.away_score,
            m.status
        FROM matches m
        WHERE m.jornada_id = ?
        ORDER BY m.date ASC
    ");
    $stmt->execute([$jornada]);
    $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener predicciones del usuario
    $stmt = $pdo->prepare("
        SELECT match_id, prediction
        FROM predictions
        WHERE user_id = ? AND jornada_id = ?
    ");
    $stmt->execute([$user_id, $jornada]);
    $predictions = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    echo json_encode([
        'success' => true,
        'matches' => $matches,
        'user_predictions' => $predictions
    ]);
}

function savePredictions($pdo, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $jornada = $data['jornada'] ?? 0;
    $predictions = $data['predictions'] ?? [];
    
    if (empty($predictions)) {
        echo json_encode(['success' => false, 'error' => 'No hay predicciones']);
        return;
    }
    
    // Verificar que la jornada no esté cerrada
    $stmt = $pdo->prepare("SELECT is_closed FROM jornadas WHERE id = ?");
    $stmt->execute([$jornada]);
    $jornada_data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($jornada_data && $jornada_data['is_closed']) {
        echo json_encode(['success' => false, 'error' => 'Esta jornada está cerrada']);
        return;
    }
    
    // Guardar predicciones (upsert)
    $pdo->beginTransaction();
    
    try {
        foreach ($predictions as $match_id => $prediction) {
            $stmt = $pdo->prepare("
                INSERT INTO predictions (user_id, match_id, jornada_id, prediction, created_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    prediction = VALUES(prediction),
                    updated_at = NOW()
            ");
            $stmt->execute([$user_id, $match_id, $jornada, $prediction]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'Error al guardar: ' . $e->getMessage()]);
    }
}

function getLeaderboard($pdo, $user_id) {
    $jornada = $_GET['jornada'] ?? 1;
    
    // Obtener leaderboard (top 10)
    $stmt = $pdo->prepare("
        SELECT 
            u.id as user_id,
            u.username,
            COUNT(CASE WHEN p.is_correct = 1 THEN 1 END) as correct_predictions,
            SUM(CASE WHEN p.is_correct = 1 THEN 25 ELSE 0 END) as points
        FROM users u
        INNER JOIN predictions p ON p.user_id = u.id
        WHERE p.jornada_id = ?
        GROUP BY u.id, u.username
        ORDER BY points DESC, correct_predictions DESC
        LIMIT 10
    ");
    $stmt->execute([$jornada]);
    $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener posición del usuario actual
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) + 1 as position
        FROM (
            SELECT 
                u.id,
                SUM(CASE WHEN p.is_correct = 1 THEN 25 ELSE 0 END) as points
            FROM users u
            INNER JOIN predictions p ON p.user_id = u.id
            WHERE p.jornada_id = ?
            GROUP BY u.id
            HAVING points > (
                SELECT SUM(CASE WHEN p2.is_correct = 1 THEN 25 ELSE 0 END)
                FROM predictions p2
                WHERE p2.user_id = ? AND p2.jornada_id = ?
            )
        ) as ranked
    ");
    $stmt->execute([$jornada, $user_id, $jornada]);
    $user_position = $stmt->fetchColumn();
    
    echo json_encode([
        'success' => true,
        'leaderboard' => $leaderboard,
        'user_position' => $user_position ?: null
    ]);
}

function calculateScores($pdo) {
    // Solo admin puede ejecutar esto
    if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
        echo json_encode(['success' => false, 'error' => 'Acceso denegado']);
        return;
    }
    
    $jornada = $_POST['jornada'] ?? 0;
    
    // Obtener partidos finalizados de la jornada
    $stmt = $pdo->prepare("
        SELECT id, home_team, away_team, home_score, away_score
        FROM matches
        WHERE jornada_id = ? AND status = 'finished'
    ");
    $stmt->execute([$jornada]);
    $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $pdo->beginTransaction();
    
    try {
        foreach ($matches as $match) {
            // Determinar resultado real
            if ($match['home_score'] > $match['away_score']) {
                $actual_result = 'home';
            } elseif ($match['away_score'] > $match['home_score']) {
                $actual_result = 'away';
            } else {
                $actual_result = 'draw';
            }
            
            // Actualizar predicciones
            $stmt = $pdo->prepare("
                UPDATE predictions
                SET is_correct = (prediction = ?),
                    points_earned = CASE WHEN prediction = ? THEN 25 ELSE 0 END
                WHERE match_id = ? AND jornada_id = ?
            ");
            $stmt->execute([$actual_result, $actual_result, $match['id'], $jornada]);
        }
        
        // Actualizar reward points basado en posición
        $stmt = $pdo->prepare("
            SELECT 
                u.id as user_id,
                SUM(CASE WHEN p.is_correct = 1 THEN 25 ELSE 0 END) as total_points,
                ROW_NUMBER() OVER (ORDER BY SUM(CASE WHEN p.is_correct = 1 THEN 25 ELSE 0 END) DESC) as position
            FROM users u
            INNER JOIN predictions p ON p.user_id = u.id
            WHERE p.jornada_id = ?
            GROUP BY u.id
        ");
        $stmt->execute([$jornada]);
        $rankings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rankings as $rank) {
            $reward_points = 10; // Mínimo
            if ($rank['position'] == 1) $reward_points = 500;
            elseif ($rank['position'] == 2) $reward_points = 300;
            elseif ($rank['position'] == 3) $reward_points = 150;
            elseif ($rank['position'] <= 10) $reward_points = 50;
            
            // Actualizar reward points del usuario
            $stmt = $pdo->prepare("
                UPDATE users
                SET points = points + ?
                WHERE id = ?
            ");
            $stmt->execute([$reward_points, $rank['user_id']]);
        }
        
        // Cerrar jornada
        $stmt = $pdo->prepare("UPDATE jornadas SET is_closed = 1 WHERE id = ?");
        $stmt->execute([$jornada]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'calculated' => count($matches)]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function saveSimulationResults($pdo, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $results = $data['results'] ?? [];
    
    if (empty($results)) {
        echo json_encode(['success' => false, 'error' => 'No hay resultados']);
        return;
    }
    
    $pdo->beginTransaction();
    
    try {
        $updated = 0;
        $jornadas_completadas = [];
        
        foreach ($results as $result) {
            // Buscar el partido por equipos (sin importar jornada, solo que esté pending)
            $stmt = $pdo->prepare("
                SELECT id, jornada_id 
                FROM matches 
                WHERE (home_team = ? AND away_team = ?) 
                   OR (home_team = ? AND away_team = ?)
                AND status = 'pending'
                ORDER BY jornada_id ASC
                LIMIT 1
            ");
            $stmt->execute([
                $result['home'], $result['away'],
                $result['away'], $result['home']
            ]);
            $match = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($match) {
                // Actualizar resultado (ajustar si el orden está invertido)
                $stmt = $pdo->prepare("
                    SELECT home_team FROM matches WHERE id = ?
                ");
                $stmt->execute([$match['id']]);
                $matchData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                $home_score = $result['score1'];
                $away_score = $result['score2'];
                
                // Si el orden está invertido, intercambiar
                if ($matchData['home_team'] !== $result['home']) {
                    $temp = $home_score;
                    $home_score = $away_score;
                    $away_score = $temp;
                }
                
                $stmt = $pdo->prepare("
                    UPDATE matches
                    SET home_score = ?, 
                        away_score = ?, 
                        status = 'finished'
                    WHERE id = ?
                ");
                $stmt->execute([$home_score, $away_score, $match['id']]);
                
                $updated++;
                $jornadas_completadas[$match['jornada_id']] = true;
            }
        }
        
        // Verificar y calcular puntos para cada jornada afectada
        foreach (array_keys($jornadas_completadas) as $jornada_id) {
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as pending
                FROM matches
                WHERE jornada_id = ? AND status = 'pending'
            ");
            $stmt->execute([$jornada_id]);
            $pending = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Si no hay partidos pendientes, calcular puntos automáticamente
            if ($pending['pending'] == 0) {
                calculateScoresForJornada($pdo, $jornada_id);
            }
        }
        
        $pdo->commit();
        echo json_encode([
            'success' => true, 
            'updated' => $updated,
            'message' => "Se guardaron $updated resultados"
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function calculateScoresForJornada($pdo, $jornada_id) {
    // Obtener partidos finalizados de la jornada
    $stmt = $pdo->prepare("
        SELECT id, home_team, away_team, home_score, away_score
        FROM matches
        WHERE jornada_id = ? AND status = 'finished'
    ");
    $stmt->execute([$jornada_id]);
    $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($matches)) return;
    
    foreach ($matches as $match) {
        // Determinar resultado real
        if ($match['home_score'] > $match['away_score']) {
            $actual_result = 'home';
        } elseif ($match['away_score'] > $match['home_score']) {
            $actual_result = 'away';
        } else {
            $actual_result = 'draw';
        }
        
        // Actualizar predicciones
        $stmt = $pdo->prepare("
            UPDATE predictions
            SET is_correct = (prediction = ?),
                points_earned = CASE WHEN prediction = ? THEN 25 ELSE 0 END
            WHERE match_id = ? AND jornada_id = ?
        ");
        $stmt->execute([$actual_result, $actual_result, $match['id'], $jornada_id]);
    }
    
    // Calcular rankings y dar reward points
    $stmt = $pdo->prepare("
        SELECT 
            u.id as user_id,
            SUM(CASE WHEN p.is_correct = 1 THEN 25 ELSE 0 END) as total_points,
            ROW_NUMBER() OVER (ORDER BY SUM(CASE WHEN p.is_correct = 1 THEN 25 ELSE 0 END) DESC) as position
        FROM users u
        INNER JOIN predictions p ON p.user_id = u.id
        WHERE p.jornada_id = ?
        GROUP BY u.id
    ");
    $stmt->execute([$jornada_id]);
    $rankings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($rankings as $rank) {
        $reward_points = 10; // Mínimo
        if ($rank['position'] == 1) $reward_points = 500;
        elseif ($rank['position'] == 2) $reward_points = 300;
        elseif ($rank['position'] == 3) $reward_points = 150;
        elseif ($rank['position'] <= 10) $reward_points = 50;
        
        // Actualizar puntos del usuario
        $stmt = $pdo->prepare("
            UPDATE users
            SET points = points + ?
            WHERE id = ?
        ");
        $stmt->execute([$reward_points, $rank['user_id']]);
    }
    
    // Cerrar jornada
    $stmt = $pdo->prepare("UPDATE jornadas SET is_closed = 1 WHERE id = ?");
    $stmt->execute([$jornada_id]);
}

function resetPredictions($pdo, $user_id) {
    try {
        $pdo->beginTransaction();
        
        // Resetear todos los partidos
        $stmt = $pdo->prepare("
            UPDATE matches 
            SET home_score = NULL, 
                away_score = NULL, 
                status = 'pending'
        ");
        $stmt->execute();
        
        // Borrar todas las predicciones
        $stmt = $pdo->prepare("DELETE FROM predictions");
        $stmt->execute();
        
        // Reabrir todas las jornadas
        $stmt = $pdo->prepare("UPDATE jornadas SET is_closed = 0");
        $stmt->execute();
        
        $pdo->commit();
        echo json_encode([
            'success' => true, 
            'message' => 'Predicciones y resultados reiniciados'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function syncMatches($pdo, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $matches = $data['matches'] ?? [];
    
    if (empty($matches)) {
        echo json_encode(['success' => false, 'error' => 'No hay partidos']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Verificar si ya hay partidos en BD
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM matches WHERE jornada_id IN (1, 2, 3)");
        $stmt->execute();
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Si ya existen partidos, no hacer nada (mantener los existentes)
        if ($existing['total'] > 0) {
            $pdo->commit();
            echo json_encode([
                'success' => true, 
                'synced' => 0,
                'message' => 'Partidos ya existen en BD'
            ]);
            return;
        }
        
        // Solo si NO existen, crear los partidos
        $matchesPerJornada = 12; // 12 partidos por jornada (6 grupos x 2 partidos)
        $synced = 0;
        
        foreach ($matches as $index => $match) {
            // Calcular jornada (1, 2, o 3)
            $jornada_id = floor($index / $matchesPerJornada) + 1;
            if ($jornada_id > 3) $jornada_id = 3;
            
            // Insertar partido
            $stmt = $pdo->prepare("
                INSERT INTO matches (jornada_id, home_team, away_team, date, group_name, status)
                VALUES (?, ?, ?, NOW() + INTERVAL ? DAY, ?, 'pending')
            ");
            $stmt->execute([
                $jornada_id,
                $match['home'],
                $match['away'],
                $index, // Fecha incrementa por partido
                $match['group'],
            ]);
            $synced++;
        }
        
        $pdo->commit();
        echo json_encode([
            'success' => true, 
            'synced' => $synced,
            'message' => "Se crearon $synced partidos iniciales"
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}


