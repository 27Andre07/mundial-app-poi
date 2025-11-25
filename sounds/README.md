# Carpeta de Sonidos

Esta carpeta contiene los archivos de audio para las notificaciones personalizadas de la tienda.

## Archivos requeridos:

- **gol.mp3** - Sonido de notificación "¡GOL!" que se reproduce cuando el usuario recibe mensajes y tiene esta recompensa activa en la tienda.

## Instrucciones:

1. Coloca tu archivo de audio en formato MP3 en esta carpeta
2. Asegúrate de que el archivo se llame exactamente `gol.mp3`
3. El sonido se reproducirá automáticamente cuando:
   - El usuario tenga comprado y activado el item "Sonido de Notificación: ¡GOL!"
   - Reciba un mensaje nuevo en canales o mensajes directos
   - El mensaje sea de otro usuario (no reproduce cuando envías tus propios mensajes)

## Agregar más sonidos:

Para agregar más sonidos de notificación en el futuro:

1. Agrega el archivo de audio en esta carpeta con un nombre descriptivo
2. En `js/app.js`, en la función `loadActiveRewards()`, agrega una condición similar a:
   ```javascript
   if (activeRewards['notif_otro_sonido']) {
       notificationSound = new Audio('sounds/nombre_archivo.mp3');
       notificationSound.volume = 0.7;
   }
   ```
3. Asegúrate de que el `item_id` en la tienda coincida con la clave que buscas en `activeRewards`
