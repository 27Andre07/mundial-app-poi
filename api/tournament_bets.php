<?php
// Iniciar sesión ANTES de cualquier salida
session_start();

require_once 'config.php';

header('Content-Type: application/json');

// Obtener la acción
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuario no autenticado']);
    exit();
}

$user_id = $_SESSION['user_id'];

// Usar la conexión PDO global de config.php
global $pdo;

if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos']);
    exit();
}

try {
    switch ($action) {
        case 'get_data':
            // Obtener puntos del usuario y lista de equipos
            $stmt = $pdo->prepare("SELECT tournament_points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
                exit();
            }
            
            // Obtener equipos
            $stmt = $pdo->prepare("SELECT id, name, code, flag_emoji FROM teams ORDER BY name ASC");
            $stmt->execute();
            $teams = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Obtener apuestas del usuario
            $stmt = $pdo->prepare("
                SELECT tb.*, t.flag_emoji 
                FROM tournament_bets tb
                JOIN teams t ON tb.team_id = t.id
                WHERE tb.user_id = ?
                ORDER BY tb.created_at DESC
            ");
            $stmt->execute([$user_id]);
            $bets = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'tournament_points' => (int)$user['tournament_points'],
                'teams' => $teams,
                'bets' => $bets
            ]);
            break;
            
        case 'place_bet':
            // Crear una apuesta
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['team_id']) || !isset($data['points_bet'])) {
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
                exit();
            }
            
            $team_id = (int)$data['team_id'];
            $points_bet = (int)$data['points_bet'];
            
            // Validar puntos
            if ($points_bet <= 0) {
                echo json_encode(['success' => false, 'message' => 'Debes apostar al menos 1 punto']);
                exit();
            }
            
            // Verificar que el usuario tenga suficientes puntos
            $stmt = $pdo->prepare("SELECT tournament_points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user['tournament_points'] < $points_bet) {
                echo json_encode(['success' => false, 'message' => 'No tienes suficientes puntos']);
                exit();
            }
            
            // Obtener nombre del equipo
            $stmt = $pdo->prepare("SELECT name FROM teams WHERE id = ?");
            $stmt->execute([$team_id]);
            $team = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$team) {
                echo json_encode(['success' => false, 'message' => 'Equipo no encontrado']);
                exit();
            }
            
            // Crear la apuesta
            $stmt = $pdo->prepare("
                INSERT INTO tournament_bets (user_id, team_id, team_name, points_bet, status)
                VALUES (?, ?, ?, ?, 'pending')
            ");
            $stmt->execute([$user_id, $team_id, $team['name'], $points_bet]);
            
            // Descontar puntos del usuario
            $stmt = $pdo->prepare("UPDATE users SET tournament_points = tournament_points - ? WHERE id = ?");
            $stmt->execute([$points_bet, $user_id]);
            
            // Obtener nuevos puntos
            $stmt = $pdo->prepare("SELECT tournament_points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Apuesta realizada correctamente',
                'tournament_points' => (int)$user['tournament_points']
            ]);
            break;
            
        case 'resolve_bet':
            // Resolver una apuesta (solo para admin o sistema)
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['bet_id']) || !isset($data['result'])) {
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
                exit();
            }
            
            $bet_id = (int)$data['bet_id'];
            $result = $data['result']; // 'won' o 'lost'
            $multiplier = isset($data['multiplier']) ? (float)$data['multiplier'] : 2.0;
            
            // Obtener la apuesta
            $stmt = $pdo->prepare("SELECT * FROM tournament_bets WHERE id = ? AND user_id = ?");
            $stmt->execute([$bet_id, $user_id]);
            $bet = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$bet) {
                echo json_encode(['success' => false, 'message' => 'Apuesta no encontrada']);
                exit();
            }
            
            if ($bet['status'] !== 'pending') {
                echo json_encode(['success' => false, 'message' => 'Esta apuesta ya fue resuelta']);
                exit();
            }
            
            // Calcular resultado
            $points_result = 0;
            if ($result === 'won') {
                $points_result = (int)($bet['points_bet'] * $multiplier);
                
                // Devolver puntos ganados
                $stmt = $pdo->prepare("UPDATE users SET tournament_points = tournament_points + ? WHERE id = ?");
                $stmt->execute([$points_result, $user_id]);
            } else {
                $points_result = -$bet['points_bet'];
            }
            
            // Actualizar apuesta
            $stmt = $pdo->prepare("
                UPDATE tournament_bets 
                SET status = ?, points_result = ?, multiplier = ?, resolved_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$result, $points_result, $multiplier, $bet_id]);
            
            // Obtener nuevos puntos
            $stmt = $pdo->prepare("SELECT tournament_points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Apuesta resuelta',
                'tournament_points' => (int)$user['tournament_points'],
                'points_result' => $points_result
            ]);
            break;
            
        case 'get_stats':
            // Obtener estadísticas de apuestas
            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(*) as total_bets,
                    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_bets,
                    SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_bets,
                    SUM(CASE WHEN status = 'pending' THEN points_bet ELSE 0 END) as pending_points,
                    SUM(CASE WHEN status = 'won' THEN points_result ELSE 0 END) as total_won,
                    SUM(CASE WHEN status = 'lost' THEN ABS(points_result) ELSE 0 END) as total_lost
                FROM tournament_bets
                WHERE user_id = ?
            ");
            $stmt->execute([$user_id]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'stats' => $stats
            ]);
            break;
            
        case 'resolve_all_bets':
            // Resolver todas las apuestas pendientes cuando termina el torneo
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['winner_team_name'])) {
                echo json_encode(['success' => false, 'message' => 'Nombre del equipo ganador requerido']);
                exit();
            }
            
            $winner_team_name = $data['winner_team_name'];
            $team_phases = isset($data['team_phases']) ? $data['team_phases'] : [];
            
            // Función para calcular multiplicador según fase alcanzada
            function getMultiplierByPhase($phase) {
                switch ($phase) {
                    case 'champion': return 3.0;      // Campeón: triplica (x3)
                    case 'final': return 2.0;         // Final: duplica (x2)
                    case 'semifinals': return 0.5;    // Semifinales: gana 50% más (x1.5)
                    case 'quarterfinals': return 0.0; // Cuartos: recupera apuesta (x1)
                    case 'roundOf16': return -0.25;   // Octavos: pierde 25% (-25%)
                    case 'roundOf32': return -0.5;    // 16avos: pierde mitad (-50%)
                    default: return -1.0;             // No clasificó (grupos): pierde todo (-100%)
                }
            }
            
            // Obtener todas las apuestas pendientes del usuario
            $stmt = $pdo->prepare("SELECT * FROM tournament_bets WHERE user_id = ? AND status = 'pending'");
            $stmt->execute([$user_id]);
            $pending_bets = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $resolved_count = 0;
            $winners = 0;
            $losers = 0;
            
            foreach ($pending_bets as $bet) {
                $team_name = $bet['team_name'];
                $points_bet = $bet['points_bet'];
                
                // Obtener fase alcanzada por el equipo
                $phase = isset($team_phases[$team_name]) ? $team_phases[$team_name] : 'groups';
                $multiplier = getMultiplierByPhase($phase);
                
                // Calcular resultado según multiplicador
                if ($multiplier >= 0) {
                    // Ganó o recuperó apuesta
                    $points_result = (int)($points_bet * $multiplier);
                    
                    // Si multiplicador es 0, recupera apuesta (status = won pero con 0 ganancia)
                    // Si multiplicador > 0, ganó puntos
                    $status = 'won';
                    
                    // Devolver puntos al usuario
                    // Si multiplicador es 0 (cuartos), devolver los puntos apostados originalmente
                    // Si multiplicador > 0, devolver puntos apostados + ganancia
                    if ($multiplier == 0) {
                        // Recupera exactamente lo que apostó
                        $stmt = $pdo->prepare("UPDATE users SET tournament_points = tournament_points + ? WHERE id = ?");
                        $stmt->execute([$points_bet, $user_id]);
                    } else {
                        // Gana puntos adicionales (puntos apostados ya + ganancia)
                        $stmt = $pdo->prepare("UPDATE users SET tournament_points = tournament_points + ? WHERE id = ?");
                        $stmt->execute([$points_result, $user_id]);
                    }
                    
                    $winners++;
                } else {
                    // Perdió
                    $points_result = (int)($points_bet * $multiplier);
                    $status = 'lost';
                    
                    // Si pierde solo la mitad, devolver el resto
                    if ($multiplier > -1.0) {
                        $points_to_return = (int)($points_bet * (1 + $multiplier)); // ej: 100 * (1 - 0.5) = 50
                        $stmt = $pdo->prepare("UPDATE users SET tournament_points = tournament_points + ? WHERE id = ?");
                        $stmt->execute([$points_to_return, $user_id]);
                    }
                    
                    $losers++;
                }
                
                // Actualizar apuesta
                $stmt = $pdo->prepare("
                    UPDATE tournament_bets 
                    SET status = ?, points_result = ?, multiplier = ?, resolved_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$status, $points_result, $multiplier, $bet['id']]);
                
                $resolved_count++;
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Apuestas resueltas correctamente',
                'resolved' => $resolved_count,
                'winners' => $winners,
                'losers' => $losers,
                'champion' => $winner_team_name
            ]);
            break;
            
        case 'reset_bets':
            // Eliminar todas las apuestas del usuario (al reiniciar el torneo)
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM tournament_bets WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $bets_count = $result['count'];
            
            // Devolver los puntos de las apuestas pendientes
            $stmt = $pdo->prepare("
                SELECT SUM(points_bet) as total_points 
                FROM tournament_bets 
                WHERE user_id = ? AND status = 'pending'
            ");
            $stmt->execute([$user_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $points_to_return = $result['total_points'] ?? 0;
            
            if ($points_to_return > 0) {
                // Devolver puntos al usuario
                $stmt = $pdo->prepare("UPDATE users SET tournament_points = tournament_points + ? WHERE id = ?");
                $stmt->execute([$points_to_return, $user_id]);
            }
            
            // Eliminar todas las apuestas del usuario
            $stmt = $pdo->prepare("DELETE FROM tournament_bets WHERE user_id = ?");
            $stmt->execute([$user_id]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Apuestas eliminadas correctamente',
                'deleted' => $bets_count,
                'points_returned' => $points_to_return
            ]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Acción no válida']);
            break;
    }
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>
