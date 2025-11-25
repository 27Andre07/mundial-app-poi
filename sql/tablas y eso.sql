create database POI;

USE POI;
select *from users;
ALTER TABLE messages DROP COLUMN file_url;
ALTER TABLE messages ADD COLUMN file_data LONGBLOB;
-- Tabla de usuarios
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE
);

-- Tabla de grupos
CREATE TABLE groups_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de miembros de grupos
CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_member (group_id, user_id)
);

-- Tabla de canales
CREATE TABLE channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    group_id INT NOT NULL,
    type ENUM('text', 'tasks') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE
);

-- Tabla de mensajes
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
    INDEX idx_channel_created (channel_id, created_at)
);

-- Tabla de tareas
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
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de recompensas
CREATE TABLE rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    points INT DEFAULT 0,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de predicciones del torneo
CREATE TABLE predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    match_id VARCHAR(50) NOT NULL,
    team1_score INT NOT NULL,
    team2_score INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_prediction (user_id, match_id)
);

-- Tabla de compras en la tienda
CREATE TABLE purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de solicitudes de contacto (mensajes directos)
CREATE TABLE contact_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_contact_request (sender_id, receiver_id)
);

-- Tabla de mensajes directos
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
    INDEX idx_created (created_at)
);

-- Insertar un usuario de prueba (contraseña: 123456)
INSERT INTO users (username, email, password) 
VALUES ('Admin', 'admin@mundialapp.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Tabla de compras de la tienda
CREATE TABLE shop_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_purchases (user_id)
);

-- Tabla de items de la tienda (catálogo)
CREATE TABLE shop_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    price INT NOT NULL
);

-- Insertar items de la tienda
INSERT INTO shop_items (item_id, item_name, description, price) VALUES 
('fondo_mex', 'Fondo de Perfil: México', 'Personaliza tu perfil con los colores de la selección mexicana.', 500),
('boost_doble', 'Potenciador: Doble Puntos', 'Duplica los puntos que ganes en tu próxima predicción acertada.', 1000),
('insignia_bota', 'Insignia: Bota de Oro', 'Muestra esta insignia dorada junto a tu nombre en el chat.', 750),
('sonido_gol', 'Sonido de Notificación: "¡GOL!"', 'Cambia el sonido de tus notificaciones por un grito de gol.', 300);




-- Tabla de participantes de videollamadas   (no se si jala yo no tengo estas tablas ahorita)
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

-- Tabla de señales de videollamadas
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

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_tasks_group ON tasks(group_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);