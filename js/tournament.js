// ==================== SIMULADOR COPA MUNDIAL FIFA 2026 ====================

// Variables globales
window.tournamentData = {
    groups: {},
    matches: {},
    standings: {},
    qualified: [],
    knockoutStage: {}
};

// GRUPOS FIJOS DEL MUNDIAL 2026 (permanentes)
const worldCupTeams = {
    'A': [
        { name: 'México', code: 'mx', flag: '🇲🇽' },
        { name: 'Uruguay', code: 'uy', flag: '🇺🇾' },
        { name: 'Estados Unidos', code: 'us', flag: '🇺🇸' },
        { name: 'Jamaica', code: 'jm', flag: '🇯🇲' }
    ],
    'B': [
        { name: 'Argentina', code: 'ar', flag: '🇦🇷' },
        { name: 'Brasil', code: 'br', flag: '🇧🇷' },
        { name: 'Canadá', code: 'ca', flag: '🇨🇦' },
        { name: 'Costa Rica', code: 'cr', flag: '🇨🇷' }
    ],
    'C': [
        { name: 'España', code: 'es', flag: '🇪🇸' },
        { name: 'Alemania', code: 'de', flag: '🇩🇪' },
        { name: 'Marruecos', code: 'ma', flag: '🇲🇦' },
        { name: 'Japón', code: 'jp', flag: '🇯🇵' }
    ],
    'D': [
        { name: 'Francia', code: 'fr', flag: '🇫🇷' },
        { name: 'Inglaterra', code: 'gb-eng', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
        { name: 'Australia', code: 'au', flag: '🇦🇺' },
        { name: 'Nigeria', code: 'ng', flag: '🇳🇬' }
    ],
    'E': [
        { name: 'Portugal', code: 'pt', flag: '🇵🇹' },
        { name: 'Italia', code: 'it', flag: '🇮🇹' },
        { name: 'Ghana', code: 'gh', flag: '🇬🇭' },
        { name: 'Ecuador', code: 'ec', flag: '🇪🇨' }
    ],
    'F': [
        { name: 'Países Bajos', code: 'nl', flag: '🇳🇱' },
        { name: 'Bélgica', code: 'be', flag: '🇧🇪' },
        { name: 'Senegal', code: 'sn', flag: '🇸🇳' },
        { name: 'Egipto', code: 'eg', flag: '🇪🇬' }
    ]
};

// Lista de todas las 48 selecciones (para referencia, pero no se usa para generar grupos)
const allTeams = [
    { name: 'México', code: 'mx', flag: '🇲🇽' },
    { name: 'Uruguay', code: 'uy', flag: '🇺🇾' },
    { name: 'Jamaica', code: 'jm', flag: '🇯🇲' },
    { name: 'Marruecos', code: 'ma', flag: '🇲🇦' },
    { name: 'Estados Unidos', code: 'us', flag: '🇺🇸' },
    { name: 'Colombia', code: 'co', flag: '🇨🇴' },
    { name: 'Japón', code: 'jp', flag: '🇯🇵' },
    { name: 'Gales', code: 'gb-wls', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
    { name: 'Canadá', code: 'ca', flag: '🇨🇦' },
    { name: 'Ecuador', code: 'ec', flag: '🇪🇨' },
    { name: 'Corea del Sur', code: 'kr', flag: '🇰🇷' },
    { name: 'Senegal', code: 'sn', flag: '🇸🇳' },
    { name: 'Argentina', code: 'ar', flag: '🇦🇷' },
    { name: 'Países Bajos', code: 'nl', flag: '🇳🇱' },
    { name: 'Australia', code: 'au', flag: '🇦🇺' },
    { name: 'Túnez', code: 'tn', flag: '🇹🇳' },
    { name: 'Brasil', code: 'br', flag: '🇧🇷' },
    { name: 'Suiza', code: 'ch', flag: '🇨🇭' },
    { name: 'Serbia', code: 'rs', flag: '🇷🇸' },
    { name: 'Camerún', code: 'cm', flag: '🇨🇲' },
    { name: 'Alemania', code: 'de', flag: '🇩🇪' },
    { name: 'Croacia', code: 'hr', flag: '🇭🇷' },
    { name: 'Nigeria', code: 'ng', flag: '🇳🇬' },
    { name: 'España', code: 'es', flag: '🇪🇸' },
    { name: 'Polonia', code: 'pl', flag: '🇵🇱' },
    { name: 'Costa Rica', code: 'cr', flag: '🇨🇷' },
    { name: 'Ghana', code: 'gh', flag: '🇬🇭' },
    { name: 'Inglaterra', code: 'gb-eng', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { name: 'Dinamarca', code: 'dk', flag: '🇩🇰' },
    { name: 'Irán', code: 'ir', flag: '🇮🇷' },
    { name: 'Egipto', code: 'eg', flag: '🇪🇬' },
    { name: 'Francia', code: 'fr', flag: '🇫🇷' },
    { name: 'Portugal', code: 'pt', flag: '🇵🇹' },
    { name: 'Honduras', code: 'hn', flag: '🇭🇳' },
    { name: 'Arabia Saudita', code: 'sa', flag: '🇸🇦' },
    { name: 'Italia', code: 'it', flag: '🇮🇹' },
    { name: 'Bélgica', code: 'be', flag: '🇧🇪' },
    { name: 'Panamá', code: 'pa', flag: '🇵🇦' },
    { name: 'Argelia', code: 'dz', flag: '🇩🇿' },
    { name: 'Perú', code: 'pe', flag: '🇵🇪' },
    { name: 'Suecia', code: 'se', flag: '🇸🇪' },
    { name: 'Catar', code: 'qa', flag: '🇶🇦' },
    { name: 'Mali', code: 'ml', flag: '🇲🇱' },
    { name: 'Chile', code: 'cl', flag: '🇨🇱' },
    { name: 'Ucrania', code: 'ua', flag: '🇺🇦' },
    { name: 'Nueva Zelanda', code: 'nz', flag: '🇳🇿' },
    { name: 'Costa de Marfil', code: 'ci', flag: '🇨🇮' },
    { name: 'Islandia', code: 'is', flag: '🇮🇸' }
];

// Variable global para grupos aleatorios
// Inicializar torneo (usa grupos fijos, no genera aleatorios)
window.initTournament = function() {
    console.log('Inicializando torneo con grupos fijos...');
    
    // Generar partidos usando los grupos fijos
    generateGroupMatches();
    console.log('Partidos generados:', window.tournamentData.matches);
    renderGroups();
    console.log('Grupos renderizados');
}

// Generar partidos de fase de grupos
function generateGroupMatches() {
    console.log('Generando partidos...');
    const allMatches = [];
    
    Object.keys(worldCupTeams).forEach(groupName => {
        const teams = worldCupTeams[groupName];
        const matches = [];
        
        // Generar todos los partidos del grupo (cada equipo juega contra los otros 3)
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const match = {
                    team1: teams[i],
                    team2: teams[j],
                    score1: null,
                    score2: null,
                    played: false
                };
                matches.push(match);
                
                // Agregar a lista para sincronizar con BD
                allMatches.push({
                    home: teams[i].name,
                    away: teams[j].name,
                    group: groupName
                });
            }
        }
        
        window.tournamentData.matches[groupName] = matches;
        
        // Inicializar tabla del grupo
        window.tournamentData.standings[groupName] = teams.map(team => ({
            ...team,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        }));
    });
    
    // Sincronizar partidos con BD
    syncMatchesToDB(allMatches);
}

// Renderizar grupos
function renderGroups() {
    const container = document.getElementById('groups-container');
    console.log('Contenedor encontrado:', container);
    if (!container) {
        console.error('No se encontró el contenedor groups-container');
        return;
    }
    
    container.innerHTML = '';
    console.log('Renderizando grupos...');
    
    Object.keys(worldCupTeams).forEach(groupName => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-card';
        
        let matchesHTML = '';
        window.tournamentData.matches[groupName].forEach((match, idx) => {
            matchesHTML += `
                <div class="match-item ${match.played ? 'played' : ''}">
                    <div class="match-teams">
                        <span class="team-flag">${match.team1.flag}</span>
                        <span class="team-name">${match.team1.name}</span>
                        <div class="match-score">
                            ${match.played ? 
                                `<span class="score">${match.score1} - ${match.score2}</span>` :
                                `<button class="simulate-btn" onclick="simulateMatch('${groupName}', ${idx})">⚽ Simular</button>`
                            }
                        </div>
                        <span class="team-name">${match.team2.name}</span>
                        <span class="team-flag">${match.team2.flag}</span>
                    </div>
                </div>
            `;
        });
        
        groupDiv.innerHTML = `
            <h3>Grupo ${groupName}</h3>
            <div class="group-matches">
                ${matchesHTML}
            </div>
            <div class="group-standings">
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Equipo</th>
                            <th>PJ</th>
                            <th>G</th>
                            <th>E</th>
                            <th>P</th>
                            <th>GF</th>
                            <th>GC</th>
                            <th>DG</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody id="standings-${groupName}">
                        ${renderGroupStandings(groupName)}
                    </tbody>
                </table>
            </div>
        `;
        
        container.appendChild(groupDiv);
    });
}

