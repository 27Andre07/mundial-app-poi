<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuario no autenticado']);
    exit();
}

$user_id = $_SESSION['user_id'];
global $pdo;

if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos']);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    switch ($action) {
        case 'get_balances':
            // Obtener saldos actuales
            $stmt = $pdo->prepare("SELECT tournament_points, points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
                exit();
            }
            
            echo json_encode([
                'success' => true,
                'tournament_points' => (int)$user['tournament_points'],
                'shop_points' => (int)$user['points']
            ]);
            break;
            
        case 'tournament_to_shop':
            // Cambiar puntos de torneo a puntos de tienda
            // 100 puntos torneo = 50 puntos tienda (ratio 2:1)
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['amount']) || $data['amount'] <= 0) {
                echo json_encode(['success' => false, 'message' => 'Cantidad inválida']);
                exit();
            }
            
            $tournament_points = (int)$data['amount'];
            
            // Validar que sea múltiplo de 100
            if ($tournament_points % 100 !== 0) {
                echo json_encode(['success' => false, 'message' => 'La cantidad debe ser múltiplo de 100']);
                exit();
            }
            
            // Calcular puntos de tienda a recibir
            $shop_points = (int)($tournament_points / 2); // 100 -> 50
            
            // Verificar que el usuario tenga suficientes puntos
            $stmt = $pdo->prepare("SELECT tournament_points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ((int)$user['tournament_points'] < $tournament_points) {
                echo json_encode(['success' => false, 'message' => 'No tienes suficientes puntos de torneo']);
                exit();
            }
            
            // Realizar el intercambio
            $stmt = $pdo->prepare("
                UPDATE users 
                SET tournament_points = tournament_points - ?,
                    points = points + ?
                WHERE id = ?
            ");
            $stmt->execute([$tournament_points, $shop_points, $user_id]);
            
            // Obtener nuevos saldos
            $stmt = $pdo->prepare("SELECT tournament_points, points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => "Cambiaste {$tournament_points} pts de torneo por {$shop_points} pts de tienda",
                'tournament_points' => (int)$user['tournament_points'],
                'shop_points' => (int)$user['points']
            ]);
            break;
            
        case 'shop_to_tournament':
            // Cambiar puntos de tienda a puntos de torneo
            // 50 puntos tienda = 100 puntos torneo (ratio 1:2)
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['amount']) || $data['amount'] <= 0) {
                echo json_encode(['success' => false, 'message' => 'Cantidad inválida']);
                exit();
            }
            
            $shop_points = (int)$data['amount'];
            
            // Validar que sea múltiplo de 50
            if ($shop_points % 50 !== 0) {
                echo json_encode(['success' => false, 'message' => 'La cantidad debe ser múltiplo de 50']);
                exit();
            }
            
            // Calcular puntos de torneo a recibir
            $tournament_points = (int)($shop_points * 2); // 50 -> 100
            
            // Verificar que el usuario tenga suficientes puntos
            $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ((int)$user['points'] < $shop_points) {
                echo json_encode(['success' => false, 'message' => 'No tienes suficientes puntos de tienda']);
                exit();
            }
            
            // Realizar el intercambio
            $stmt = $pdo->prepare("
                UPDATE users 
                SET points = points - ?,
                    tournament_points = tournament_points + ?
                WHERE id = ?
            ");
            $stmt->execute([$shop_points, $tournament_points, $user_id]);
            
            // Obtener nuevos saldos
            $stmt = $pdo->prepare("SELECT tournament_points, points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => "Cambiaste {$shop_points} pts de tienda por {$tournament_points} pts de torneo",
                'tournament_points' => (int)$user['tournament_points'],
                'shop_points' => (int)$user['points']
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
