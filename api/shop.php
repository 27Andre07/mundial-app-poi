<?php
require_once 'config.php';

$conn = getDBConnection();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit();
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'purchases';
    if ($action === 'purchases') {
        getUserPurchases($conn, $user_id);
    } else if ($action === 'active') {
        getActiveItems($conn, $user_id);
    }
} else if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    
    if ($action === 'purchase') {
        purchaseItem($conn, $data, $user_id);
    } else if ($action === 'toggle') {
        toggleItem($conn, $data, $user_id);
    }
}

closeDBConnection($conn);

function getUserPurchases($conn, $user_id) {
    $stmt = $conn->prepare("SELECT * FROM shop_purchases WHERE user_id = ? ORDER BY purchased_at DESC");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $purchases = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    echo json_encode(['success' => true, 'purchases' => $purchases]);
}

function getActiveItems($conn, $user_id) {
    $stmt = $conn->prepare("SELECT item_id, item_name FROM shop_purchases WHERE user_id = ? AND is_active = TRUE");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $activeItems = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    echo json_encode(['success' => true, 'active_items' => $activeItems]);
}

function purchaseItem($conn, $data, $user_id) {
    $item_id = $data['item_id'] ?? '';
    $item_name = $data['item_name'] ?? '';
    $price = $data['price'] ?? 0;
    
    if (empty($item_id) || empty($item_name) || $price <= 0) {
        echo json_encode(['success' => false, 'error' => 'Datos inválidos']);
        return;
    }
    
    // Obtener puntos actuales del usuario
    $stmt = $conn->prepare("SELECT points FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    
    if (!$user) {
        echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
        return;
    }
    
    $current_points = $user['points'];
    
    // Verificar si tiene suficientes puntos
    if ($current_points < $price) {
        echo json_encode(['success' => false, 'error' => 'No tienes suficientes puntos']);
        return;
    }
    
    // Verificar si ya compró este item
    $check_stmt = $conn->prepare("SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?");
    $check_stmt->bind_param("is", $user_id, $item_id);
    $check_stmt->execute();
    if ($check_stmt->get_result()->num_rows > 0) {
        echo json_encode(['success' => false, 'error' => 'Ya has comprado este artículo']);
        $check_stmt->close();
        return;
    }
    $check_stmt->close();
    
    // Iniciar transacción
    $conn->begin_transaction();
    
    try {
        // Restar puntos al usuario
        $update_stmt = $conn->prepare("UPDATE users SET points = points - ? WHERE id = ?");
        $update_stmt->bind_param("ii", $price, $user_id);
        $update_stmt->execute();
        $update_stmt->close();
        
        // Registrar la compra
        $insert_stmt = $conn->prepare("INSERT INTO shop_purchases (user_id, item_id, item_name, price) VALUES (?, ?, ?, ?)");
        $insert_stmt->bind_param("issi", $user_id, $item_id, $item_name, $price);
        $insert_stmt->execute();
        $insert_stmt->close();
        
        $conn->commit();
        
        // Obtener puntos actualizados
        $new_points = $current_points - $price;
        
        echo json_encode(['success' => true, 'new_points' => $new_points, 'message' => 'Compra realizada exitosamente']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => 'Error al procesar la compra: ' . $e->getMessage()]);
    }
}

function toggleItem($conn, $data, $user_id) {
    $purchase_id = $data['purchase_id'] ?? 0;
    $item_id = $data['item_id'] ?? '';
    
    if ($purchase_id <= 0) {
        echo json_encode(['success' => false, 'error' => 'ID de compra inválido']);
        return;
    }
    
    // Verificar que la compra pertenezca al usuario
    $check_stmt = $conn->prepare("SELECT is_active FROM shop_purchases WHERE id = ? AND user_id = ?");
    $check_stmt->bind_param("ii", $purchase_id, $user_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Compra no encontrada']);
        $check_stmt->close();
        return;
    }
    
    $purchase = $result->fetch_assoc();
    $current_status = $purchase['is_active'];
    $check_stmt->close();
    
    // Solo un item del mismo tipo puede estar activo a la vez
    // Desactivar otros items del mismo tipo
    $deactivate_stmt = $conn->prepare("UPDATE shop_purchases SET is_active = FALSE WHERE user_id = ? AND item_id = ?");
    $deactivate_stmt->bind_param("is", $user_id, $item_id);
    $deactivate_stmt->execute();
    $deactivate_stmt->close();
    
    // Toggle el estado del item seleccionado
    $new_status = !$current_status;
    $update_stmt = $conn->prepare("UPDATE shop_purchases SET is_active = ? WHERE id = ?");
    $update_stmt->bind_param("ii", $new_status, $purchase_id);
    
    if ($update_stmt->execute()) {
        echo json_encode(['success' => true, 'is_active' => $new_status]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al actualizar estado']);
    }
    
    $update_stmt->close();
}