// Renderizar tabla de posiciones de un grupo
function renderGroupStandings(groupName) {
    const standings = [...window.tournamentData.standings[groupName]].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
    
    return standings.map((team, idx) => `
        <tr class="${idx < 2 ? 'qualified' : idx === 2 ? 'third-place' : ''}">
            <td>${idx + 1}</td>
            <td>${team.flag} ${team.name}</td>
            <td>${team.played}</td>
            <td>${team.won}</td>
            <td>${team.drawn}</td>
            <td>${team.lost}</td>
            <td>${team.goalsFor}</td>
            <td>${team.goalsAgainst}</td>
            <td>${team.goalDifference}</td>
            <td><strong>${team.points}</strong></td>
        </tr>
    `).join('');
}

// Simular partido
window.simulateMatch = function(groupName, matchIdx) {
    const match = window.window.tournamentData.matches[groupName][matchIdx];
    
    if (match.played) return;
    
    // Generar marcador aleatorio (0-5 goles por equipo)
    match.score1 = Math.floor(Math.random() * 6);
    match.score2 = Math.floor(Math.random() * 6);
    match.played = true;
    
    // Actualizar tabla de posiciones
    updateStandings(groupName, match);
    
    // Renderizar de nuevo
    renderGroups();
    
    // Verificar si todos los partidos del grupo terminaron
    checkGroupComplete(groupName);
}

