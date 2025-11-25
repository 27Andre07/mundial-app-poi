const API_BASE = 'api/';

// Variables globales
let currentUser = null;
let currentGroup = null;
let currentChannel = null;
let messagePollingInterval = null;
let lastMessageId = 0;
let pendingLocation = null;
let pendingFile = null;
let notificationSound = null;
let activeRewards = {};
let isEncryptionEnabled = false;

// Clave de encriptación simple (AES simulado con Caesar cipher mejorado)
const ENCRYPTION_KEY = 'MundialApp2026SecretKey';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    try {
        const response = await fetch(API_BASE + 'auth.php?action=check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = data.user;
        updateUserInterface();
        
        // Registrar usuario en Socket.IO para videollamadas
        if (typeof socket !== 'undefined' && socket.connected && currentUser.id) {
            socket.emit('register', currentUser.id);
        }
        
        await loadActiveRewards();
        await loadUserGroups();
        startMessagePolling();
        
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        window.location.href = 'login.html';
    }
}

// Cargar recompensas activas del usuario
async function loadActiveRewards() {
    try {
        const response = await fetch(API_BASE + 'shop.php?action=active', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.active_items) {
            activeRewards = {};
            data.active_items.forEach(item => {
                activeRewards[item.item_id] = item.item_name;
            });
            
            // Cargar sonido de notificación si está activo
            if (activeRewards['sonido_gol']) {
                notificationSound = new Audio('sounds/gol.mp3');
                notificationSound.volume = 0.7;
            } else {
                notificationSound = null;
            }
            
            // Aplicar fondo de México si está activo
            applyChatBackground();
        }
    } catch (error) {
        console.error('Error cargando recompensas activas:', error);
    }
}

// Aplicar fondo de chat según recompensas activas
function applyChatBackground() {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    if (activeRewards['fondo_mex']) {
        chatMessages.style.backgroundImage = 'url("backgrounds/mexico.jpg")';
        chatMessages.style.backgroundSize = 'cover';
        chatMessages.style.backgroundPosition = 'center';
        chatMessages.style.backgroundRepeat = 'no-repeat';
        chatMessages.style.backgroundAttachment = 'fixed';
    } else {
        chatMessages.style.backgroundImage = '';
        chatMessages.style.backgroundSize = '';
        chatMessages.style.backgroundPosition = '';
        chatMessages.style.backgroundRepeat = '';
        chatMessages.style.backgroundAttachment = '';
    }
}

// Reproducir sonido de notificación
function playNotificationSound() {
    if (notificationSound) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(err => {
            console.log('No se pudo reproducir el sonido:', err);
        });
    }
}

// Función helper para agregar insignia al nombre del usuario
function getUserDisplayName(username, userId, hasBadge) {
    // Si el mensaje tiene la insignia activa (viene de la BD)
    if (hasBadge && hasBadge > 0) {
        return `🏆 ${username}`;
    }
    return username;
}

function updateUserInterface() {
    const userElements = document.querySelectorAll('.current-user');
    userElements.forEach(el => {
        el.textContent = currentUser.username;
    });
}

async function loadUserGroups() {
    try {
        const response = await fetch(API_BASE + 'groups.php', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.groups) {
            renderServerList(data.groups);
            if (data.groups.length > 0) {
                await selectGroup(data.groups[0].id);
            }
        }
    } catch (error) {
        console.error('Error cargando grupos:', error);
        showNotification('Error al cargar los grupos', 'error');
    }
}

function renderServerList(groups) {
    const serversColumn = document.querySelector('.servers-column');
    
    // Preservar elementos del HTML
    const tournamentIcon = document.getElementById('tournament-btn');
    const separator = document.querySelector('.server-separator');
    const addButton = document.getElementById('add-group-btn');
    const shopIcon = document.querySelector('.shop-icon');
    
    // Limpiar solo los íconos de grupos
    const groupIcons = serversColumn.querySelectorAll('.server-icon[data-group-id]');
    groupIcons.forEach(icon => icon.remove());
    
    // Insertar los grupos
    groups.forEach(group => {
        const serverIcon = document.createElement('div');
        serverIcon.className = 'server-icon';
        serverIcon.title = group.name;
        serverIcon.textContent = group.name.charAt(0).toUpperCase();
        serverIcon.dataset.groupId = group.id;
        
        serverIcon.addEventListener('click', () => selectGroup(group.id));
        
        // Insertar antes del separador de la tienda
        const navSpacer = document.querySelector('.nav-spacer');
        if (navSpacer) {
            serversColumn.insertBefore(serverIcon, navSpacer);
        } else {
            serversColumn.insertBefore(serverIcon, addButton);
        }
    });
}

