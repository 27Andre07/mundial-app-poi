// =============================================
// SISTEMA DE APUESTAS AL CAMPEÓN DEL TORNEO
// Mundial App - POI 2025
// =============================================

let currentTournamentPoints = 1000;
let currentBet = null;
let allTeams = [];
let tournamentWinner = null;

// Cargar datos al iniciar
async function loadBettingData() {
    try {
        // Usar el nuevo endpoint del sistema de apuestas
        const response = await fetch('api/tournament_bets.php?action=get_data', {
            method: 'GET',
            credentials: 'include'
        });
        
        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Respuesta no es JSON:', text.substring(0, 200));
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentTournamentPoints = data.tournament_points || 0;
            allTeams = data.teams || [];
            currentBet = data.bets && data.bets.length > 0 ? data.bets[0] : null;
            renderBettingInterface();
        } else {
            console.error('Error:', data.message);
        }
    } catch (error) {
        console.error('Error cargando datos de apuestas:', error);
    }
}

// Renderizar interfaz de apuestas
function renderBettingInterface() {
    const container = document.getElementById('predictions-container');
    
    if (!container) return;
    
    // Si ya hay ganador declarado
    if (tournamentWinner) {
        renderResultsView(container);
        return;
    }
    
    // Si ya tiene apuesta
    if (currentBet) {
        renderExistingBet(container);
    } else {
        renderBettingForm(container);
    }
}

// Mostrar formulario de apuesta
function renderBettingForm(container) {
    container.innerHTML = `
        <div class="betting-container">
            <div class="betting-header">
                <h2>🏆 Apuesta al Campeón del Mundial</h2>
                <p style="color: var(--text-muted); margin-top: 10px;">
                    Selecciona el equipo que crees que ganará el torneo y apuesta tus puntos.
                    Si aciertas, ¡ganarás 3x la cantidad apostada!
                </p>
            </div>
            
            <div class="points-display">
                <span>Tus Puntos de Torneo:</span>
                <strong id="tournament-points-display">${currentTournamentPoints} 🪙</strong>
            </div>
            
            <div class="bet-form">
                <label for="team-select">Selecciona el Equipo Ganador:</label>
                <select id="team-select" class="team-selector">
                    <option value="">-- Selecciona un equipo --</option>
                    ${allTeams.map(team => `
                        <option value="${team.id}" data-name="${team.name}">
                            ${team.flag} ${team.name}
                        </option>
                    `).join('')}
                </select>
                
                <label for="points-input">Cantidad de Puntos a Apostar:</label>
                <input 
                    type="number" 
                    id="points-input" 
                    class="points-input"
                    min="1" 
                    max="${currentTournamentPoints}"
                    placeholder="Ingresa la cantidad"
                />
                
                <div class="potential-winnings" id="potential-winnings" style="display: none;">
                    <span>Ganancia potencial:</span>
                    <strong id="potential-amount">0 🪙</strong>
                </div>
                
                <button class="btn-place-bet" onclick="placeBet()">
                    💰 Realizar Apuesta
                </button>
            </div>
        </div>
    `;
    
    // Event listeners
    document.getElementById('points-input').addEventListener('input', updatePotentialWinnings);
}

// Mostrar apuesta existente
function renderExistingBet(container) {
    const team = allTeams.find(t => t.name === currentBet.team_name);
    const teamFlag = team ? team.flag : '🏴';
    
    container.innerHTML = `
        <div class="betting-container">
            <div class="betting-header">
                <h2>🏆 Tu Apuesta al Campeón</h2>
            </div>
            
            <div class="points-display">
                <span>Puntos de Torneo Disponibles:</span>
                <strong id="tournament-points-display">${currentTournamentPoints} 🪙</strong>
            </div>
            
            <div class="current-bet-card">
                <div class="bet-team">
                    <span class="bet-flag">${teamFlag}</span>
                    <span class="bet-team-name">${currentBet.team_name}</span>
                </div>
                
                <div class="bet-details">
                    <div class="bet-detail-item">
                        <span>Puntos Apostados:</span>
                        <strong>${currentBet.points_bet} 🪙</strong>
                    </div>
                    <div class="bet-detail-item">
                        <span>Ganancia Potencial:</span>
                        <strong>${currentBet.points_bet * 3} 🪙</strong>
                    </div>
                    <div class="bet-detail-item">
                        <span>Estado:</span>
                        <strong class="bet-status-${currentBet.status}">
                            ${getBetStatusText(currentBet.status)}
                        </strong>
                    </div>
                </div>
                
                <button class="btn-change-bet" onclick="changeBet()">
                    🔄 Cambiar Apuesta
                </button>
                
                <p style="color: var(--text-muted); font-size: 13px; margin-top: 15px; text-align: center;">
                    Puedes cambiar tu apuesta las veces que quieras antes de que termine el torneo
                </p>
            </div>
        </div>
    `;
}

