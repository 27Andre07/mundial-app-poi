// =============================================
// SISTEMA DE PREDICCIONES DE TORNEO
// Mundial App - POI 2025
// =============================================

let currentPredictionJornada = 1;
let currentLeaderboardJornada = 1;
let userPredictions = {};

// Definición de jornadas
const JORNADAS = [
    { id: 1, name: 'Jornada 1 - Fase de Grupos', phase: 'groups', matchday: 1 },
    { id: 2, name: 'Jornada 2 - Fase de Grupos', phase: 'groups', matchday: 2 },
    { id: 3, name: 'Jornada 3 - Fase de Grupos', phase: 'groups', matchday: 3 },
    { id: 4, name: 'Octavos de Final', phase: 'knockout', round: 'r16' },
    { id: 5, name: 'Cuartos de Final', phase: 'knockout', round: 'quarters' },
    { id: 6, name: 'Semifinales', phase: 'knockout', round: 'semis' },
    { id: 7, name: 'Final', phase: 'knockout', round: 'final' }
];

// Cambiar jornada de predicción
function changePredictionJornada(delta) {
    const newJornada = currentPredictionJornada + delta;
    if (newJornada < 1 || newJornada > JORNADAS.length) return;
    
    currentPredictionJornada = newJornada;
    loadPredictions();
}

// Cambiar jornada de leaderboard
function changeLeaderboardJornada(delta) {
    const newJornada = currentLeaderboardJornada + delta;
    if (newJornada < 1 || newJornada > JORNADAS.length) return;
    
    currentLeaderboardJornada = newJornada;
    loadLeaderboard();
}

// Cargar predicciones de la jornada actual
async function loadPredictions() {
    const jornada = JORNADAS[currentPredictionJornada - 1];
    
    // Actualizar nombre de jornada
    document.getElementById('current-jornada-name').textContent = jornada.name;
    
    try {
        // Obtener partidos de la jornada
        const response = await fetch(`https://mundialpoi-app.ngrok.app/api/predictions.php?action=get_matches&jornada=${currentPredictionJornada}`, {
            credentials: 'include'
        });
        
        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Respuesta no es JSON:', text);
            throw new Error('La respuesta del servidor no es JSON válido. Revisa que hayas ejecutado sql/install_predictions.bat');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderPredictions(data.matches, data.user_predictions || {});
        } else {
            document.getElementById('predictions-container').innerHTML = `
                <p style="text-align: center; color: var(--text-muted); padding: 40px;">
                    ${data.error || 'No hay partidos disponibles para esta jornada'}
                </p>
            `;
        }
    } catch (error) {
        console.error('Error cargando predicciones:', error);
        document.getElementById('predictions-container').innerHTML = `
            <p style="text-align: center; color: #ed4245; padding: 40px;">
                ⚠️ Error: ${error.message || 'Error al cargar predicciones'}<br><br>
                <small>Ejecuta: <code>sql/install_predictions.bat</code></small>
            </p>
        `;
    }
}

