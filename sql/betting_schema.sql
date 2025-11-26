-- =============================================
-- MUNDIAL APP - SISTEMA DE APUESTAS AL CAMPEÓN
-- =============================================

USE POI;

-- Tabla para almacenar la apuesta del usuario
DROP TABLE IF EXISTS tournament_bet;
CREATE TABLE tournament_bet (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    team_id INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    points_bet INT NOT NULL,
    status ENUM('pending', 'won', 'lost') DEFAULT 'pending',
    points_won INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_bet (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para almacenar el ganador del torneo
DROP TABLE IF EXISTS tournament_winner;
CREATE TABLE tournament_winner (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    declared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar columna de puntos de torneo
ALTER TABLE users ADD COLUMN tournament_points INT DEFAULT 1000;