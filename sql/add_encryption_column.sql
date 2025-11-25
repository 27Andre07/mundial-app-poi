-- =============================================
-- AGREGAR SOPORTE PARA ENCRIPTACIÓN EN DMs
-- Mundial App - POI 2025
-- =============================================

USE POI;

-- Agregar columna is_encrypted a la tabla direct_messages
ALTER TABLE direct_messages 
ADD COLUMN is_encrypted TINYINT(1) DEFAULT 0 AFTER is_read;

-- Verificar cambios
DESCRIBE direct_messages;