// Renderizar formulario de predicciones
function renderPredictions(matches, existingPredictions) {
    const container = document.getElementById('predictions-container');
    
    if (!matches || matches.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: var(--text-muted); padding: 40px;">
                No hay partidos para predecir en esta jornada
            </p>
        `;
        return;
    }
    
    // Verificar si las predicciones están cerradas
    const jornada = JORNADAS[currentPredictionJornada - 1];
    const isClosed = checkIfJornadaClosed(jornada);
    
    let html = '';
    
    if (isClosed) {
        html += `
            <div class="prediction-warning" style="background: rgba(237, 66, 69, 0.1); border-left: 3px solid #ed4245; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                🔒 Las predicciones para esta jornada están cerradas
            </div>
        `;
    }
    
    html += '<div class="predictions-grid">';
    
    matches.forEach(match => {
        const prediction = existingPredictions[match.id] || null;
        const isLocked = isClosed || match.status === 'finished';
        
        html += `
            <div class="prediction-match-card ${isLocked ? 'locked' : ''}">
                <div class="match-info">
                    <div class="match-date">${formatMatchDate(match.date)}</div>
                    <div class="match-teams">
                        <div class="team team-home">
                            <span class="team-flag">${getCountryFlag(match.home_team)}</span>
                            <span class="team-name">${match.home_team}</span>
                        </div>
                        <span class="vs">VS</span>
                        <div class="team team-away">
                            <span class="team-name">${match.away_team}</span>
                            <span class="team-flag">${getCountryFlag(match.away_team)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="prediction-options">
                    <button class="prediction-btn ${prediction === 'home' ? 'selected' : ''}" 
                            onclick="selectPrediction(${match.id}, 'home')"
                            ${isLocked ? 'disabled' : ''}>
                        Gana ${match.home_team}
                    </button>
                    <button class="prediction-btn ${prediction === 'draw' ? 'selected' : ''}" 
                            onclick="selectPrediction(${match.id}, 'draw')"
                            ${isLocked ? 'disabled' : ''}>
                        Empate
                    </button>
                    <button class="prediction-btn ${prediction === 'away' ? 'selected' : ''}" 
                            onclick="selectPrediction(${match.id}, 'away')"
                            ${isLocked ? 'disabled' : ''}>
                        Gana ${match.away_team}
                    </button>
                </div>
                
                ${match.status === 'finished' ? `
                    <div class="match-result">
                        Resultado: ${match.home_score} - ${match.away_score}
                        ${prediction ? (checkPredictionCorrect(prediction, match) ? 
                            '<span class="correct">✅ +25 pts</span>' : 
                            '<span class="incorrect">❌ 0 pts</span>') : ''}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Deshabilitar botón de guardar si está cerrado
    document.getElementById('submit-predictions-btn').disabled = isClosed;
}

// Seleccionar predicción
function selectPrediction(matchId, prediction) {
    userPredictions[matchId] = prediction;
    
    // Buscar la card del partido específico
    const cards = document.querySelectorAll('.prediction-match-card');
    cards.forEach(card => {
        const buttons = card.querySelectorAll('.prediction-btn');
        const cardMatchId = Array.from(buttons).find(btn => {
            const onclick = btn.getAttribute('onclick');
            return onclick && onclick.includes(`selectPrediction(${matchId},`);
        });
        
        if (cardMatchId) {
            // Remover selected de todos los botones de esta card
            buttons.forEach(btn => btn.classList.remove('selected'));
            
            // Agregar selected al botón clickeado
            buttons.forEach(btn => {
                const onclick = btn.getAttribute('onclick');
                if (onclick && onclick.includes(`'${prediction}'`)) {
                    btn.classList.add('selected');
                }
            });
        }
    });
}

// Guardar todas las predicciones
async function submitPredictions() {
    if (Object.keys(userPredictions).length === 0) {
        showNotification('Selecciona al menos una predicción', 'error');
        return;
    }
    
    try {
        const response = await fetch('https://mundialpoi-app.ngrok.app/api/predictions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'save_predictions',
                jornada: currentPredictionJornada,
                predictions: userPredictions
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Predicciones guardadas exitosamente', 'success');
            userPredictions = {};
            loadPredictions();
        } else {
            showNotification(data.error || 'Error al guardar predicciones', 'error');
        }
    } catch (error) {
        console.error('Error guardando predicciones:', error);
        showNotification('Error al guardar predicciones', 'error');
    }
}

// Cargar leaderboard
async function loadLeaderboard() {
    const jornada = JORNADAS[currentLeaderboardJornada - 1];
    document.getElementById('current-leaderboard-jornada').textContent = jornada.name;
    
    try {
        const response = await fetch(`https://mundialpoi-app.ngrok.app/api/predictions.php?action=get_leaderboard&jornada=${currentLeaderboardJornada}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            renderLeaderboard(data.leaderboard, data.user_position);
        } else {
            document.getElementById('leaderboard-container').innerHTML = `
                <p style="text-align: center; color: var(--text-muted); padding: 40px;">
                    ${data.error || 'Aún no hay resultados para esta jornada'}
                </p>
            `;
        }
    } catch (error) {
        console.error('Error cargando leaderboard:', error);
    }
}

// Renderizar leaderboard
function renderLeaderboard(leaderboard, userPosition) {
    const container = document.getElementById('leaderboard-container');
    
    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: var(--text-muted); padding: 40px;">
                Aún no hay resultados para esta jornada
            </p>
        `;
        return;
    }
    
    let html = '<div class="leaderboard-table">';
    html += '<table>';
    html += '<thead><tr><th>Pos</th><th>Usuario</th><th>Puntos</th><th>Aciertos</th><th>Recompensa</th></tr></thead>';
    html += '<tbody>';
    
    leaderboard.forEach((entry, index) => {
        const position = index + 1;
        const isCurrentUser = entry.user_id === currentUser.id;
        const reward = getReward(position);
        const medal = position === 1 ? '🏆' : position === 2 ? '🥈' : position === 3 ? '🥉' : '';
        
        html += `
            <tr class="${isCurrentUser ? 'current-user' : ''}">
                <td>${medal} ${position}</td>
                <td>${entry.username}</td>
                <td>${entry.points} pts</td>
                <td>${entry.correct_predictions || 0}</td>
                <td>${reward.points} PR ${reward.badge ? reward.badge : ''}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    
    if (userPosition && userPosition > 10) {
        html += `
            <div class="user-position" style="margin-top: 20px; padding: 15px; background: rgba(88, 101, 242, 0.1); border-radius: 8px; text-align: center;">
                Tu posición: #${userPosition} - 10 PR
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Calcular recompensa según posición
function getReward(position) {
    if (position === 1) return { points: 500, badge: '👑' };
    if (position === 2) return { points: 300, badge: '' };
    if (position === 3) return { points: 150, badge: '' };
    if (position <= 10) return { points: 50, badge: '' };
    return { points: 10, badge: '' };
}

// Verificar si jornada está cerrada
function checkIfJornadaClosed(jornada) {
    // Por ahora, simple check - mejorar con fecha real de inicio
    return false;
}

// Verificar si predicción es correcta
function checkPredictionCorrect(prediction, match) {
    if (match.home_score > match.away_score) {
        return prediction === 'home';
    } else if (match.away_score > match.home_score) {
        return prediction === 'away';
    } else {
        return prediction === 'draw';
    }
}

// Formatear fecha de partido
function formatMatchDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Obtener bandera del país (emoji)
function getCountryFlag(country) {
    const flags = {
        'México': '🇲🇽', 'Brasil': '🇧🇷', 'Argentina': '🇦🇷', 'España': '🇪🇸',
        'Alemania': '🇩🇪', 'Francia': '🇫🇷', 'Inglaterra': '🏴󐁧󐁢󐁥󐁮󐁧󐁿', 'Italia': '🇮🇹',
        'Portugal': '🇵🇹', 'Países Bajos': '🇳🇱', 'Bélgica': '🇧🇪', 'Uruguay': '🇺🇾',
        'Colombia': '🇨🇴', 'Japón': '🇯🇵', 'Corea del Sur': '🇰🇷', 'Estados Unidos': '🇺🇸'
    };
    return flags[country] || '🏴';
}

// Inicializar cuando se muestra la pestaña
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#predictions') {
        loadPredictions();
    }
});

console.log('📊 Módulo de predicciones cargado');
