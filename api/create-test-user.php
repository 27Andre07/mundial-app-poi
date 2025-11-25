<?php
// Script para crear usuario de prueba
require_once 'config.php';

$email = 'test@test.com';
$username = 'TestUser';
$password = '123456'; // Contraseña simple para pruebas
$hashed = password_hash($password, PASSWORD_DEFAULT);

try {
    $conn = getDBConnection();
    
    // Verificar si el usuario ya existe
    $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    
    if ($check->get_result()->num_rows > 0) {
        echo "El usuario test@test.com ya existe.\n";
        echo "Puedes iniciar sesión con:\n";
        echo "Email: test@test.com\n";
        echo "Password: 123456\n";
    } else {
        // Crear nuevo usuario
        $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $username, $email, $hashed);
        
        if ($stmt->execute()) {
            echo "✓ Usuario de prueba creado exitosamente!\n\n";
            echo "Credenciales:\n";
            echo "Email: test@test.com\n";
            echo "Password: 123456\n\n";
            echo "Ahora puedes iniciar sesión en:\n";
            echo "https://mundialpoi-app.ngrok.app/login.html\n";
        } else {
            echo "Error al crear usuario: " . $conn->error . "\n";
        }
    }
    
    closeDBConnection($conn);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
