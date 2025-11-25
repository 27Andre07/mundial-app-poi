# 🌐 Configuración de ngrok para Mundial App POI

## 📋 Dominios configurados

- **mundialpoi-app.ngrok.app** → `localhost:80` (PHP/Apache/XAMPP)
- **mundialpoi-ws.ngrok.app** → `localhost:3000` (Node.js/Socket.IO)

---

## 🚀 Guía de inicio rápido

### Opción 1: Script automático (Recomendado)

1. Asegúrate de tener XAMPP corriendo
2. Ejecuta el script:
   ```powershell
   .\start-ngrok.ps1
   ```

### Opción 2: Manual

#### Paso 1: Iniciar XAMPP
- Abre el Panel de Control de XAMPP
- Inicia **Apache** (puerto 80)
- Inicia **MySQL**

#### Paso 2: Iniciar servidor Node.js
```powershell
node server.js
```

#### Paso 3: Iniciar túneles ngrok

**Con archivo de configuración:**
```powershell
ngrok start --all --config ngrok-config.yml
```

**Sin archivo de configuración (en terminales separadas):**
```powershell
# Terminal 1
ngrok http 80 --domain=mundialpoi-app.ngrok.app

# Terminal 2
ngrok http 3000 --domain=mundialpoi-ws.ngrok.app
```

---

## ⚙️ Configuración de ngrok

### Configurar tu authtoken

1. Registrate en https://ngrok.com
2. Obtén tu authtoken desde el dashboard
3. Edita `ngrok-config.yml` y reemplaza `YOUR_NGROK_AUTH_TOKEN_HERE` con tu token
4. O ejecuta: `ngrok config add-authtoken TU_TOKEN_AQUI`

### Verificar dominios reservados

En tu cuenta de ngrok, verifica que tengas estos dominios reservados:
- `mundialpoi-app.ngrok.app`
- `mundialpoi-ws.ngrok.app`

Si no los tienes, crea nuevos dominios estáticos desde el panel de ngrok.

---

## 🔧 Archivos modificados

### JavaScript (Frontend)
- `js/app.js` → API_BASE actualizado
- `js/auth.js` → API_BASE actualizado
- `js/tienda.js` → API_BASE actualizado
- `js/tasks.js` → API_BASE actualizado
- `js/predictions.js` → URLs actualizadas
- `js/tournament.js` → URLs actualizadas
- `js/videocall.js` → Socket.IO URL actualizada

### Backend
- `api/config.php` → Headers CORS agregados
- `server.js` → CORS y puerto dinámico configurados

---

## 🌍 Acceso a la aplicación

Una vez todo esté corriendo:

- **App principal:** https://mundialpoi-app.ngrok.app
- **API PHP:** https://mundialpoi-app.ngrok.app/api/
- **WebSocket:** https://mundialpoi-ws.ngrok.app

---

## 🐛 Solución de problemas

### Error: "Failed to complete tunnel connection"
- Verifica que tu authtoken esté configurado correctamente
- Revisa que los dominios estén reservados en tu cuenta de ngrok

### Error 500 en API PHP
- Asegúrate de que Apache/XAMPP esté corriendo
- Verifica la conexión a la base de datos en `api/config.php`
- Revisa los logs de Apache en `C:\xampp\apache\logs\error.log`

### Error "ERR_CONNECTION_REFUSED" en Socket.IO
- Verifica que `node server.js` esté corriendo
- Revisa que el puerto 3000 esté libre
- Verifica que ngrok esté redirigiendo correctamente el puerto 3000

### Errores de CORS
- Los headers CORS ya están configurados en `config.php` y `server.js`
- Si persiste, verifica que las URLs en los archivos JS sean correctas

---

## 📝 Notas importantes

- **ngrok gratuito:** La URL cambia cada vez que reinicias ngrok (a menos que tengas dominios reservados)
- **Mantén encendido:** Tu PC debe estar encendida y conectada a internet
- **No para producción:** ngrok es ideal para desarrollo y pruebas, no para producción permanente
- **Límites:** La versión gratuita de ngrok tiene límites de conexiones simultáneas

---

## 🔄 Volver a desarrollo local

Si quieres volver a desarrollo local sin ngrok:

1. Cambia `API_BASE` en todos los archivos JS:
   ```javascript
   const API_BASE = 'api/';
   ```

2. Cambia Socket.IO URL en `videocall.js`:
   ```javascript
   const socket = io('http://localhost:3000');
   ```

3. Puedes comentar los headers CORS en `config.php` (opcional)

---

¿Necesitas ayuda? Revisa los logs de:
- Apache: `C:\xampp\apache\logs\error.log`
- MySQL: `C:\xampp\mysql\data\*.err`
- Node.js: La terminal donde ejecutaste `node server.js`
- ngrok: El dashboard web en `http://localhost:4040`