async function selectGroup(groupId) {
    try {
        // Limpiar estado de DM
        currentDMUser = null;
        
        // Ocultar vista de torneo si está visible
        hideTournamentView();
        
        // Detener polling de DM si está activo
        if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
        }
        if (dmRequestsPollingInterval) {
            clearInterval(dmRequestsPollingInterval);
            dmRequestsPollingInterval = null;
        }
        
        // Mostrar y restaurar columnas necesarias
        const channelsColumn = document.querySelector('.channels-column');
        const dmColumn = document.getElementById('dm-column');
        const mainView = document.querySelector('.main-view');
        
        if (mainView) mainView.classList.remove('d-none');
        if (channelsColumn) channelsColumn.classList.remove('d-none');
        if (dmColumn) dmColumn.classList.add('d-none');
        
        const response = await fetch(API_BASE + `groups.php?group_id=${groupId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            showNotification(data.error || 'Error al cargar el grupo', 'error');
            return;
        }
        
        currentGroup = data.group;
        renderChannelList(data.channels);
        renderMembersList(data.members);
        updateGroupHeader();
        
        // Seleccionar primer canal por defecto
        if (data.channels.length > 0) {
            await selectChannel(data.channels[0].id);
        }
        
        // Actualizar estado visual
        document.querySelectorAll('.server-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        document.querySelector(`[data-group-id="${groupId}"]`)?.classList.add('active');
        document.getElementById('dm-btn')?.classList.remove('active');
        document.getElementById('tournament-btn')?.classList.remove('active');
        
    } catch (error) {
        console.error('Error seleccionando grupo:', error);
        showNotification('Error al cargar el grupo', 'error');
    }
}

function renderChannelList(channels) {
    const channelsColumn = document.querySelector('.channels-column');
    
    const textChannels = channels.filter(c => c.type === 'text');
    const taskChannels = channels.filter(c => c.type === 'tasks');
    
    channelsColumn.innerHTML = `
        <div class="channels-header">
            <h3>${currentGroup.name}</h3>
        </div>
        <div style="padding: 0 12px;">
            <h4 style="color: #b9bbbe; font-size: 12px; text-transform: uppercase; margin: 16px 0 8px 0;">Canales de Texto</h4>
            ${textChannels.map(channel => `
                <div class="channel" data-channel-id="${channel.id}">
                    <span># ${channel.name}</span>
                </div>
            `).join('')}
            
            <h4 style="color: #b9bbbe; font-size: 12px; text-transform: uppercase; margin: 16px 0 8px 0;">Gestión de Tareas</h4>
            ${taskChannels.map(channel => `
                <div class="channel" onclick="showTasksManager()">
                    <span>📋 ${channel.name}</span>
                </div>
            `).join('')}
            
            <h4 style="color: #b9bbbe; font-size: 12px; text-transform: uppercase; margin: 16px 0 8px 0;">Miembros en Línea</h4>
            <div id="members-list"></div>
        </div>
    `;
    
    document.querySelectorAll('.channel[data-channel-id]').forEach(channelEl => {
        channelEl.addEventListener('click', (e) => {
            const channelId = e.currentTarget.dataset.channelId;
            selectChannel(channelId);
        });
    });
}

function renderMembersList(members) {
    const membersList = document.getElementById('members-list');
    if (membersList) {
        membersList.innerHTML = members.map(member => `
            <div class="member-item" style="padding: 4px 8px; color: #b9bbbe; font-size: 14px;">
                ${member.is_online ? '🟢' : '⚫'} ${member.username}
            </div>
        `).join('');
    }
}

function updateGroupHeader() {
    const header = document.querySelector('.chat-header h2');
    if (header && currentGroup) {
        header.textContent = currentGroup.name;
    }
}

async function selectChannel(channelId) {
    currentChannel = channelId;
    lastMessageId = 0;
    
    // Limpiar estado de DM
    currentDMUser = null;
    
    // Asegurar que la vista principal esté visible
    const mainView = document.querySelector('.main-view');
    const chatArea = document.querySelector('.chat-area');
    if (mainView) mainView.classList.remove('d-none');
    if (chatArea) chatArea.style.display = 'flex';
    
    // Actualizar estado visual
    document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
    document.querySelector(`[data-channel-id="${channelId}"]`)?.classList.add('active');
    
    // Cargar mensajes del canal
    await loadChannelMessages();
    
    // Aplicar fondo de chat
    applyChatBackground();
    
    // Ocultar botón de videollamada (solo disponible en DMs)
    const videoCallBtn = document.getElementById('video-call-btn');
    if (videoCallBtn) videoCallBtn.style.display = 'none';
    
    // Actualizar header
    const channelElement = document.querySelector(`[data-channel-id="${channelId}"]`);
    const channelName = channelElement ? channelElement.textContent.trim().replace('#', '').replace('📋', '').trim() : '';
    
    const chatHeader = document.querySelector('.chat-header h2');
    if (chatHeader) {
        chatHeader.textContent = `${currentGroup.name} # ${channelName}`;
    }
    
    // Habilitar input
    const input = document.querySelector('.chat-input-box input');
    if (input) {
        input.placeholder = `Escribe un mensaje en #${channelName}...`;
        input.disabled = false;
    }
    
    const sendBtn = document.querySelector('.chat-input-box button');
    if (sendBtn) {
        sendBtn.disabled = false;
    }
    
    // Resetear estados
    pendingLocation = null;
    pendingFile = null;
    
    const locationIcon = document.querySelector('.action-icon[onclick="prepareLocationShare()"]');
    const fileIcon = document.querySelector('.action-icon[onclick="prepareFileUpload()"]');
    if (locationIcon) locationIcon.classList.remove('active');
    if (fileIcon) fileIcon.classList.remove('active');
    
    // Iniciar verificación de llamadas activas
    if (typeof startCallChecking === 'function') {
        startCallChecking();
    }
}

async function loadChannelMessages(getNew = false) {
    if (!currentChannel) return;
    
    try {
        const url = getNew 
            ? `${API_BASE}messages.php?channel_id=${currentChannel}&last_id=${lastMessageId}`
            : `${API_BASE}messages.php?channel_id=${currentChannel}&limit=50`;
            
        const response = await fetch(url, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            if (getNew && data.messages.length > 0) {
                // Agregar solo mensajes nuevos
                appendMessages(data.messages);
                // Actualizar último ID
                lastMessageId = Math.max(...data.messages.map(m => m.id));
                
                // Reproducir sonido de notificación si hay mensajes nuevos de otros usuarios
                const hasNewMessagesFromOthers = data.messages.some(msg => msg.user_id !== currentUser.id);
                if (hasNewMessagesFromOthers) {
                    playNotificationSound();
                }
            } else if (!getNew) {
                // Renderizar todos los mensajes
                renderMessages(data.messages);
                if (data.messages.length > 0) {
                    lastMessageId = Math.max(...data.messages.map(m => m.id));
                }
            }
        }
    } catch (error) {
        console.error('Error cargando mensajes:', error);
    }
}

function renderMessages(messages) {
    const messagesContainer = document.querySelector('.chat-messages');
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="message">
                <div class="message-content">
                    <div class="message-header">
                        <strong class="user-name">Sistema</strong>
                        <span class="timestamp">Ahora</span>
                    </div>
                    <div class="message-text">¡Bienvenido al canal! Este es el inicio de la conversación. 🎉</div>
                </div>
            </div>
        `;
        return;
    }
    
    messages.forEach(message => {
        appendMessage(message);
    });
    
    // Scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function appendMessages(messages) {
    messages.forEach(message => {
        appendMessage(message);
    });
    
    // Scroll al final
    const messagesContainer = document.querySelector('.chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function appendMessage(message) {
    const messagesContainer = document.querySelector('.chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    const messageDate = new Date(message.created_at.replace(' ', 'T'));
    const timestamp = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let messageContentHTML = formatMessageContent(message.content);

    // Si el mensaje tiene archivo adjunto
    if (message.file_url && message.file_name) {
        const fileType = message.file_type || '';
        
        if (fileType.startsWith('image/')) {
            // Mostrar imagen
            messageContentHTML += `<br><img src="${message.file_url}" alt="${message.file_name}" style="max-width: 300px; border-radius: 8px; margin-top: 8px; cursor: pointer;" onclick="window.open('${message.file_url}', '_blank')">`;
        } else if (fileType.startsWith('video/')) {
            // Mostrar video
            messageContentHTML += `<br><video controls style="max-width: 300px; border-radius: 8px; margin-top: 8px;">
                <source src="${message.file_url}" type="${fileType}">
                Tu navegador no soporta video.
            </video>`;
        } else if (fileType === 'application/pdf') {
            // Enlace para PDF
            messageContentHTML += `<br><a href="${message.file_url}" target="_blank" style="color: #00aff4;">📄 ${message.file_name}</a>`;
        } else {
            // Otros archivos
            messageContentHTML += `<br><a href="${message.file_url}" download="${message.file_name}" style="color: #00aff4;">📎 ${message.file_name}</a>`;
        }
    }

    // Si el mensaje tiene ubicación
    if (message.latitude && message.longitude) {
        const lat = parseFloat(message.latitude);
        const lng = parseFloat(message.longitude);
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        messageContentHTML += `<br><a href="${mapUrl}" target="_blank" style="color: #00aff4;">🗺️ Ver ubicación en Google Maps</a>`;
    }

    const displayName = getUserDisplayName(message.username, message.user_id, message.has_badge);
    
    messageEl.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <strong class="user-name">${displayName}</strong>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-text">${messageContentHTML}</div>
        </div>
    `;
    messagesContainer.appendChild(messageEl);
}

