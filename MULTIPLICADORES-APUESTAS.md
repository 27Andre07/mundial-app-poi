# Sistema de Multiplicadores de Apuestas del Torneo

## Cómo Funciona

Cuando apuestas por un equipo, tus puntos ganados o perdidos dependen de **qué tan lejos llegó tu equipo** en la eliminación directa.

### Tabla de Multiplicadores

| Fase Alcanzada | Multiplicador | Resultado | Ejemplo (100 pts apostados) |
|---------------|---------------|-----------|---------------------------|
| **🏆 Campeón** | x3.0 | GANA TRIPLE | +300 pts |
| **🥈 Subcampeón (Final)** | x2.0 | GANA DOBLE | +200 pts |
| **🥉 Semifinales** | +50% | GANA MITAD MÁS | +50 pts |
| **⚽ Cuartos de Final** | x0.0 | RECUPERA APUESTA | 0 pts (empate) |
| **📊 Octavos de Final** | -25% | PIERDE CUARTA PARTE | -25 pts |
| **📉 16avos de Final** | -50% | PIERDE MITAD | -50 pts |
| **❌ No Clasifica (Grupos)** | -100% | PIERDE TODO | -100 pts |

## Ejemplos Prácticos

### Ejemplo 1: Apostaste a Portugal (100 pts) - Portugal CAMPEÓN
- **Fase alcanzada:** Campeón
- **Multiplicador:** x3.0
- **Resultado:** +300 pts (triplicas tu apuesta)
- **Total final:** 808 + 300 = 1108 pts

### Ejemplo 2: Apostaste a Brasil (100 pts) - Brasil SEMIFINALES
- **Fase alcanzada:** Semifinales
- **Multiplicador:** +50%
- **Resultado:** +50 pts (ganas la mitad más)
- **Total final:** 808 + 50 = 858 pts

### Ejemplo 3: Apostaste a Colombia (100 pts) - Colombia CUARTOS
- **Fase alcanzada:** Cuartos de Final
- **Multiplicador:** x0.0
- **Resultado:** 0 pts (recuperas tu apuesta)
- **Total final:** 808 + 0 = 808 pts (igual que antes)

### Ejemplo 4: Apostaste a Argentina (100 pts) - Argentina OCTAVOS
- **Fase alcanzada:** Octavos de Final
- **Multiplicador:** -25%
- **Resultado:** -25 pts (pierdes solo un cuarto)
- **Total final:** 808 - 25 = 783 pts

### Ejemplo 5: Apostaste a México (100 pts) - México 16AVOS
- **Fase alcanzada:** 16avos de Final
- **Multiplicador:** -50%
- **Resultado:** -50 pts (pierdes la mitad)
- **Total final:** 808 - 50 = 758 pts

### Ejemplo 6: Apostaste a Uruguay (100 pts) - Uruguay no pasa de grupos
- **Fase alcanzada:** No clasifica
- **Multiplicador:** -100%
- **Resultado:** -100 pts (pierdes todo)
- **Total final:** 808 - 100 = 708 pts

## Cómo se Calcula

1. **Cuando el torneo termina**, el sistema automáticamente:
   - Revisa qué equipos llegaron a cada fase
   - Calcula el multiplicador correspondiente
   - Aplica la fórmula: `puntos_resultado = puntos_apostados × multiplicador`

2. **Si ganaste** (multiplicador positivo):
   - Se suman los puntos ganados a tu cuenta
   - Estado: ✅ Ganada

3. **Si empataste** (multiplicador = 0):
   - Recuperas exactamente lo que apostaste
   - Estado: 🔄 Pendiente

4. **Si perdiste** (multiplicador negativo):
   - Ya perdiste los puntos al apostar
   - Si es -50%, se te devuelve la mitad
   - Si es -100%, no se devuelve nada
   - Estado: ❌ Perdida

## Estrategia Recomendada

- **Alta recompensa:** Apuesta por equipos favoritos que pueden llegar lejos
- **Bajo riesgo:** Apuesta por equipos medianos que al menos lleguen a cuartos
- **Diversifica:** Haz varias apuestas pequeñas en lugar de una grande

## Código Técnico

El cálculo se hace en `api/tournament_bets.php`:

```php
function getMultiplierByPhase($phase) {
    switch ($phase) {
        case 'champion': return 3.0;      // Campeón: x3
        case 'final': return 2.0;         // Final: x2
        case 'semifinals': return 0.5;    // Semifinales: +50%
        case 'quarterfinals': return 0.0; // Cuartos: recupera (x1)
        case 'roundOf16': return -0.25;   // Octavos: -25%
        case 'roundOf32': return -0.5;    // 16avos: -50%
        default: return -1.0;             // No clasifica: -100%
    }
}
```

El rastreo de fases se hace en `js/tournament.js` durante la simulación.
