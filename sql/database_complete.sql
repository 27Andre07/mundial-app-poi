-- =============================================
-- MUNDIAL APP - BASE DE DATOS COMPLETA
-- Fecha: 23 de Noviembre, 2025
-- =============================================

-- Crear y usar la base de datos
CREATE DATABASE IF NOT EXISTS POI;
USE POI;

-- =============================================
-- TABLA: users
-- Usuarios de la aplicación
-- =============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- =============================================
-- TABLA: groups_table
-- Grupos creados por los usuarios
-- =============================================
CREATE TABLE groups_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by)
);

-- =============================================
-- TABLA: group_members
-- Miembros de cada grupo
-- =============================================
CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_member (group_id, user_id),
    INDEX idx_group_members_group (group_id),
    INDEX idx_group_members_user (user_id)
);

-- =============================================
-- TABLA: channels
-- Canales dentro de los grupos (texto y tareas)
-- =============================================
CREATE TABLE channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    group_id INT NOT NULL,
    type ENUM('text', 'tasks') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
    INDEX idx_group_id (group_id)
);

-- =============================================
-- TABLA: messages
-- Mensajes enviados en los canales de grupo
-- =============================================
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_channel_created (channel_id, created_at),
    INDEX idx_messages_channel (channel_id),
    INDEX idx_messages_created (created_at)
);

-- =============================================
-- TABLA: tasks
-- Tareas asignadas dentro de los grupos
-- =============================================
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    group_id INT NOT NULL,
    assigned_to INT,
    assigned_by INT NOT NULL,
    status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tasks_group (group_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_assigned_by (assigned_by)
);

-- =============================================
-- TABLA: shop_items
-- Catálogo de artículos disponibles en la tienda
-- =============================================
CREATE TABLE shop_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    INDEX idx_item_id (item_id)
);

-- =============================================
-- TABLA: shop_purchases
-- Compras realizadas por los usuarios
-- =============================================
CREATE TABLE shop_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_purchases (user_id),
    INDEX idx_active_items (user_id, is_active)
);

-- =============================================
-- TABLA: contact_requests
-- Solicitudes de contacto para mensajes directos
-- =============================================
CREATE TABLE contact_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_contact_request (sender_id, receiver_id),
    INDEX idx_receiver_status (receiver_id, status),
    INDEX idx_sender (sender_id)
);

-- =============================================
-- TABLA: direct_messages
-- Mensajes directos entre usuarios
-- =============================================
CREATE TABLE direct_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'video', 'pdf', 'location') DEFAULT 'text',
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender_receiver (sender_id, receiver_id),
    INDEX idx_receiver_sender (receiver_id, sender_id),
    INDEX idx_created (created_at),
    INDEX idx_conversation (sender_id, receiver_id, created_at)
);

-- =============================================
-- TABLA: video_call_participants
-- Participantes activos en videollamadas
-- =============================================
CREATE TABLE video_call_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP NULL,
    left_at TIMESTAMP NULL,
    UNIQUE KEY unique_participant (room_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room (room_id),
    INDEX idx_active (room_id, left_at)
);

-- =============================================
-- TABLA: video_call_signals
-- Señales WebRTC para videollamadas
-- =============================================
CREATE TABLE video_call_signals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    signal_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room_user (room_id, to_user_id),
    INDEX idx_created (created_at)
);

-- =============================================
-- TABLA: active_calls
-- Registro de llamadas activas en canales
-- =============================================
CREATE TABLE active_calls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    started_by INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room_active (room_id, is_active)
);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Usuario administrador (contraseña: 123456)
INSERT INTO users (username, email, password, points) 
VALUES ('Admin', 'admin@mundialapp.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1000);

-- Items de la tienda
INSERT INTO shop_items (item_id, item_name, description, price) VALUES 
('fondo_mex', 'Fondo de Perfil: México', 'Personaliza tu perfil con los colores de la selección mexicana.', 500),
('boost_doble', 'Potenciador: Doble Puntos', 'Duplica los puntos que ganes en tu próxima predicción acertada.', 1000),
('insignia_bota', 'Insignia: Bota de Oro', 'Muestra esta insignia dorada junto a tu nombre en el chat.', 750),
('sonido_gol', 'Sonido de Notificación: "¡GOL!"', 'Cambia el sonido de tus notificaciones por un grito de gol.', 300);

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