function formatMessageContent(content) {
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    content = content.replace(/\n/g, '<br>');
    return content;
}

function setupEventListeners() {
    const messageInput = document.querySelector('.chat-input-box input');
    const sendButton = document.querySelector('.chat-input-box button');
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    createFileInput();
    
    // Torneo
    const tournamentBtn = document.getElementById('tournament-btn');
    if (tournamentBtn) {
        tournamentBtn.addEventListener('click', () => {
            if (tournamentBtn.classList.contains('active')) {
                hideTournamentView();
                const firstGroup = document.querySelector('.server-icon[data-group-id]');
                if (firstGroup) firstGroup.click();
            } else {
                showTournamentView();
            }
        });
    }
    
    // Crear grupo
    const addGroupBtn = document.getElementById('add-group-btn');
    if (addGroupBtn) {
        addGroupBtn.addEventListener('click', showCreateGroupModal);
    }
    
    // Cerrar sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', confirmLogout);
    }
    
    // Detectar clics en grupos
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('server-icon') && e.target.dataset.groupId) {
            hideTournamentView();
        }
    });
}

async function sendMessage() {
    // Si estamos en DM, usar función de DM
    if (currentDMUser) {
        await sendDMMessage();
        return;
    }
    
    const input = document.querySelector('.chat-input-box input');
    const content = input.value.trim();
    
    if (!content || !currentChannel) return;
    
    const messageData = {
        channel_id: currentChannel,
        content: content
    };
    
    // Agregar ubicación si está preparada
    if (pendingLocation) {
        messageData.latitude = pendingLocation.latitude;
        messageData.longitude = pendingLocation.longitude;
        pendingLocation = null;
        
        const locationIcon = document.querySelector('.action-icon[onclick="prepareLocationShare()"]');
        locationIcon.classList.remove('active');
    }
    
    try {
        const response = await fetch(API_BASE + 'messages.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(messageData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            input.placeholder = `Escribe un mensaje en #${getCurrentChannelName()}...`;
            
            // Recargar mensajes inmediatamente
            await loadChannelMessages(true);
            
            showNotification('Mensaje enviado', 'success');
        } else {
            showNotification(data.error || 'Error al enviar mensaje', 'error');
        }
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        showNotification('Error de conexión', 'error');
    }
    
    // Resetear archivo si estaba preparado
    if (pendingFile) {
        pendingFile = null;
        const fileIcon = document.querySelector('.action-icon[onclick="prepareFileUpload()"]');
        fileIcon.classList.remove('active');
    }
}

function startMessagePolling() {
    // Actualizar mensajes cada 2 segundos
    messagePollingInterval = setInterval(async () => {
        if (currentChannel) {
            await loadChannelMessages(true);
        }
    }, 2000);
}

function prepareLocationShare() {
    // Si estamos en DM, usar función específica
    if (currentDMUser) {
        shareDMLocation();
        return;
    }
    
    if (!currentChannel) {
        showNotification('Selecciona un canal primero', 'error');
        return;
    }
    
    if (!navigator.geolocation) {
        showNotification('Geolocalización no soportada', 'error');
        return;
    }
    
    const input = document.querySelector('.chat-input-box input');
    const locationIcon = document.querySelector('.action-icon[onclick="prepareLocationShare()"]');
    
    if (pendingLocation) {
        pendingLocation = null;
        input.placeholder = `Escribe un mensaje en #${getCurrentChannelName()}...`;
        locationIcon.classList.remove('active');
        input.value = '';
        return;
    }
    
    showNotification('Obteniendo ubicación...', 'info');
    locationIcon.classList.add('active');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            
            pendingLocation = { latitude, longitude };
            input.placeholder = 'Ubicación preparada. Escribe un mensaje y envía...';
            input.value = '📍 Compartiendo mi ubicación';
            input.focus();
            
            showNotification('Ubicación preparada. Escribe y envía el mensaje', 'success');
        },
        (error) => {
            showNotification('Error obteniendo ubicación', 'error');
            locationIcon.classList.remove('active');
            console.error('Error de geolocalización:', error);
        }
    );
}

function prepareFileUpload() {
    // Si estamos en DM, usar función específica
    if (currentDMUser) {
        showDMFileSelector();
        return;
    }
    
    if (!currentChannel) {
        showNotification('Selecciona un canal primero', 'error');
        return;
    }
    
    const input = document.querySelector('.chat-input-box input');
    const fileIcon = document.querySelector('.action-icon[onclick="prepareFileUpload()"]');
    
    if (pendingFile) {
        pendingFile = null;
        input.placeholder = `Escribe un mensaje en #${getCurrentChannelName()}...`;
        fileIcon.classList.remove('active');
        input.value = '';
        return;
    }
    
    document.getElementById('hiddenFileInput').click();
}

function getCurrentChannelName() {
    if (!currentChannel) return '';
    
    const channelElement = document.querySelector(`[data-channel-id="${currentChannel}"]`);
    if (!channelElement) return '';
    
    return channelElement.textContent.trim().replace('#', '').replace('📋', '').trim();
}

function createFileInput() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'hiddenFileInput';
    fileInput.style.display = 'none';
    fileInput.accept = 'image/*,video/*,.pdf';
    fileInput.addEventListener('change', handleFileUpload);
    document.body.appendChild(fileInput);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !currentChannel) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showNotification('El archivo es demasiado grande (máximo 10MB)', 'error');
        event.target.value = '';
        return;
    }
    
    const fileIcon = document.querySelector('.action-icon[onclick="prepareFileUpload()"]');
    fileIcon.classList.add('active');
    
    showNotification('Subiendo archivo...', 'info');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channel_id', currentChannel);
    formData.append('content', `📎 ${file.name}`);
    
    try {
        const response = await fetch(API_BASE + 'messages.php', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Archivo subido exitosamente', 'success');
            event.target.value = '';
            fileIcon.classList.remove('active');
            
            // Recargar mensajes
            await loadChannelMessages(true);
        } else {
            showNotification(data.error || 'Error al subir archivo', 'error');
            fileIcon.classList.remove('active');
        }
    } catch (error) {
        console.error('Error subiendo archivo:', error);
        showNotification('Error de conexión', 'error');
        fileIcon.classList.remove('active');
    }
}

