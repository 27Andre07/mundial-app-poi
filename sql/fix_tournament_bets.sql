-- =============================================
-- FIX: Agregar columnas faltantes a tournament_bets
-- =============================================

USE POI;

-- Agregar columna multiplier si no existe
ALTER TABLE tournament_bets 
ADD COLUMN IF NOT EXISTS multiplier DECIMAL(3,2) DEFAULT 1.00 AFTER points_bet;

-- Agregar columna points_result si no existe
ALTER TABLE tournament_bets 
ADD COLUMN IF NOT EXISTS points_result INT DEFAULT NULL AFTER multiplier;

-- Agregar columna resolved_at si no existe
ALTER TABLE tournament_bets 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL AFTER created_at;

-- Verificar estructura
DESCRIBE tournament_bets;
