-- =============================================
-- SISTEMA DE APUESTAS DE TORNEO
-- Mundial App - POI 2025
-- =============================================

USE POI;

-- =============================================
-- Agregar columna de puntos de torneo a usuarios
-- =============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tournament_points INT DEFAULT 1000 AFTER points;

-- =============================================
-- TABLA: tournament_bets
-- Apuestas de equipos para el torneo
-- =============================================
CREATE TABLE IF NOT EXISTS tournament_bets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    team_id INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    points_bet INT NOT NULL,
    multiplier DECIMAL(3,2) DEFAULT 1.00,
    points_result INT DEFAULT NULL,
    status ENUM('pending', 'won', 'lost') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_user_bets (user_id),
    INDEX idx_status (status),
    INDEX idx_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Actualizar puntos de torneo iniciales
-- =============================================
UPDATE users SET tournament_points = 1000 WHERE tournament_points IS NULL OR tournament_points = 0;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
