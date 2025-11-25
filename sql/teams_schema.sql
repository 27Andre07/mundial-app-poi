-- =============================================
-- MUNDIAL APP - TABLA DE SELECCIONES
-- Fecha: 25 de Noviembre, 2025
-- =============================================

USE POI;

-- =============================================
-- TABLA: teams
-- Selecciones participantes en el Mundial 2026 (48 equipos)
-- =============================================
DROP TABLE IF EXISTS teams;

CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL,
    flag_emoji VARCHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- DATOS: 48 selecciones del Mundial 2026
-- =============================================

INSERT INTO teams (name, code, flag_emoji) VALUES
('México', 'mx', '🇲🇽'),
('Uruguay', 'uy', '🇺🇾'),
('Estados Unidos', 'us', '🇺🇸'),
('Jamaica', 'jm', '🇯🇲'),
('Argentina', 'ar', '🇦🇷'),
('Brasil', 'br', '🇧🇷'),
('Canadá', 'ca', '🇨🇦'),
('Costa Rica', 'cr', '🇨🇷'),
('España', 'es', '🇪🇸'),
('Alemania', 'de', '🇩🇪'),
('Marruecos', 'ma', '🇲🇦'),
('Japón', 'jp', '🇯🇵'),
('Francia', 'fr', '🇫🇷'),
('Inglaterra', 'gb-eng', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
('Australia', 'au', '🇦🇺'),
('Nigeria', 'ng', '🇳🇬'),
('Portugal', 'pt', '🇵🇹'),
('Italia', 'it', '🇮🇹'),
('Ghana', 'gh', '🇬🇭'),
('Ecuador', 'ec', '🇪🇨'),
('Países Bajos', 'nl', '🇳🇱'),
('Bélgica', 'be', '🇧🇪'),
('Senegal', 'sn', '🇸🇳'),
('Egipto', 'eg', '🇪🇬'),
('Colombia', 'co', '🇨🇴'),
('Croacia', 'hr', '🇭🇷'),
('Dinamarca', 'dk', '🇩🇰'),
('Gales', 'gb-wls', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'),
('Suiza', 'ch', '🇨🇭'),
('Polonia', 'pl', '🇵🇱'),
('Corea del Sur', 'kr', '🇰🇷'),
('Túnez', 'tn', '🇹🇳'),
('Serbia', 'rs', '🇷🇸'),
('Camerún', 'cm', '🇨🇲'),
('Irán', 'ir', '🇮🇷'),
('Honduras', 'hn', '🇭🇳'),
('Arabia Saudita', 'sa', '🇸🇦'),
('Panamá', 'pa', '🇵🇦'),
('Argelia', 'dz', '🇩🇿'),
('Perú', 'pe', '🇵🇪'),
('Suecia', 'se', '🇸🇪'),
('Catar', 'qa', '🇶🇦'),
('Mali', 'ml', '🇲🇱'),
('Chile', 'cl', '🇨🇱'),
('Ucrania', 'ua', '🇺🇦'),
('Nueva Zelanda', 'nz', '🇳🇿'),
('Costa de Marfil', 'ci', '🇨🇮'),
('Islandia', 'is', '🇮🇸');

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
