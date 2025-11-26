# Sistema de Apuestas de Torneo

## 📋 Descripción

Sistema de apuestas donde los usuarios pueden apostar puntos de torneo por equipos. Al finalizar la eliminación directa del torneo, se resuelven las apuestas y se calculan los puntos ganados o perdidos.

## 🎯 Características

- **Puntos de Torneo**: Cada usuario tiene puntos de torneo (inicial: 1000 puntos)
- **Apuestas por Equipo**: Selecciona un equipo de los 48 del Mundial 2026
- **Historial de Apuestas**: Visualiza todas tus apuestas (pendientes, ganadas, perdidas)
- **Resolución Automática**: Al terminar el torneo, se calculan los puntos ganados/perdidos

## 📦 Instalación

### 1. Base de Datos

Ejecuta el archivo de instalación:

```bash
sql/install_tournament_bets.bat
```

O manualmente con MySQL:

```bash
mysql -u root -proot -e "SOURCE C:/xampp/htdocs/mundial-app-poi/sql/tournament_bets_schema.sql"
```

### 2. Archivos Creados

- **SQL**: `sql/tournament_bets_schema.sql` - Schema de la base de datos
- **API**: `api/tournament_bets.php` - Endpoints para apuestas
- **HTML**: Modificado `app.html` - Interfaz de apuestas
- **JS**: Modificado `js/tournament.js` - Lógica del sistema
- **CSS**: Modificado `css/app.css` - Estilos del sistema

## 🔧 Uso

### Para Usuarios

1. Inicia sesión en la aplicación
2. Haz clic en el ícono del trofeo 🏆 (Torneo)
3. Ve a la pestaña "Predicciones"
4. En la esquina superior derecha verás tus puntos de torneo
5. Selecciona un equipo del dropdown
6. Ingresa la cantidad de puntos que quieres apostar
7. Haz clic en "Realizar Apuesta"
8. Tus apuestas aparecerán en el historial debajo del formulario

### Endpoints de API

#### `GET api/tournament_bets.php?action=get_data`
Obtiene puntos del usuario, equipos disponibles y apuestas

**Respuesta:**
```json
{
  "success": true,
  "tournament_points": 1000,
  "teams": [...],
  "bets": [...]
}
```

#### `POST api/tournament_bets.php?action=place_bet`
Crea una nueva apuesta

**Body:**
```json
{
  "team_id": 1,
  "points_bet": 100
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Apuesta realizada correctamente",
  "tournament_points": 900
}
```

#### `POST api/tournament_bets.php?action=resolve_bet`
Resuelve una apuesta (ganada/perdida)

**Body:**
```json
{
  "bet_id": 1,
  "result": "won",
  "multiplier": 2.0
}
```

## 🗄️ Estructura de Base de Datos

### Tabla: `tournament_bets`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | ID único de la apuesta |
| user_id | INT | ID del usuario |
| team_id | INT | ID del equipo apostado |
| team_name | VARCHAR(100) | Nombre del equipo |
| points_bet | INT | Puntos apostados |
| multiplier | DECIMAL(3,2) | Multiplicador (default: 1.00) |
| points_result | INT | Puntos ganados/perdidos (NULL si pendiente) |
| status | ENUM | 'pending', 'won', 'lost' |
| created_at | TIMESTAMP | Fecha de creación |
| resolved_at | TIMESTAMP | Fecha de resolución |

### Columna agregada a `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| tournament_points | INT | Puntos de torneo del usuario (default: 1000) |

## 🎨 Interfaz

### Puntos de Torneo
- Ubicados en la esquina superior derecha del header del torneo
- Muestra la cantidad actual de puntos
- Se actualiza automáticamente al apostar

### Formulario de Apuesta
- Select con todos los equipos del Mundial 2026 (48 equipos)
- Input numérico para ingresar puntos
- Validaciones:
  - Debe seleccionar un equipo
  - Debe ingresar puntos válidos (> 0)
  - No puede apostar más puntos de los que tiene

### Historial de Apuestas
- Grid responsivo de cards
- Cada card muestra:
  - Equipo apostado (con bandera)
  - Estado (Pendiente/Ganada/Perdida)
  - Puntos apostados
  - Resultado (puntos ganados/perdidos)
  - Fecha de la apuesta
- Colores diferenciados por estado:
  - Verde: Apuesta ganada
  - Rojo: Apuesta perdida
  - Naranja: Apuesta pendiente

## 🔒 Seguridad

- Validación de sesión en el backend
- Verificación de puntos disponibles antes de apostar
- Prevención de apuestas duplicadas
- Transacciones seguras en la base de datos

## 📱 Responsive

- Diseño adaptable a diferentes tamaños de pantalla
- Grid de apuestas que se ajusta automáticamente
- Formulario centrado y legible en móvil

## 🚀 Próximas Mejoras

- [ ] Notificaciones push cuando se resuelva una apuesta
- [ ] Estadísticas de apuestas (% de aciertos, total ganado/perdido)
- [ ] Rankings de mejores apostadores
- [ ] Multiplicadores dinámicos según popularidad del equipo
- [ ] Límite de apuestas por usuario
- [ ] Historial de transacciones de puntos

## 🐛 Troubleshooting

### No se muestran los equipos
- Verifica que la tabla `teams` esté poblada
- Revisa que el script `sql/teams_schema.sql` se haya ejecutado

### Los puntos no se actualizan
- Verifica que la columna `tournament_points` exista en la tabla `users`
- Revisa la consola del navegador para errores de JavaScript

### Error al realizar apuesta
- Verifica que el usuario esté autenticado
- Revisa que tenga suficientes puntos
- Comprueba la conexión con la API

## 📄 Licencia

Este sistema es parte de la aplicación MundialApp 2026.
