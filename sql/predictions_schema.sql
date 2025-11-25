-- =============================================
-- SISTEMA DE PREDICCIONES Y TORNEO
-- Mundial App - POI 2025
-- =============================================

-- Tabla de jornadas
CREATE TABLE IF NOT EXISTS jornadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phase ENUM('groups', 'knockout') NOT NULL,
    matchday INT DEFAULT NULL,
    round VARCHAR(20) DEFAULT NULL,
    start_date DATETIME DEFAULT NULL,
    end_date DATETIME DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    is_closed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de partidos
CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jornada_id INT NOT NULL,
    home_team VARCHAR(50) NOT NULL,
    away_team VARCHAR(50) NOT NULL,
    home_score INT DEFAULT NULL,
    away_score INT DEFAULT NULL,
    date DATETIME NOT NULL,
    status ENUM('pending', 'live', 'finished') DEFAULT 'pending',
    group_name VARCHAR(10) DEFAULT NULL,
    knockout_round VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de predicciones
CREATE TABLE IF NOT EXISTS predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    match_id INT NOT NULL,
    jornada_id INT NOT NULL,
    prediction ENUM('home', 'draw', 'away') NOT NULL,
    is_correct TINYINT(1) DEFAULT NULL,
    points_earned INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_match (user_id, match_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- DATOS INICIALES: JORNADAS
-- =============================================

INSERT INTO jornadas (id, name, phase, matchday, round) VALUES
(1, 'Jornada 1 - Fase de Grupos', 'groups', 1, NULL),
(2, 'Jornada 2 - Fase de Grupos', 'groups', 2, NULL),
(3, 'Jornada 3 - Fase de Grupos', 'groups', 3, NULL),
(4, 'Octavos de Final', 'knockout', NULL, 'r16'),
(5, 'Cuartos de Final', 'knockout', NULL, 'quarters'),
(6, 'Semifinales', 'knockout', NULL, 'semis'),
(7, 'Final', 'knockout', NULL, 'final');

-- =============================================
-- PARTIDOS DE EJEMPLO: JORNADA 1
-- =============================================

INSERT INTO matches (jornada_id, home_team, away_team, date, group_name) VALUES
-- Grupo A
(1, 'México', 'Uruguay', '2026-06-11 11:00:00', 'A'),
(1, 'Estados Unidos', 'Jamaica', '2026-06-11 14:00:00', 'A'),

-- Grupo B
(1, 'Argentina', 'Canadá', '2026-06-11 17:00:00', 'B'),
(1, 'Brasil', 'Costa Rica', '2026-06-11 20:00:00', 'B'),

-- Grupo C
(1, 'España', 'Marruecos', '2026-06-12 11:00:00', 'C'),
(1, 'Alemania', 'Japón', '2026-06-12 14:00:00', 'C'),

-- Grupo D
(1, 'Francia', 'Australia', '2026-06-12 17:00:00', 'D'),
(1, 'Inglaterra', 'Nigeria', '2026-06-12 20:00:00', 'D'),

-- Grupo E
(1, 'Portugal', 'Ghana', '2026-06-13 11:00:00', 'E'),
(1, 'Italia', 'Ecuador', '2026-06-13 14:00:00', 'E'),

-- Grupo F
(1, 'Países Bajos', 'Senegal', '2026-06-13 17:00:00', 'F'),
(1, 'Bélgica', 'Egipto', '2026-06-13 20:00:00', 'F');

-- =============================================
-- PARTIDOS DE EJEMPLO: JORNADA 2
-- =============================================

INSERT INTO matches (jornada_id, home_team, away_team, date, group_name) VALUES
-- Grupo A
(2, 'Uruguay', 'Jamaica', '2026-06-16 11:00:00', 'A'),
(2, 'México', 'Estados Unidos', '2026-06-16 17:00:00', 'A'),

-- Grupo B
(2, 'Brasil', 'Canadá', '2026-06-16 14:00:00', 'B'),
(2, 'Argentina', 'Costa Rica', '2026-06-16 20:00:00', 'B'),

-- Grupo C
(2, 'España', 'Japón', '2026-06-17 11:00:00', 'C'),
(2, 'Alemania', 'Marruecos', '2026-06-17 14:00:00', 'C'),

-- Grupo D
(2, 'Francia', 'Nigeria', '2026-06-17 17:00:00', 'D'),
(2, 'Inglaterra', 'Australia', '2026-06-17 20:00:00', 'D'),

-- Grupo E
(2, 'Portugal', 'Ecuador', '2026-06-18 11:00:00', 'E'),
(2, 'Italia', 'Ghana', '2026-06-18 14:00:00', 'E'),

-- Grupo F
(2, 'Países Bajos', 'Egipto', '2026-06-18 17:00:00', 'F'),
(2, 'Bélgica', 'Senegal', '2026-06-18 20:00:00', 'F');

-- =============================================
-- PARTIDOS DE EJEMPLO: JORNADA 3
-- =============================================

INSERT INTO matches (jornada_id, home_team, away_team, date, group_name) VALUES
-- Grupo A
(3, 'Jamaica', 'México', '2026-06-21 15:00:00', 'A'),
(3, 'Uruguay', 'Estados Unidos', '2026-06-21 15:00:00', 'A'),

-- Grupo B
(3, 'Costa Rica', 'Brasil', '2026-06-21 19:00:00', 'B'),
(3, 'Canadá', 'Argentina', '2026-06-21 19:00:00', 'B'),

-- Grupo C
(3, 'Japón', 'Alemania', '2026-06-22 15:00:00', 'C'),
(3, 'Marruecos', 'España', '2026-06-22 15:00:00', 'C'),

-- Grupo D
(3, 'Australia', 'Francia', '2026-06-22 19:00:00', 'D'),
(3, 'Nigeria', 'Inglaterra', '2026-06-22 19:00:00', 'D'),

-- Grupo E
(3, 'Ghana', 'Portugal', '2026-06-23 15:00:00', 'E'),
(3, 'Ecuador', 'Italia', '2026-06-23 15:00:00', 'E'),

-- Grupo F
(3, 'Senegal', 'Países Bajos', '2026-06-23 19:00:00', 'F'),
(3, 'Egipto', 'Bélgica', '2026-06-23 19:00:00', 'F');

-- =============================================
-- PARTIDOS DE EJEMPLO: OCTAVOS
-- =============================================

INSERT INTO matches (jornada_id, home_team, away_team, date, knockout_round) VALUES
(4, '1A', '2B', '2026-06-27 11:00:00', 'r16'),
(4, '1C', '2D', '2026-06-27 15:00:00', 'r16'),
(4, '1E', '2F', '2026-06-27 19:00:00', 'r16'),
(4, '1B', '2A', '2026-06-28 11:00:00', 'r16'),
(4, '1D', '2C', '2026-06-28 15:00:00', 'r16'),
(4, '1F', '2E', '2026-06-28 19:00:00', 'r16'),
(4, '1G', '2H', '2026-06-29 11:00:00', 'r16'),
(4, '1H', '2G', '2026-06-29 15:00:00', 'r16');

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

CREATE INDEX idx_matches_jornada ON matches(jornada_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_jornada ON predictions(jornada_id);
CREATE INDEX idx_predictions_correct ON predictions(is_correct);

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
