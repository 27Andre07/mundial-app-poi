const API_BASE = 'api/';

// Variables globales
let currentUser = null;
let currentGroup = null;
let currentChannel = null;
let messagePollingInterval = null;
let lastMessageId = 0;

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
        await loadUserGroups();
        startMessagePolling();
        
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        window.location.href = 'login.html';
    }
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
    
    // Actualizar estado visual
    document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
    document.querySelector(`[data-channel-id="${channelId}"]`)?.classList.add('active');
    
    // Cargar mensajes del canal
    await loadChannelMessages();
    
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
    const messageDate = new Date(message.created_at);
    const timestamp = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let messageContentHTML = formatMessageContent(message.content);

    // --- LÓGICA NUEVA ---
    // Si el mensaje tiene datos de archivo (file_data)
    if (message.file_data && message.file_type) {
        // Construye una URL de datos a partir de la información Base64
        const dataUrl = `data:${message.file_type};base64,${message.file_data}`;
        
        // Si es una imagen, muestra una etiqueta <img>
        if (message.file_type.startsWith('image/')) {
            messageContentHTML += `<br><img src="${dataUrl}" alt="${message.file_name}" style="max-width: 300px; border-radius: 8px; margin-top: 8px;">`;
        } else {
        // Si es otro tipo de archivo, muestra un enlace de descarga
            messageContentHTML += `<br><a href="${dataUrl}" download="${message.file_name}">📎 Descargar: ${message.file_name}</a>`;
        }
    }

    messageEl.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <strong class="user-name">${message.username}</strong>
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
    
    // Detectar clics en grupos
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('server-icon') && e.target.dataset.groupId) {
            hideTournamentView();
        }
    });
}

async function sendMessage() {
    const input = document.querySelector('.chat-input-box input');
    const content = input.value.trim();
    
    if (!content || !currentChannel) return;
    
    const messageData = {
        channel_id: currentChannel,
        content: content
    };
    
    // Agregar ubicación si está preparada
    if (pendingLocation) {
        messageData.location = pendingLocation;
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

// Variables para ubicación y archivos
let pendingLocation = null;
let pendingFile = null;

function prepareLocationShare() {
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
    fileInput.accept = 'image/*,video/*,.txt,.pdf,.doc,.docx';
    fileInput.addEventListener('change', handleFileUpload);
    document.body.appendChild(fileInput);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !currentChannel) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('El archivo es demasiado grande (máximo 5MB)', 'error');
        event.target.value = '';
        return;
    }
    
    const fileIcon = document.querySelector('.action-icon[onclick="prepareFileUpload()"]');
    fileIcon.classList.add('active');
    
    showNotification('Subiendo archivo...', 'info');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channel_id', currentChannel);
    
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
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="createGroup()">Crear</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
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
            closeModal();
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

async function logout() {
    try {
        await fetch(API_BASE + 'auth.php?action=logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error:', error);
    }
    
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Funciones del torneo (mantener las mismas que tenías)
function showTournamentView() {
    showNotification('Torneo - Próximamente', 'info');
}

function hideTournamentView() {
    const tournamentView = document.getElementById('tournament-view');
    if (tournamentView) {
        tournamentView.classList.add('d-none');
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