// Mostrar resultados finales
function renderResultsView(container) {
    const won = currentBet && currentBet.team_name === tournamentWinner;
    const team = allTeams.find(t => t.name === tournamentWinner);
    const winnerFlag = team ? team.flag : '🏆';
    
    container.innerHTML = `
        <div class="betting-container">
            <div class="betting-header">
                <h2>🏆 Torneo Finalizado</h2>
            </div>
            
            <div class="points-display">
                <span>Tus Puntos de Torneo:</span>
                <strong id="tournament-points-display">${currentTournamentPoints} 🪙</strong>
            </div>
            
            <div class="winner-announcement">
                <h3>¡El Campeón es!</h3>
                <div class="winner-display">
                    <span class="winner-flag">${winnerFlag}</span>
                    <span class="winner-name">${tournamentWinner}</span>
                </div>
            </div>
            
            ${currentBet ? `
                <div class="bet-result-card ${won ? 'won' : 'lost'}">
                    <h4>${won ? '🎉 ¡GANASTE!' : '😔 No acertaste'}</h4>
                    
                    <div class="bet-summary">
                        <p>Tu apuesta: ${currentBet.team_name}</p>
                        <p>Puntos apostados: ${currentBet.points_bet} 🪙</p>
                        ${won ? `
                            <p class="winning-amount">¡Ganaste ${currentBet.points_won} 🪙!</p>
                        ` : `
                            <p class="losing-amount">Perdiste ${currentBet.points_bet} 🪙</p>
                        `}
                    </div>
                </div>
            ` : `
                <div class="no-bet-message">
                    <p>No realizaste ninguna apuesta en este torneo</p>
                </div>
            `}
        </div>
    `;
}

// Actualizar ganancia potencial
function updatePotentialWinnings() {
    const pointsInput = document.getElementById('points-input');
    const potentialDiv = document.getElementById('potential-winnings');
    const potentialAmount = document.getElementById('potential-amount');
    
    const points = parseInt(pointsInput.value) || 0;
    
    if (points > 0 && points <= currentTournamentPoints) {
        potentialDiv.style.display = 'flex';
        potentialAmount.textContent = `${points * 3} 🪙`;
    } else {
        potentialDiv.style.display = 'none';
    }
}

// Realizar apuesta
async function placeBet() {
    const teamSelect = document.getElementById('team-select');
    const pointsInput = document.getElementById('points-input');
    
    const teamId = parseInt(teamSelect.value);
    const teamName = teamSelect.options[teamSelect.selectedIndex]?.dataset.name;
    const pointsBet = parseInt(pointsInput.value);
    
    // Validaciones
    if (!teamId || !teamName) {
        showNotification('Por favor selecciona un equipo', 'error');
        return;
    }
    
    if (!pointsBet || pointsBet <= 0) {
        showNotification('Por favor ingresa una cantidad válida', 'error');
        return;
    }
    
    if (pointsBet > currentTournamentPoints) {
        showNotification('No tienes suficientes puntos', 'error');
        return;
    }
    
    try {
        const response = await fetch('api/tournament_bets.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'place_bet',
                team_id: teamId,
                team_name: teamName,
                points_bet: pointsBet
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Apuesta realizada exitosamente', 'success');
            currentTournamentPoints = data.tournament_points;
            await loadBettingData();
        } else {
            showNotification(data.error || 'Error al realizar apuesta', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Cambiar apuesta
function changeBet() {
    renderBettingForm(document.getElementById('predictions-container'));
}

// Obtener texto de estado
function getBetStatusText(status) {
    switch (status) {
        case 'pending': return '⏳ Pendiente';
        case 'won': return '✅ Ganada';
        case 'lost': return '❌ Perdida';
        default: return status;
    }
}

// Actualizar puntos en el header
async function updateTournamentPointsDisplay() {
    try {
        const response = await fetch('api/tournament_bets.php?action=get_tournament_points', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            currentTournamentPoints = data.tournament_points;
            const display = document.getElementById('tournament-points-header');
            if (display) {
                display.textContent = `${currentTournamentPoints} 🪙`;
            }
        }
    } catch (error) {
        console.error('Error actualizando puntos:', error);
    }
}

// Inicializar cuando se muestra la pestaña de predicciones
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const target = mutation.target;
            
            if (target.id === 'tab-predictions' && target.classList.contains('active')) {
                loadBettingData();
                updateTournamentPointsDisplay();
            }
        });
    });
    
    const predictionsTab = document.getElementById('tab-predictions');
    
    if (predictionsTab) {
        observer.observe(predictionsTab, { attributes: true, attributeFilter: ['class'] });
        
        if (predictionsTab.classList.contains('active')) {
            loadBettingData();
            updateTournamentPointsDisplay();
        }
    }
});

console.log('🎰 Sistema de apuestas cargado');