// Modal crear grupo
function showCreateGroupModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Crear Nuevo Grupo</h3>
            <input type="text" id="groupName" placeholder="Nombre del grupo" maxlength="50">
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelGroupBtn">Cancelar</button>
                <button class="btn btn-primary" id="createGroupBtn">Crear</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('cancelGroupBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('createGroupBtn').addEventListener('click', () => {
        createGroup();
    });
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    setTimeout(() => document.getElementById('groupName').focus(), 100);
}

async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    
    if (!groupName) {
        showNotification('El nombre del grupo es requerido', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_BASE + 'groups.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                name: groupName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Cerrar todos los modales
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
            
            showNotification('Grupo creado exitosamente', 'success');
            await loadUserGroups();
            await selectGroup(data.group_id);
        } else {
            showNotification(data.error || 'Error al crear grupo', 'error');
        }
    } catch (error) {
        console.error('Error creando grupo:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Funciones auxiliares
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background-color: #43b581;' : 
          type === 'error' ? 'background-color: #f04747;' : 
          'background-color: #7289da;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

function showGroupOptions() {
    if (!currentGroup) return;

    // Crear el modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="text-align: left;">
            <h3>Opciones de "${currentGroup.name}"</h3>
            
            <div style="margin-top: 20px;">
                <label for="inviteEmail" style="display: block; margin-bottom: 5px; color: var(--text-muted);">Invitar Miembro por Email</label>
                <div style="display: flex; gap: 10px;">
                    <input type="email" id="inviteEmail" placeholder="email@ejemplo.com" style="flex-grow: 1; padding: 8px;">
                    <button class="btn btn-primary" onclick="handleInviteMember()">Invitar</button>
                </div>
            </div>

            <div class="modal-actions" style="margin-top: 30px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function showInventory() {
    try {
        const response = await fetch(API_BASE + 'shop.php?action=purchases', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            showNotification('Error al cargar inventario', 'error');
            return;
        }
        
        const purchases = data.purchases;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h3>🎒 Mi Inventario</h3>
                <div style="margin-top: 20px;">
                    ${purchases.length === 0 ? 
                        '<p style="text-align: center; color: var(--text-muted);">No has comprado ningún artículo aún. <br>Visita la <a href="tienda.html" style="color: var(--primary-color);">Tienda del Mundial</a>.</p>' :
                        purchases.map(item => `
                            <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; margin-bottom: 10px; background: var(--background-dark);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <h4 style="margin: 0 0 5px 0;">${item.item_name}</h4>
                                        <p style="margin: 0; color: var(--text-muted); font-size: 12px;">Comprado: ${new Date(item.purchased_at).toLocaleDateString()}</p>
                                    </div>
                                    <label class="toggle-switch">
                                        <input type="checkbox" ${item.is_active ? 'checked' : ''} onchange="toggleInventoryItem(${item.id}, '${item.item_id}', this.checked)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
                <div class="modal-actions" style="margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error mostrando inventario:', error);
        showNotification('Error al cargar inventario', 'error');
    }
}

async function toggleInventoryItem(purchaseId, itemId, isActive) {
    try {
        const response = await fetch(API_BASE + 'shop.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'toggle',
                purchase_id: purchaseId,
                item_id: itemId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.is_active ? 'Artículo activado' : 'Artículo desactivado', 'success');
            
            // Recargar recompensas activas para actualizar sonido y fondo
            await loadActiveRewards();
        } else {
            showNotification(data.error || 'Error al cambiar estado', 'error');
        }
    } catch (error) {
        console.error('Error toggle item:', error);
        showNotification('Error al cambiar estado', 'error');
    }
}

async function handleInviteMember() {
    const email = document.getElementById('inviteEmail').value.trim();
    if (!email || !currentGroup) {
        showNotification('Por favor, ingresa un email válido.', 'error');
        return;
    }

    const response = await fetch(`${API_BASE}groups.php`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({ 
            action: 'invite_member', 
            group_id: currentGroup.id,
            email: email 
        })
    });

    const result = await response.json();
    if (result.success) {
        showNotification(result.message, 'success');
        document.getElementById('inviteEmail').value = ''; // Limpiar el campo de texto
    } else {
        showNotification(result.error, 'error');
    }
}

function showMembersPanel() {
    // Ya no muestra una alerta, ahora hace todo esto:
    const panel = document.querySelector('.members-panel');
    if (!panel || !currentGroupMembers) return;

    panel.classList.toggle('hidden');

    if (!panel.classList.contains('hidden')) {
        // ...y toda la lógica para crear la lista de miembros...
    }
}

function confirmLogout() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'logout-modal';
    modal.innerHTML = `
        <div class="modal-content" style="width: 400px;">
            <h3>Cerrar Sesión</h3>
            <p style="color: var(--text-muted); margin: 20px 0;">¿Estás seguro que quieres cerrar sesión?</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button class="btn btn-primary" style="background-color: #e74c3c;" onclick="logout()">Aceptar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function logout() {
    try {
        // Detener el polling de mensajes
        if (messagePollingInterval) {
            clearInterval(messagePollingInterval);
        }
        
        // Cerrar el modal de confirmación
        closeModal();
        
        // Limpiar localStorage
        localStorage.clear();
        
        // Marcar que acabamos de cerrar sesión
        sessionStorage.setItem('justLoggedOut', 'true');
        
        // Hacer la petición de logout con await para asegurar que termine
        const response = await fetch(API_BASE + 'auth.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'logout' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Redirigir después de confirmar que la sesión se cerró
            window.location.replace('login.html');
        }
        
    } catch (error) {
        console.error('Error en logout:', error);
        // Forzar cierre de sesión de todas formas
        localStorage.clear();
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.replace('login.html');
    }
}

// Funciones del torneo (mantener las mismas que tenías)
function showTournamentView() {
    const tournamentView = document.getElementById('tournament-view');
    const mainView = document.querySelector('.main-view');
    const channelsColumn = document.querySelector('.channels-column');
    const dmColumn = document.getElementById('dm-column');
    const tournamentBtn = document.getElementById('tournament-btn');
    
    console.log('Mostrando vista de torneo...');
    console.log('Tournament view:', tournamentView);
    console.log('Main view:', mainView);
    
    if (!tournamentView) {
        console.error('Tournament view not found');
        return;
    }
    
    // Ocultar la vista principal completa
    if (mainView) mainView.classList.add('d-none');
    if (channelsColumn) channelsColumn.classList.add('d-none');
    if (dmColumn) dmColumn.classList.add('d-none');
    
    // Mostrar vista de torneo
    tournamentView.classList.remove('d-none');
    console.log('Vista de torneo mostrada');
    
    // Activar botón
    if (tournamentBtn) tournamentBtn.classList.add('active');
    
    // Quitar active de otros iconos
    document.querySelectorAll('.server-icon[data-group-id]').forEach(icon => {
        icon.classList.remove('active');
    });
    document.getElementById('dm-btn')?.classList.remove('active');
    
    // Detener polling de DM si está activo
    if (typeof dmPollingInterval !== 'undefined' && dmPollingInterval) {
        clearInterval(dmPollingInterval);
        dmPollingInterval = null;
    }
    if (typeof dmRequestsPollingInterval !== 'undefined' && dmRequestsPollingInterval) {
        clearInterval(dmRequestsPollingInterval);
        dmRequestsPollingInterval = null;
    }
    
    // Inicializar torneo
    if (typeof initTournament === 'function') {
        if (typeof window.tournamentData !== 'undefined' && window.tournamentData.matches && Object.keys(window.tournamentData.matches).length === 0) {
            initTournament();
        } else if (typeof window.tournamentData === 'undefined') {
            initTournament();
        } else {
            console.log('Torneo ya inicializado');
        }
    } else {
        console.error('initTournament function not found');
    }
}

function hideTournamentView() {
    const tournamentView = document.getElementById('tournament-view');
    const mainView = document.querySelector('.main-view');
    const tournamentBtn = document.getElementById('tournament-btn');
    
    if (tournamentView) {
        tournamentView.classList.add('d-none');
    }
    if (mainView) {
        mainView.classList.remove('d-none');
    }
    if (tournamentBtn) {
        tournamentBtn.classList.remove('active');
    }
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }
});

// Estilos
if (!document.querySelector('#app-styles')) {
    const style = document.createElement('style');
    style.id = 'app-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .channel {
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            color: #b9bbbe;
            transition: all 0.2s ease;
        }
        
        .channel:hover {
            background-color: #40444b;
            color: #ffffff;
        }
        
        .channel.active {
            background-color: #40444b;
            color: #ffffff;
        }
        
        .member-item {
            transition: background-color 0.2s ease;
        }
        
        .member-item:hover {
            background-color: #40444b;
            border-radius: 4px;
        }
        
        .d-none {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

// ==================== MENSAJES DIRECTOS ====================

let currentDMUser = null;
let dmPollingInterval = null;
let dmRequestsPollingInterval = null;
let lastDMMessageId = 0;

// Configurar eventos de DM
function setupDMEvents() {
    const dmBtn = document.getElementById('dm-btn');
    const addDMBtn = document.getElementById('add-dm-btn');
    
    if (dmBtn) {
        dmBtn.addEventListener('click', toggleDMView);
    }
    
    if (addDMBtn) {
        addDMBtn.addEventListener('click', showAddDMModal);
    }
}

// Alternar vista de mensajes directos
function toggleDMView() {
    const dmColumn = document.getElementById('dm-column');
    const channelsColumn = document.querySelector('.channels-column');
    const mainView = document.querySelector('.main-view');
    const dmBtn = document.getElementById('dm-btn');
    const tournamentBtn = document.getElementById('tournament-btn');
    
    // Ocultar vista de torneo si está activa
    const tournamentView = document.getElementById('tournament-view');
    if (tournamentView && !tournamentView.classList.contains('d-none')) {
        tournamentView.classList.add('d-none');
    }
    
    // Mostrar main-view
    if (mainView) mainView.classList.remove('d-none');
    
    if (dmColumn.classList.contains('d-none')) {
        // Mostrar DMs
        dmColumn.classList.remove('d-none');
        channelsColumn.classList.add('d-none');
        dmBtn.classList.add('active');
        if (tournamentBtn) tournamentBtn.classList.remove('active');
        
        // Quitar active de todos los grupos
        document.querySelectorAll('.server-icon[data-group-id]').forEach(icon => {
            icon.classList.remove('active');
        });
        
        // Mostrar pantalla de bienvenida de DMs
        showDMWelcomeScreen();
        
        // Quitar fondo en la vista de bienvenida
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            chatMessages.style.backgroundImage = '';
        }
        
        // Cargar solicitudes y conversaciones
        loadPendingRequests();
        loadDMConversations();
        
        // Iniciar polling para actualización automática
        if (!dmRequestsPollingInterval) {
            dmRequestsPollingInterval = setInterval(() => {
                loadPendingRequests();
                loadDMConversations();
            }, 3000); // Actualizar cada 3 segundos
        }
    } else {
        // Ocultar DMs
        dmColumn.classList.add('d-none');
        channelsColumn.classList.remove('d-none');
        dmBtn.classList.remove('active');
        
        // Detener polling de DM
        if (dmPollingInterval) {
            clearInterval(dmPollingInterval);
            dmPollingInterval = null;
        }
        if (dmRequestsPollingInterval) {
            clearInterval(dmRequestsPollingInterval);
            dmRequestsPollingInterval = null;
        }
        currentDMUser = null;
    }
}

// Mostrar pantalla de bienvenida de DMs
function showDMWelcomeScreen() {
    const chatHeader = document.querySelector('.chat-header h2');
    const chatMessages = document.querySelector('.chat-messages');
    const inputBox = document.querySelector('.chat-input-box');
    
    chatHeader.textContent = '💬 Mensajes Directos';
    
    chatMessages.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">👥</div>
            <h2 style="color: var(--text-color); font-size: 24px; margin-bottom: 12px;">Mensajes Directos</h2>
            <p style="color: var(--text-muted); font-size: 16px; max-width: 400px; line-height: 1.6;">
                Agrega a tus amigos y chatea con ellos de forma privada.
                <br><br>
                Usa el botón <strong>+</strong> para enviar solicitudes de amistad por correo electrónico.
            </p>
        </div>
    `;
    
    // Ocultar completamente la barra de input
    inputBox.style.display = 'none';
    
    currentDMUser = null;
    if (dmPollingInterval) {
        clearInterval(dmPollingInterval);
        dmPollingInterval = null;
    }
}

// Cargar solicitudes pendientes
async function loadPendingRequests() {
    try {
        const response = await fetch(API_BASE + 'dms.php?action=pending_requests', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.requests) {
            renderPendingRequests(data.requests);
        }
    } catch (error) {
        console.error('Error cargando solicitudes:', error);
    }
}

function renderPendingRequests(requests) {
    const container = document.getElementById('dm-requests-section');
    
    if (requests.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="requests-header">Solicitudes Pendientes</div>';
    
    requests.forEach(req => {
        html += `
            <div class="dm-request">
                <div class="dm-avatar">${req.username.charAt(0).toUpperCase()}</div>
                <div class="dm-request-info">
                    <div class="dm-request-name">${req.username}</div>
                    <div class="dm-request-email">${req.email}</div>
                </div>
                <div class="dm-request-actions">
                    <button class="request-btn request-btn-accept" onclick="acceptRequest(${req.id}, '${req.username}')">Aceptar</button>
                    <button class="request-btn request-btn-reject" onclick="rejectRequest(${req.id})">Rechazar</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Aceptar solicitud
async function acceptRequest(requestId, username) {
    try {
        const response = await fetch(API_BASE + 'dms.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'accept_request',
                request_id: requestId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Ahora eres contacto de ${username}`, 'success');
            await loadPendingRequests();
            await loadDMConversations();
        } else {
            showNotification(data.error || 'Error al aceptar solicitud', 'error');
        }
    } catch (error) {
        console.error('Error aceptando solicitud:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Rechazar solicitud
async function rejectRequest(requestId) {
    try {
        const response = await fetch(API_BASE + 'dms.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'reject_request',
                request_id: requestId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Solicitud rechazada', 'success');
            await loadPendingRequests();
        } else {
            showNotification(data.error || 'Error al rechazar solicitud', 'error');
        }
    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Cargar lista de conversaciones
async function loadDMConversations() {
    try {
        const response = await fetch(API_BASE + 'dms.php?action=conversations', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.conversations) {
            renderDMConversations(data.conversations);
        }
    } catch (error) {
        console.error('Error cargando conversaciones:', error);
    }
}

function renderDMConversations(conversations) {
    const container = document.getElementById('dm-conversations-list');
    
    if (conversations.length === 0) {
        container.innerHTML = '<div style="padding: 12px; color: #72767d; font-size: 13px; text-align: center;">No tienes conversaciones.<br>Haz clic en + para iniciar una.</div>';
        return;
    }
    
    container.innerHTML = '';
    conversations.forEach(conv => {
        const convDiv = document.createElement('div');
        convDiv.className = 'dm-conversation';
        if (currentDMUser === conv.user_id) {
            convDiv.classList.add('active');
        }
        
        const unreadBadge = conv.unread_count > 0 
            ? `<span class="unread-badge">${conv.unread_count}</span>` 
            : '';
        
        // Desencriptar el último mensaje si está encriptado
        let lastMessage = conv.last_message || 'Sin mensajes';
        if (conv.is_encrypted && conv.last_message) {
            lastMessage = decryptMessage(conv.last_message);
        }
        
        const lastMsg = lastMessage.substring(0, 30) + (lastMessage.length > 30 ? '...' : '');
        
        convDiv.innerHTML = `
            <div class="dm-avatar">${conv.username.charAt(0).toUpperCase()}</div>
            <div class="dm-info">
                <div class="dm-name">${conv.username}</div>
                <div class="dm-last-msg">${lastMsg}</div>
            </div>
            ${unreadBadge}
        `;
        
        convDiv.addEventListener('click', () => openDMConversation(conv.user_id, conv.username));
        container.appendChild(convDiv);
    });
}

// Abrir conversación con un usuario
async function openDMConversation(userId, username) {
    currentDMUser = userId;
    currentChannel = null;
    currentGroup = null;
    lastDMMessageId = 0;
    
    // Actualizar UI - marcar conversación activa
    document.querySelectorAll('.dm-conversation').forEach(c => c.classList.remove('active'));
    const conversations = document.querySelectorAll('.dm-conversation');
    conversations.forEach(conv => {
        const avatar = conv.querySelector('.dm-name');
        if (avatar && avatar.textContent === username) {
            conv.classList.add('active');
        }
    });
    
    // Actualizar header del chat
    const chatHeader = document.querySelector('.chat-header h2');
    chatHeader.textContent = `💬 ${username}`;
    
    // Mostrar y habilitar input
    const inputBox = document.querySelector('.chat-input-box');
    const input = document.querySelector('.chat-input-box input');
    const sendBtn = document.querySelector('.chat-input-box button');
    
    inputBox.style.display = 'flex';
    input.disabled = false;
    input.placeholder = `Mensaje a ${username}...`;
    sendBtn.disabled = false;
    
    // Cargar mensajes
    await loadDMMessages();
    
    // Aplicar fondo de chat
    applyChatBackground();
    
    // Mostrar botón de videollamada
    const videoCallBtn = document.getElementById('video-call-btn');
    if (videoCallBtn) videoCallBtn.style.display = 'inline';
    
    // Iniciar polling
    if (dmPollingInterval) clearInterval(dmPollingInterval);
    dmPollingInterval = setInterval(() => loadDMMessages(true), 2000);
}

// Cargar mensajes de DM
async function loadDMMessages(polling = false) {
    if (!currentDMUser) return;
    
    try {
        const url = polling 
            ? `${API_BASE}dms.php?action=messages&user_id=${currentDMUser}&last_id=${lastDMMessageId}`
            : `${API_BASE}dms.php?action=messages&user_id=${currentDMUser}`;
            
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        
        if (data.success && data.messages) {
            if (polling && data.messages.length === 0) return;
            
            if (!polling) {
                renderDMMessages(data.messages);
            } else {
                appendDMMessages(data.messages);
                
                // Reproducir sonido de notificación si hay mensajes nuevos del otro usuario
                const hasNewMessagesFromOther = data.messages.some(msg => msg.sender_id !== currentUser.id);
                if (hasNewMessagesFromOther) {
                    playNotificationSound();
                }
            }
            
            if (data.messages.length > 0) {
                lastDMMessageId = data.messages[data.messages.length - 1].id;
            }
            
            // Recargar lista de conversaciones
            await loadDMConversations();
        }
    } catch (error) {
        console.error('Error cargando mensajes DM:', error);
    }
}

function renderDMMessages(messages) {
    const chatMessages = document.querySelector('.chat-messages');
    chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
        chatMessages.innerHTML = `
            <div class="message">
                <div class="message-content">
                    <div class="message-header">
                        <strong class="user-name">Sistema</strong>
                        <span class="timestamp">Ahora</span>
                    </div>
                    <div class="message-text">Inicio de la conversación. ¡Envía el primer mensaje! 👋</div>
                </div>
            </div>
        `;
        return;
    }
    
    messages.forEach(msg => {
        const messageDiv = createDMMessageElement(msg);
        chatMessages.appendChild(messageDiv);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendDMMessages(messages) {
    const chatMessages = document.querySelector('.chat-messages');
    
    messages.forEach(msg => {
        const messageDiv = createDMMessageElement(msg);
        chatMessages.appendChild(messageDiv);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createDMMessageElement(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    if (msg.sender_id === currentUser.id) {
        messageDiv.classList.add('own-message');
    }
    
    // Agregar clase si el mensaje está encriptado
    if (msg.is_encrypted) {
        messageDiv.classList.add('encrypted-message');
    }
    
    const time = new Date(msg.created_at).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let contentHTML = '';
    
    switch(msg.message_type) {
        case 'image':
            contentHTML = `
                <div class="message-text">${msg.file_name || 'Imagen'}</div>
                <img src="${msg.file_path}" alt="Imagen" class="message-media" onclick="window.open('${msg.file_path}', '_blank')" style="max-width: 300px; border-radius: 8px; cursor: pointer; margin-top: 8px;">
            `;
            break;
        case 'video':
            contentHTML = `
                <div class="message-text">${msg.file_name || 'Video'}</div>
                <video controls class="message-media" style="max-width: 300px; border-radius: 8px; margin-top: 8px;">
                    <source src="${msg.file_path}" type="video/mp4">
                </video>
            `;
            break;
        case 'pdf':
            contentHTML = `
                <div class="message-text">📄 ${msg.file_name || 'Documento PDF'}</div>
                <a href="${msg.file_path}" target="_blank" class="btn btn-secondary" style="margin-top: 8px; display: inline-block;">Ver PDF</a>
            `;
            break;
        case 'location':
            const mapsUrl = `https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`;
            contentHTML = `
                <div class="message-text">📍 ${msg.content}</div>
                <a href="${mapsUrl}" target="_blank" class="btn btn-secondary" style="margin-top: 8px; display: inline-block;">Ver en Google Maps</a>
                <br><small style="color: var(--text-muted);">Lat: ${msg.latitude}, Lng: ${msg.longitude}</small>
            `;
            break;
        default:
            // Desencriptar el mensaje si está encriptado
            let messageContent = msg.content;
            if (msg.is_encrypted) {
                messageContent = decryptMessage(msg.content);
            }
            contentHTML = `<div class="message-text">${messageContent}</div>`;
    }
    
    const displayName = getUserDisplayName(msg.username, msg.sender_id, msg.has_badge);
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <strong class="user-name">${displayName}</strong>
                <span class="timestamp">${time}</span>
            </div>
            ${contentHTML}
        </div>
    `;
    
    return messageDiv;
}

// Enviar mensaje DM
async function sendDMMessage() {
    if (!currentDMUser) return;
    
    const input = document.querySelector('.chat-input-box input');
    let content = input.value.trim();
    
    if (!content) return;
    
    // Encriptar mensaje si está activado
    let messageToSend = content;
    let isEncrypted = false;
    
    if (isEncryptionEnabled) {
        messageToSend = encryptMessage(content);
        isEncrypted = true;
    }
    
    try {
        const response = await fetch(API_BASE + 'dms.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'send_message',
                receiver_id: currentDMUser,
                content: messageToSend,
                is_encrypted: isEncrypted
            })
        });
        
        const text = await response.text();
        let data;
        
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('Error parseando JSON:', text);
            // Aunque haya error de parse, si el mensaje se guardó, limpiar input y recargar
            input.value = '';
            await loadDMMessages(true);
            return;
        }
        
        if (data.success) {
            input.value = '';
            await loadDMMessages(true);
        } else {
            showNotification(data.error || 'Error al enviar mensaje', 'error');
        }
    } catch (error) {
        console.error('Error enviando mensaje DM:', error);
        // Aunque haya error, intentar recargar mensajes por si se guardó
        input.value = '';
        await loadDMMessages(true);
    }
}

// Modal para agregar nuevo DM por email
function showAddDMModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Nuevo Mensaje Directo</h3>
            <p style="color: #72767d; font-size: 13px; margin-bottom: 15px;">Ingresa el correo electrónico del usuario</p>
            <input type="email" id="dmUserEmail" placeholder="usuario@ejemplo.com">
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelDMBtn">Cancelar</button>
                <button class="btn btn-primary" id="addDMUserBtn">Agregar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('cancelDMBtn').addEventListener('click', () => modal.remove());
    document.getElementById('addDMUserBtn').addEventListener('click', addDMByEmail);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    setTimeout(() => document.getElementById('dmUserEmail').focus(), 100);
}

// Agregar DM por email
// Agregar DM por email - Ahora envía solicitud
async function addDMByEmail() {
    const email = document.getElementById('dmUserEmail').value.trim();
    
    if (!email) {
        showNotification('Por favor ingresa un correo electrónico', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_BASE + `dms.php?action=find_user&email=${encodeURIComponent(email)}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            // Enviar solicitud de contacto
            const sendResponse = await fetch(API_BASE + 'dms.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'send_request',
                    receiver_id: data.user.id
                })
            });
            
            const sendData = await sendResponse.json();
            
            // Cerrar modal
            document.querySelector('.modal-overlay').remove();
            
            if (sendData.success) {
                showNotification(`Solicitud enviada a ${sendData.username}`, 'success');
            } else {
                showNotification(sendData.error || 'Error al enviar solicitud', 'error');
            }
        } else {
            showNotification(data.error || 'Usuario no encontrado', 'error');
        }
    } catch (error) {
        console.error('Error buscando usuario:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Compartir ubicación
async function shareDMLocation() {
    if (!currentDMUser) return;
    
    if (!navigator.geolocation) {
        showNotification('Tu navegador no soporta geolocalización', 'error');
        return;
    }
    
    showNotification('Obteniendo ubicación...', 'info');
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const response = await fetch(API_BASE + 'dms.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'send_location',
                    receiver_id: currentDMUser,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                })
            });
            
            const text = await response.text();
            let data;
            
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('Error parseando JSON:', text);
                await loadDMMessages(true);
                return;
            }
            
            if (data.success) {
                await loadDMMessages(true);
                showNotification('Ubicación compartida', 'success');
            } else {
                showNotification(data.error || 'Error al compartir ubicación', 'error');
            }
        } catch (error) {
            console.error('Error compartiendo ubicación:', error);
            await loadDMMessages(true);
        }
    }, (error) => {
        showNotification('No se pudo obtener la ubicación', 'error');
    });
}

// Subir archivo
async function uploadDMFile(file) {
    if (!currentDMUser) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiver_id', currentDMUser);
    
    try {
        showNotification('Subiendo archivo...', 'info');
        
        const response = await fetch(API_BASE + 'dms.php', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const text = await response.text();
        let data;
        
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('Error parseando JSON:', text);
            await loadDMMessages(true);
            return;
        }
        
        if (data.success) {
            await loadDMMessages(true);
            showNotification('Archivo enviado', 'success');
        } else {
            showNotification(data.error || 'Error al enviar archivo', 'error');
        }
    } catch (error) {
        console.error('Error subiendo archivo:', error);
        showNotification('Error al subir archivo', 'error');
    }
}

// Mostrar selector de archivos
function showDMFileSelector() {
    if (!currentDMUser) {
        showNotification('Selecciona un contacto primero', 'error');
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,.pdf';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadDMFile(file);
        }
    };
    input.click();
}

// Función para iniciar videollamada desde botón
function startVideoCall() {
    if (!currentDMUser) {
        showNotification('Selecciona una conversación primero', 'error');
        return;
    }
    
    // Obtener el username del usuario actual
    const conversations = document.querySelectorAll('.dm-conversation');
    let username = '';
    
    conversations.forEach(conv => {
        if (conv.classList.contains('active')) {
            const nameElement = conv.querySelector('.dm-name');
            if (nameElement) {
                username = nameElement.textContent;
            }
        }
    });
    
    if (!username) {
        showNotification('No se pudo obtener el nombre del usuario', 'error');
        return;
    }
    
    console.log('🎯 startVideoCall() - Username obtenido:', username, 'ID:', currentDMUser);
    
    // Llamar a la función de videocall.js
    initVideoCall(currentDMUser, username);
}

// Inicializar eventos de DM al cargar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupDMEvents, 500);
});

// =============================================
// ENCRIPTACIÓN DE MENSAJES
// =============================================

// Toggle de encriptación
function toggleEncryption() {
    isEncryptionEnabled = !isEncryptionEnabled;
    
    const toggleBtn = document.getElementById('encryption-toggle');
    if (!toggleBtn) return;
    
    if (isEncryptionEnabled) {
        toggleBtn.classList.remove('encryption-off');
        toggleBtn.classList.add('encryption-on');
        toggleBtn.textContent = '🔒';
        toggleBtn.title = 'Encriptación activada';
        showNotification('🔒 Encriptación activada', 'success');
    } else {
        toggleBtn.classList.remove('encryption-on');
        toggleBtn.classList.add('encryption-off');
        toggleBtn.textContent = '🔓';
        toggleBtn.title = 'Encriptación desactivada';
        showNotification('🔓 Encriptación desactivada', 'info');
    }
}

// Encriptar mensaje usando XOR con clave
function encryptMessage(message) {
    if (!message) return message;
    
    let encrypted = '';
    for (let i = 0; i < message.length; i++) {
        const charCode = message.charCodeAt(i);
        const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
        encrypted += String.fromCharCode(charCode ^ keyChar);
    }
    
    // Convertir a Base64 para que sea transmisible
    return btoa(encrypted);
}

// Desencriptar mensaje
function decryptMessage(encryptedMessage) {
    if (!encryptedMessage) return encryptedMessage;
    
    try {
        // Decodificar de Base64
        const encrypted = atob(encryptedMessage);
        
        let decrypted = '';
        for (let i = 0; i < encrypted.length; i++) {
            const charCode = encrypted.charCodeAt(i);
            const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
            decrypted += String.fromCharCode(charCode ^ keyChar);
        }
        
        return decrypted;
    } catch (error) {
        console.error('Error desencriptando mensaje:', error);
        return '[Mensaje encriptado - No se pudo desencriptar]';
    }
}

// =============================================
// EVENT LISTENERS PARA PREDICCIONES
// =============================================

// Conectar event listeners cuando se muestra la vista de torneo
function setupPredictionsListeners() {
    // Botones de navegación de jornada (predicciones)
    const prevPredictionBtn = document.querySelector('.jornada-nav button:first-child');
    const nextPredictionBtn = document.querySelector('.jornada-nav button:last-child');
    
    if (prevPredictionBtn && !prevPredictionBtn.hasAttribute('data-listener')) {
        prevPredictionBtn.addEventListener('click', () => changePredictionJornada(-1));
        prevPredictionBtn.setAttribute('data-listener', 'true');
    }
    
    if (nextPredictionBtn && !nextPredictionBtn.hasAttribute('data-listener')) {
        nextPredictionBtn.addEventListener('click', () => changePredictionJornada(1));
        nextPredictionBtn.setAttribute('data-listener', 'true');
    }
    
    // Botón de guardar predicciones
    const submitBtn = document.getElementById('submit-predictions-btn');
    if (submitBtn && !submitBtn.hasAttribute('data-listener')) {
        submitBtn.addEventListener('click', submitPredictions);
        submitBtn.setAttribute('data-listener', 'true');
    }
    
    // Botones de navegación de leaderboard
    const prevLeaderboardBtn = document.querySelectorAll('.leaderboard-jornada-nav button')[0];
    const nextLeaderboardBtn = document.querySelectorAll('.leaderboard-jornada-nav button')[1];
    
    if (prevLeaderboardBtn && !prevLeaderboardBtn.hasAttribute('data-listener')) {
        prevLeaderboardBtn.addEventListener('click', () => changeLeaderboardJornada(-1));
        prevLeaderboardBtn.setAttribute('data-listener', 'true');
    }
    
    if (nextLeaderboardBtn && !nextLeaderboardBtn.hasAttribute('data-listener')) {
        nextLeaderboardBtn.addEventListener('click', () => changeLeaderboardJornada(1));
        nextLeaderboardBtn.setAttribute('data-listener', 'true');
    }
    
    console.log('✅ Event listeners de predicciones configurados');
}

// Inicializar cuando se muestre la pestaña de predicciones
document.addEventListener('DOMContentLoaded', () => {
    // Observer para detectar cuando se muestra la vista de torneo
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const target = mutation.target;
            
            if (target.id === 'tab-predictions' && target.classList.contains('active')) {
                loadPredictions();
                setupPredictionsListeners();
            }
            if (target.id === 'tab-leaderboard' && target.classList.contains('active')) {
                loadLeaderboard();
                setupPredictionsListeners();
            }
        });
    });
    
    const predictionsTab = document.getElementById('tab-predictions');
    const leaderboardTab = document.getElementById('tab-leaderboard');
    
    if (predictionsTab) {
        observer.observe(predictionsTab, { attributes: true, attributeFilter: ['class'] });
        
        // Si ya está activo al cargar
        if (predictionsTab.classList.contains('active')) {
            loadPredictions();
            setupPredictionsListeners();
        }
    }
    
    if (leaderboardTab) {
        observer.observe(leaderboardTab, { attributes: true, attributeFilter: ['class'] });
    }
});