// Actualizar tabla de posiciones
function updateStandings(groupName, match) {
    const standings = window.tournamentData.standings[groupName];
    
    const team1 = standings.find(t => t.name === match.team1.name);
    const team2 = standings.find(t => t.name === match.team2.name);
    
    team1.played++;
    team2.played++;
    team1.goalsFor += match.score1;
    team1.goalsAgainst += match.score2;
    team2.goalsFor += match.score2;
    team2.goalsAgainst += match.score1;
    
    team1.goalDifference = team1.goalsFor - team1.goalsAgainst;
    team2.goalDifference = team2.goalsFor - team2.goalsAgainst;
    
    if (match.score1 > match.score2) {
        team1.won++;
        team1.points += 3;
        team2.lost++;
    } else if (match.score1 < match.score2) {
        team2.won++;
        team2.points += 3;
        team1.lost++;
    } else {
        team1.drawn++;
        team2.drawn++;
        team1.points++;
        team2.points++;
    }
}

// Verificar si el grupo está completo
function checkGroupComplete(groupName) {
    const allPlayed = window.tournamentData.matches[groupName].every(m => m.played);
    
    if (allPlayed) {
        showNotification(`¡Grupo ${groupName} completado!`, 'success');
        
        // Verificar si todos los grupos terminaron
        const allGroupsComplete = Object.keys(window.tournamentData.matches).every(g => 
            window.tournamentData.matches[g].every(m => m.played)
        );
        
        if (allGroupsComplete) {
            calculateQualified();
        }
    }
}

// Calcular equipos clasificados
function calculateQualified() {
    const qualified = [];
    const thirdPlaceTeams = [];
    
    // Obtener primeros y segundos de cada grupo
    Object.keys(window.tournamentData.standings).forEach(groupName => {
        const standings = [...window.tournamentData.standings[groupName]].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
        
        qualified.push({ ...standings[0], group: groupName, position: 1 });
        qualified.push({ ...standings[1], group: groupName, position: 2 });
        thirdPlaceTeams.push({ ...standings[2], group: groupName, position: 3 });
    });
    
    // Ordenar terceros lugares y seleccionar los 8 mejores
    thirdPlaceTeams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
    
    const bestThirds = thirdPlaceTeams.slice(0, 8);
    bestThirds.forEach(team => qualified.push({ ...team }));
    
    window.tournamentData.qualified = qualified;
    
    showNotification('¡Fase de grupos completada! 32 equipos clasificados a octavos', 'success');
    updateQualifiedDisplay();
    
    // Generar llaves de eliminación directa
    generateKnockoutBracket();
}

