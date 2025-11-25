# ✅ Configuración completada para ngrok

## 🎯 Cambios realizados

### 1. **Archivos JavaScript actualizados**
   - ✅ `js/app.js` - API_BASE apunta a https://mundialpoi-app.ngrok.app/api/
   - ✅ `js/auth.js` - API_BASE actualizado
   - ✅ `js/tienda.js` - API_BASE actualizado
   - ✅ `js/tasks.js` - API_BASE agregado
   - ✅ `js/predictions.js` - URLs de fetch actualizadas
   - ✅ `js/tournament.js` - URLs de fetch actualizadas
   - ✅ `js/videocall.js` - Socket.IO conecta a https://mundialpoi-ws.ngrok.app

### 2. **Backend configurado**
   - ✅ `api/config.php` - Headers CORS agregados para permitir peticiones desde ngrok
   - ✅ `server.js` - CORS configurado y puerto dinámico (process.env.PORT || 3000)

### 3. **Archivos HTML actualizados**
   - ✅ `app.html`, `index.html`, `login.html`, `registro.html`, `tienda.html`
   - ✅ Favicon agregado a todos los HTML

### 4. **Archivos de configuración creados**
   - ✅ `ngrok-config.yml` - Configuración de túneles ngrok
   - ✅ `start-ngrok.ps1` - Script PowerShell para iniciar todo automáticamente
   - ✅ `NGROK-SETUP.md` - Guía completa de configuración
   - ✅ `favicon.svg` - Ícono de la app

---

## 🚀 Cómo iniciar tu aplicación

### Opción 1: Script automático (Recomendado)

```powershell
.\start-ngrok.ps1
```

### Opción 2: Paso a paso manual

#### 1. Inicia XAMPP
- Abre el Panel de Control de XAMPP
- Start Apache (puerto 80)
- Start MySQL

#### 2. Inicia el servidor Node.js
```powershell
node server.js
```

#### 3. Configura ngrok (solo primera vez)

Edita `ngrok-config.yml` y agrega tu authtoken:
```yaml
authtoken: TU_TOKEN_AQUI
```

O ejecuta:
```powershell
ngrok config add-authtoken TU_TOKEN_AQUI
```

#### 4. Inicia ngrok

**Con archivo de configuración:**
```powershell
ngrok start --all --config ngrok-config.yml
```

**Sin archivo (en terminales separadas):**
```powershell
# Terminal 1 - PHP/Apache
ngrok http 80 --domain=mundialpoi-app.ngrok.app

# Terminal 2 - Node.js/Socket.IO
ngrok http 3000 --domain=mundialpoi-ws.ngrok.app
```

---

## 🌐 URLs de acceso

Una vez todo esté corriendo:

- **Aplicación:** https://mundialpoi-app.ngrok.app
- **Login:** https://mundialpoi-app.ngrok.app/login.html
- **API:** https://mundialpoi-app.ngrok.app/api/
- **WebSocket:** https://mundialpoi-ws.ngrok.app
- **Dashboard ngrok:** http://localhost:4040

---

## ✅ Verificaciones

Asegúrate de que:

1. ✅ XAMPP/Apache esté corriendo en puerto 80
2. ✅ MySQL esté corriendo
3. ✅ Node.js esté corriendo (`node server.js`)
4. ✅ Ambos túneles ngrok estén activos
5. ✅ Los dominios ngrok estén reservados en tu cuenta

---

## 🐛 Troubleshooting rápido

### Error 500 en API PHP
```powershell
# Revisa logs de Apache
Get-Content C:\xampp\apache\logs\error.log -Tail 50
```

### Error de conexión Socket.IO
```powershell
# Verifica que Node.js esté corriendo
Get-Process node
```

### Errores de CORS
- Ya están configurados los headers en `config.php` y `server.js`
- Verifica que las URLs en los archivos JS sean correctas

---

## 📞 Soporte

Lee la guía completa en: `NGROK-SETUP.md`