// Mostrar equipos clasificados
function updateQualifiedDisplay() {
    const container = document.getElementById('qualified-teams');
    if (!container) return;
    
    // Agrupar por tipo de clasificación
    const firstPlace = window.tournamentData.qualified.filter(t => t.position === 1);
    const secondPlace = window.tournamentData.qualified.filter(t => t.position === 2);
    const thirdPlace = window.tournamentData.qualified.filter(t => t.position === 3);
    
    container.innerHTML = `
        <div class="qualified-section">
            <h4 class="qualified-title">🥇 Primeros de Grupo (12 equipos)</h4>
            <div class="qualified-by-group">
                ${firstPlace.map(team => `
                    <div class="qualified-team first-place">
                        <span class="team-flag">${team.flag}</span>
                        <div class="team-info">
                            <span class="team-name">${team.name}</span>
                            <span class="team-group">Grupo ${team.group} - ${team.points} pts (${team.won}G ${team.drawn}E ${team.lost}P) - DG: ${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="qualified-section">
            <h4 class="qualified-title">🥈 Segundos de Grupo (12 equipos)</h4>
            <div class="qualified-by-group">
                ${secondPlace.map(team => `
                    <div class="qualified-team second-place">
                        <span class="team-flag">${team.flag}</span>
                        <div class="team-info">
                            <span class="team-name">${team.name}</span>
                            <span class="team-group">Grupo ${team.group} - ${team.points} pts (${team.won}G ${team.drawn}E ${team.lost}P) - DG: ${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="qualified-section">
            <h4 class="qualified-title">🥉 Mejores Terceros (8 equipos)</h4>
            <div class="qualified-by-group">
                ${thirdPlace.map(team => `
                    <div class="qualified-team third-place">
                        <span class="team-flag">${team.flag}</span>
                        <div class="team-info">
                            <span class="team-name">${team.name}</span>
                            <span class="team-group">Grupo ${team.group} - ${team.points} pts (${team.won}G ${team.drawn}E ${team.lost}P) - DG: ${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Simular todos los partidos de un grupo
function simulateAllGroup(groupName) {
    window.tournamentData.matches[groupName].forEach((match, idx) => {
        if (!match.played) {
            simulateMatch(groupName, idx);
        }
    });
}

// Simular todos los grupos
function simulateAllGroups() {
    Object.keys(worldCupTeams).forEach(groupName => {
        simulateAllGroup(groupName);
    });
    showNotification('¡Todos los partidos simulados!', 'success');
}

// Cambiar de pestaña
window.showTournamentTab = function(tabName) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Simular todos los partidos de todos los grupos
window.simulateAllMatches = function() {
    const btn = document.getElementById('simulate-all-btn');
    
    // Verificar si ya se simuló
    const allPlayed = Object.keys(window.tournamentData.matches).every(groupName => 
        window.tournamentData.matches[groupName].every(m => m.played)
    );
    
    if (allPlayed) {
        showNotification('La fase de grupos ya está completa', 'info');
        return;
    }
    
    console.log('Simulando todos los partidos...');
    
    // Cambiar texto del botón
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Simulando...';
    }
    
    // Recorrer todos los grupos
    const simulatedMatches = [];
    
    Object.keys(window.tournamentData.matches).forEach(groupName => {
        const matches = window.tournamentData.matches[groupName];
        
        // Simular cada partido del grupo
        matches.forEach((match, idx) => {
            if (!match.played) {
                // Generar resultados aleatorios
                match.score1 = Math.floor(Math.random() * 6);
                match.score2 = Math.floor(Math.random() * 6);
                match.played = true;
                
                // Guardar para enviar al servidor
                simulatedMatches.push({
                    home: match.team1,
                    away: match.team2,
                    score1: match.score1,
                    score2: match.score2
                });
                
                // Actualizar posiciones
                updateStandings(groupName, match);
            }
        });
    });
    
    // Enviar resultados al servidor
    if (simulatedMatches.length > 0) {
        saveSimulationResults(simulatedMatches);
    }
    
    // Ordenar todas las tablas
    Object.keys(window.tournamentData.standings).forEach(groupName => {
        window.tournamentData.standings[groupName].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
    });
    
    // Calcular equipos clasificados
    calculateQualified();
    
    // Renderizar de nuevo
    renderGroups();
    
    // Cambiar botón a completado
    if (btn) {
        btn.innerHTML = '✅ Fase Completada';
        btn.disabled = true;
    }
    
    console.log('Todos los partidos simulados');
}

// Generar llaves de eliminación directa
function generateKnockoutBracket() {
    if (!window.tournamentData.qualified || window.tournamentData.qualified.length < 32) {
        console.error('No hay suficientes equipos clasificados');
        return;
    }
    
    // Emparejamientos típicos del Mundial (cruzando grupos)
    // 1A vs 2B, 1B vs 2A, 1C vs 2D, etc.
    const qualified = window.tournamentData.qualified;
    
    // Mezclar aleatoriamente todos los equipos clasificados
    const shuffledQualified = [...qualified].sort(() => Math.random() - 0.5);
    
    // Crear 16avos de final (16 partidos)
    window.tournamentData.knockoutStage = {
        roundOf32: [],  // 16avos: 16 partidos (32 a 16 equipos)
        roundOf16: [],  // Octavos: 8 partidos (16 a 8 equipos)
        quarterfinals: [],  // Cuartos: 4 partidos (8 a 4 equipos)
        semifinals: [],  // Semifinales: 2 partidos (4 a 2 equipos)
        final: null,  // Final: 1 partido (2 a 1 campeón)
        winner: null
    };
    
    // Generar emparejamientos de 16avos (32 equipos = 16 partidos)
    const roundOf32 = [];
    
    // Emparejar aleatoriamente: 1 vs 2, 3 vs 4, 5 vs 6, etc.
    for (let i = 0; i < shuffledQualified.length; i += 2) {
        if (shuffledQualified[i] && shuffledQualified[i + 1]) {
            roundOf32.push({
                team1: shuffledQualified[i],
                team2: shuffledQualified[i + 1],
                score1: null,
                score2: null,
                penalties1: null,
                penalties2: null,
                played: false,
                winner: null
            });
        }
    }
    
    window.tournamentData.knockoutStage.roundOf32 = roundOf32;
    renderKnockoutStage();
    
    // Mostrar botón de simular toda la eliminación
    const simulateKnockoutBtn = document.getElementById('simulate-knockout-btn');
    if (simulateKnockoutBtn) {
        simulateKnockoutBtn.style.display = 'block';
    }
}

// Renderizar fase de eliminación directa
function renderKnockoutStage() {
    const container = document.getElementById('knockout-container');
    if (!container) return;
    
    const stage = window.tournamentData.knockoutStage;
    if (!stage || !stage.roundOf32 || stage.roundOf32.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: var(--text-muted); padding: 40px;">
                La fase de eliminación directa comenzará cuando termine la fase de grupos.
            </p>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="knockout-rounds">
            ${renderKnockoutRound('16avos de Final (16 partidos)', stage.roundOf32, 'roundOf32')}
            ${stage.roundOf16.length > 0 ? renderKnockoutRound('Octavos de Final (8 partidos)', stage.roundOf16, 'roundOf16') : ''}
            ${stage.quarterfinals.length > 0 ? renderKnockoutRound('Cuartos de Final (4 partidos)', stage.quarterfinals, 'quarterfinals') : ''}
            ${stage.semifinals.length > 0 ? renderKnockoutRound('Semifinales (2 partidos)', stage.semifinals, 'semifinals') : ''}
            ${stage.final ? renderFinalMatch(stage.final) : ''}
            ${stage.winner ? renderWinner(stage.winner) : ''}
        </div>
    `;
}

// Renderizar una ronda de eliminación
function renderKnockoutRound(title, matches, roundName) {
    return `
        <div class="knockout-round">
            <h3 class="knockout-round-title">${title}</h3>
            <div class="knockout-matches">
                ${matches.map((match, idx) => `
                    <div class="knockout-match ${match.played ? 'played' : ''}">
                        <div class="knockout-team ${match.winner === match.team1.name ? 'winner' : ''}">
                            <span class="team-flag">${match.team1.flag}</span>
                            <span class="team-name">${match.team1.name}</span>
                            ${match.played ? `<span class="knockout-score">${match.score1}${match.penalties1 !== null ? ` (${match.penalties1})` : ''}</span>` : ''}
                        </div>
                        <div class="knockout-vs">VS</div>
                        <div class="knockout-team ${match.winner === match.team2.name ? 'winner' : ''}">
                            <span class="team-flag">${match.team2.flag}</span>
                            <span class="team-name">${match.team2.name}</span>
                            ${match.played ? `<span class="knockout-score">${match.score2}${match.penalties2 !== null ? ` (${match.penalties2})` : ''}</span>` : ''}
                        </div>
                        ${!match.played ? `<button class="simulate-btn" onclick="simulateKnockoutMatch('${roundName}', ${idx})">⚽ Simular</button>` : ''}
                    </div>
                `).join('')}
            </div>
            ${matches.length > 0 && matches.every(m => m.played) ? 
                `<button class="advance-round-btn" onclick="advanceToNextRound('${roundName}')">➡️ Avanzar a Siguiente Ronda</button>` : ''
            }
        </div>
    `;
}

// Renderizar partido final
function renderFinalMatch(match) {
    if (!match) return '';
    
    return `
        <div class="knockout-round final-round">
            <h3 class="knockout-round-title">🏆 GRAN FINAL</h3>
            <div class="knockout-matches">
                <div class="knockout-match final-match ${match.played ? 'played' : ''}">
                    <div class="knockout-team ${match.winner === match.team1.name ? 'winner champion' : ''}">
                        <span class="team-flag">${match.team1.flag}</span>
                        <span class="team-name">${match.team1.name}</span>
                        ${match.played ? `<span class="knockout-score">${match.score1}${match.penalties1 !== null ? ` (${match.penalties1})` : ''}</span>` : ''}
                    </div>
                    <div class="knockout-vs final-vs">VS</div>
                    <div class="knockout-team ${match.winner === match.team2.name ? 'winner champion' : ''}">
                        <span class="team-flag">${match.team2.flag}</span>
                        <span class="team-name">${match.team2.name}</span>
                        ${match.played ? `<span class="knockout-score">${match.score2}${match.penalties2 !== null ? ` (${match.penalties2})` : ''}</span>` : ''}
                    </div>
                    ${!match.played ? `<button class="simulate-btn final-simulate" onclick="simulateFinal()">⚽ Simular Final</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Renderizar ganador
function renderWinner(winner) {
    return `
        <div class="champion-container">
            <h2 class="champion-title">🎉 ¡CAMPEÓN DEL MUNDO! 🎉</h2>
            <div class="champion-card">
                <span class="champion-flag">${winner.flag}</span>
                <span class="champion-name">${winner.name}</span>
            </div>
        </div>
    `;
}

// Simular partido de eliminación directa
window.simulateKnockoutMatch = function(roundName, matchIdx) {
    const match = window.tournamentData.knockoutStage[roundName][matchIdx];
    if (!match || match.played) return;
    
    // Generar resultado
    match.score1 = Math.floor(Math.random() * 4);
    match.score2 = Math.floor(Math.random() * 4);
    
    // Si hay empate, penales
    if (match.score1 === match.score2) {
        match.penalties1 = Math.floor(Math.random() * 5) + 1;
        match.penalties2 = Math.floor(Math.random() * 5) + 1;
        
        // Asegurar que haya ganador
        while (match.penalties1 === match.penalties2) {
            match.penalties1 = Math.floor(Math.random() * 5) + 1;
            match.penalties2 = Math.floor(Math.random() * 5) + 1;
        }
        
        match.winner = match.penalties1 > match.penalties2 ? match.team1.name : match.team2.name;
    } else {
        match.winner = match.score1 > match.score2 ? match.team1.name : match.team2.name;
    }
    
    match.played = true;
    
    // Guardar resultado en BD
    saveSimulationResults([{
        home: match.team1.name,
        away: match.team2.name,
        score1: match.score1,
        score2: match.score2
    }]);
    
    renderKnockoutStage();
}

// Avanzar a siguiente ronda
window.advanceToNextRound = function(currentRound) {
    const stage = window.tournamentData.knockoutStage;
    const matches = stage[currentRound];
    
    if (!matches.every(m => m.played)) {
        showNotification('Debes simular todos los partidos primero', 'error');
        return;
    }
    
    // Obtener ganadores
    const winners = matches.map(m => {
        const winnerData = m.winner === m.team1.name ? m.team1 : m.team2;
        return { ...winnerData };
    });
    
    // Crear siguiente ronda
    const nextMatches = [];
    for (let i = 0; i < winners.length; i += 2) {
        if (winners[i] && winners[i + 1]) {
            nextMatches.push({
                team1: winners[i],
                team2: winners[i + 1],
                score1: null,
                score2: null,
                penalties1: null,
                penalties2: null,
                played: false,
                winner: null
            });
        }
    }
    
    // Asignar a la siguiente ronda
    if (currentRound === 'roundOf32') {
        // De 32 a 16 equipos (8 partidos de octavos)
        stage.roundOf16 = nextMatches;
        showNotification('¡Avanzamos a Octavos de Final! (8 partidos)', 'success');
    } else if (currentRound === 'roundOf16') {
        // De 16 a 8 equipos (4 partidos de cuartos)
        stage.quarterfinals = nextMatches;
        showNotification('¡Avanzamos a Cuartos de Final! (4 partidos)', 'success');
    } else if (currentRound === 'quarterfinals') {
        // De 8 a 4 equipos (2 partidos de semifinales)
        stage.semifinals = nextMatches;
        showNotification('¡Avanzamos a Semifinales! (2 partidos)', 'success');
    } else if (currentRound === 'semifinals') {
        // De 4 a 2 equipos (1 partido final)
        console.log('Avanzando de semifinales. Ganadores:', winners.length);
        console.log('Partidos creados:', nextMatches.length);
        if (nextMatches.length === 1) {
            stage.final = nextMatches[0];
            console.log('Final creada:', stage.final);
            showNotification('¡Avanzamos a la GRAN FINAL!', 'success');
        } else {
            console.error('Error: Se esperaba 1 partido final, se obtuvieron:', nextMatches.length);
        }
    }
    
    renderKnockoutStage();
}

// Simular final
window.simulateFinal = function() {
    const match = window.tournamentData.knockoutStage.final;
    if (!match || match.played) return;
    
    // Generar resultado
    match.score1 = Math.floor(Math.random() * 4);
    match.score2 = Math.floor(Math.random() * 4);
    
    // Si hay empate, penales
    if (match.score1 === match.score2) {
        match.penalties1 = Math.floor(Math.random() * 5) + 1;
        match.penalties2 = Math.floor(Math.random() * 5) + 1;
        
        while (match.penalties1 === match.penalties2) {
            match.penalties1 = Math.floor(Math.random() * 5) + 1;
            match.penalties2 = Math.floor(Math.random() * 5) + 1;
        }
        
        match.winner = match.penalties1 > match.penalties2 ? match.team1.name : match.team2.name;
    } else {
        match.winner = match.score1 > match.score2 ? match.team1.name : match.team2.name;
    }
    
    match.played = true;
    
    // Establecer campeón
    const winner = match.winner === match.team1.name ? match.team1 : match.team2;
    window.tournamentData.knockoutStage.winner = winner;
    
    showNotification(`¡${winner.name} es CAMPEÓN DEL MUNDO! 🏆`, 'success');
    renderKnockoutStage();
}

// Simular toda la fase de eliminación directa
window.simulateAllKnockout = function() {
    const btn = document.getElementById('simulate-knockout-btn');
    const stage = window.tournamentData.knockoutStage;
    
    if (!stage || !stage.roundOf32 || stage.roundOf32.length === 0) {
        showNotification('Primero debes completar la fase de grupos', 'error');
        return;
    }
    
    // Verificar si ya se simuló todo
    if (stage.winner) {
        showNotification('La eliminación directa ya está completa', 'info');
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Simulando...';
    }
    
    // Simular 16avos
    stage.roundOf32.forEach((match, idx) => {
        if (!match.played) {
            match.score1 = Math.floor(Math.random() * 4);
            match.score2 = Math.floor(Math.random() * 4);
            if (match.score1 === match.score2) {
                match.penalties1 = Math.floor(Math.random() * 5) + 1;
                match.penalties2 = Math.floor(Math.random() * 5) + 1;
                while (match.penalties1 === match.penalties2) {
                    match.penalties2 = Math.floor(Math.random() * 5) + 1;
                }
                match.winner = match.penalties1 > match.penalties2 ? match.team1.name : match.team2.name;
            } else {
                match.winner = match.score1 > match.score2 ? match.team1.name : match.team2.name;
            }
            match.played = true;
        }
    });
    
    // Avanzar a octavos
    let winners = stage.roundOf32.map(m => m.winner === m.team1.name ? { ...m.team1 } : { ...m.team2 });
    stage.roundOf16 = [];
    for (let i = 0; i < winners.length; i += 2) {
        stage.roundOf16.push({
            team1: winners[i],
            team2: winners[i + 1],
            score1: null,
            score2: null,
            penalties1: null,
            penalties2: null,
            played: false,
            winner: null
        });
    }
    
    // Simular octavos
    stage.roundOf16.forEach((match) => {
        match.score1 = Math.floor(Math.random() * 4);
        match.score2 = Math.floor(Math.random() * 4);
        if (match.score1 === match.score2) {
            match.penalties1 = Math.floor(Math.random() * 5) + 1;
            match.penalties2 = Math.floor(Math.random() * 5) + 1;
            while (match.penalties1 === match.penalties2) {
                match.penalties2 = Math.floor(Math.random() * 5) + 1;
            }
            match.winner = match.penalties1 > match.penalties2 ? match.team1.name : match.team2.name;
        } else {
            match.winner = match.score1 > match.score2 ? match.team1.name : match.team2.name;
        }
        match.played = true;
    });
    
    // Avanzar a cuartos
    winners = stage.roundOf16.map(m => m.winner === m.team1.name ? { ...m.team1 } : { ...m.team2 });
    stage.quarterfinals = [];
    for (let i = 0; i < winners.length; i += 2) {
        stage.quarterfinals.push({
            team1: winners[i],
            team2: winners[i + 1],
            score1: null,
            score2: null,
            penalties1: null,
            penalties2: null,
            played: false,
            winner: null
        });
    }
    
    // Simular cuartos
    stage.quarterfinals.forEach((match) => {
        match.score1 = Math.floor(Math.random() * 4);
        match.score2 = Math.floor(Math.random() * 4);
        if (match.score1 === match.score2) {
            match.penalties1 = Math.floor(Math.random() * 5) + 1;
            match.penalties2 = Math.floor(Math.random() * 5) + 1;
            while (match.penalties1 === match.penalties2) {
                match.penalties2 = Math.floor(Math.random() * 5) + 1;
            }
            match.winner = match.penalties1 > match.penalties2 ? match.team1.name : match.team2.name;
        } else {
            match.winner = match.score1 > match.score2 ? match.team1.name : match.team2.name;
        }
        match.played = true;
    });
    
    // Avanzar a semifinales
    winners = stage.quarterfinals.map(m => m.winner === m.team1.name ? { ...m.team1 } : { ...m.team2 });
    stage.semifinals = [];
    for (let i = 0; i < winners.length; i += 2) {
        stage.semifinals.push({
            team1: winners[i],
            team2: winners[i + 1],
            score1: null,
            score2: null,
            penalties1: null,
            penalties2: null,
            played: false,
            winner: null
        });
    }
    
    // Simular semifinales
    stage.semifinals.forEach((match) => {
        match.score1 = Math.floor(Math.random() * 4);
        match.score2 = Math.floor(Math.random() * 4);
        if (match.score1 === match.score2) {
            match.penalties1 = Math.floor(Math.random() * 5) + 1;
            match.penalties2 = Math.floor(Math.random() * 5) + 1;
            while (match.penalties1 === match.penalties2) {
                match.penalties2 = Math.floor(Math.random() * 5) + 1;
            }
            match.winner = match.penalties1 > match.penalties2 ? match.team1.name : match.team2.name;
        } else {
            match.winner = match.score1 > match.score2 ? match.team1.name : match.team2.name;
        }
        match.played = true;
    });
    
    // Avanzar a final
    winners = stage.semifinals.map(m => m.winner === m.team1.name ? { ...m.team1 } : { ...m.team2 });
    stage.final = {
        team1: winners[0],
        team2: winners[1],
        score1: null,
        score2: null,
        penalties1: null,
        penalties2: null,
        played: false,
        winner: null
    };
    
    // Simular final
    const final = stage.final;
    final.score1 = Math.floor(Math.random() * 4);
    final.score2 = Math.floor(Math.random() * 4);
    if (final.score1 === final.score2) {
        final.penalties1 = Math.floor(Math.random() * 5) + 1;
        final.penalties2 = Math.floor(Math.random() * 5) + 1;
        while (final.penalties1 === final.penalties2) {
            final.penalties2 = Math.floor(Math.random() * 5) + 1;
        }
        final.winner = final.penalties1 > final.penalties2 ? final.team1.name : final.team2.name;
    } else {
        final.winner = final.score1 > final.score2 ? final.team1.name : final.team2.name;
    }
    final.played = true;
    
    // Establecer campeón
    const winner = final.winner === final.team1.name ? final.team1 : final.team2;
    stage.winner = winner;
    
    // Renderizar
    renderKnockoutStage();
    
    if (btn) {
        btn.innerHTML = '✅ Eliminación Completada';
        btn.disabled = true;
    }
    
    showNotification(`¡${winner.name} es CAMPEÓN DEL MUNDO! 🏆`, 'success');
}

// Reiniciar todo el torneo
window.restartTournament = async function() {
    // Confirmar con el usuario
    if (!confirm('¿Estás seguro de que quieres reiniciar el torneo completo? Se perderán todos los resultados y predicciones.')) {
        return;
    }
    
    // Reiniciar predicciones en BD
    try {
        const response = await fetch('https://mundialpoi-app.ngrok.app/api/predictions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'reset_predictions'
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Predicciones reiniciadas en BD');
        }
    } catch (error) {
        console.error('Error reiniciando predicciones:', error);
    }
    
    // Resetear solo los resultados, no los grupos
    Object.keys(window.tournamentData.matches).forEach(groupName => {
        window.tournamentData.matches[groupName].forEach(match => {
            match.score1 = null;
            match.score2 = null;
            match.played = false;
        });
    });
    
    // Resetear standings
    Object.keys(worldCupTeams).forEach(groupName => {
        window.tournamentData.standings[groupName] = worldCupTeams[groupName].map(team => ({
            ...team,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        }));
    });
    
    // Resetear eliminatorias
    window.tournamentData.qualified = [];
    window.tournamentData.knockoutStage = {};
    
    // Renderizar de nuevo (mantiene grupos)
    renderGroups();
    
    // Resetear botones
    const simulateBtn = document.getElementById('simulate-all-btn');
    if (simulateBtn) {
        simulateBtn.innerHTML = '⚡ Simular Fase de Grupos';
        simulateBtn.disabled = false;
    }
    
    const knockoutBtn = document.getElementById('simulate-knockout-btn');
    if (knockoutBtn) {
        knockoutBtn.style.display = 'none';
        knockoutBtn.innerHTML = '⚡ Simular Toda la Eliminación Directa';
        knockoutBtn.disabled = false;
    }
    
    // Limpiar contenedor de knockout
    const knockoutContainer = document.getElementById('knockout-container');
    if (knockoutContainer) {
        knockoutContainer.innerHTML = `
            <p style="text-align: center; color: var(--text-muted); padding: 40px;">
                La fase de eliminación directa comenzará cuando termine la fase de grupos.
            </p>
        `;
    }
    
    // Limpiar contenedor de clasificados
    const qualifiedContainer = document.getElementById('qualified-teams');
    if (qualifiedContainer) {
        qualifiedContainer.innerHTML = '';
    }
    
    showNotification('✅ Torneo reiniciado. Los grupos se mantienen, resultados borrados.', 'success');
    
    console.log('Torneo reiniciado - Grupos fijos mantenidos');
}

// =============================================
// INTEGRACIÓN CON SISTEMA DE PREDICCIONES
// =============================================

async function syncMatchesToDB(matches) {
    try {
        const response = await fetch('https://mundialpoi-app.ngrok.app/api/predictions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'sync_matches',
                matches: matches
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ${data.synced} partidos sincronizados con BD`);
        } else {
            console.error('Error sincronizando partidos:', data.error);
        }
    } catch (error) {
        console.error('Error al sincronizar partidos:', error);
    }
}

async function saveSimulationResults(results) {
    console.log('📤 Enviando resultados al servidor:', results);
    
    try {
        const response = await fetch('https://mundialpoi-app.ngrok.app/api/predictions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'save_simulation_results',
                results: results
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ${data.updated} resultados guardados en BD`);
            if (data.updated > 0) {
                showNotification(`✅ ${data.updated} resultados guardados. Predicciones actualizadas.`, 'success');
            }
        } else {
            console.error('Error guardando resultados:', data.error);
            showNotification('⚠️ Error al guardar resultados: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error al guardar simulación:', error);
        showNotification('⚠️ Error de conexión al guardar resultados', 'error');
    }
}

