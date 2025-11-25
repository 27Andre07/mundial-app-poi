// =============================================
// VIDEOLLAMADAS CON SIMPLE-PEER Y SOCKET.IO
// Mundial App - POI 2025
// =============================================

// Conexión a Socket.IO
const socket = io('https://mundialpoi-ws.ngrok.app');

// Variables globales de videollamada
let localStream = null;
let screenStream = null;
let peer = null;
let currentCallUserId = null;
let currentCallUsername = null;
let isCallActive = false;
let isMicMuted = false;
let isCameraOff = false;

// Registrar usuario al conectar Socket.IO
socket.on('connect', () => {
    console.log('✅ Conectado a Socket.IO');
    if (currentUser && currentUser.id) {
        socket.emit('register', currentUser.id);
    }
});

socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión Socket.IO:', error);
    console.log('💡 Asegúrate de que el servidor esté corriendo: node server.js');
});

// Verificar disponibilidad de getUserMedia al cargar
(async function checkMediaDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ Tu navegador no soporta getUserMedia');
        console.log('💡 Usa Chrome, Firefox, Edge o Safari actualizado');
        return;
    }
    
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some(d => d.kind === 'videoinput');
        const hasAudio = devices.some(d => d.kind === 'audioinput');
        
        console.log('🎥 Dispositivos disponibles:');
        console.log(`   📹 Cámara: ${hasVideo ? '✅' : '❌'}`);
        console.log(`   🎤 Micrófono: ${hasAudio ? '✅' : '❌'}`);
        
        if (!hasVideo && !hasAudio) {
            console.warn('⚠️ No se detectaron dispositivos de audio/video');
        }
    } catch (error) {
        console.error('❌ Error al verificar dispositivos:', error);
    }
})();

// Inicializar videollamada
async function initVideoCall(userId, username) {
    if (isCallActive) {
        showNotification('Ya hay una llamada en curso', 'error');
        return;
    }

    try {
        currentCallUserId = userId;
        currentCallUsername = username;
        
        console.log('📞 Iniciando llamada a:', username, 'ID:', userId);
        
        // Resetear estado de botones
        isMicMuted = false;
        isCameraOff = false;
        updateCallControls();
        
        // Verificar soporte de getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Tu navegador no soporta acceso a cámara/micrófono');
        }
        
        // Obtener stream local (cámara y micrófono)
        console.log('🎥 Solicitando acceso a cámara y micrófono...');
        
        try {
            // Intentar con video y audio
            localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });
        } catch (videoError) {
            console.warn('⚠️ No se pudo obtener video, intentando solo audio...', videoError);
            // Si falla, intentar solo con audio
            localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });
            showNotification('Llamada iniciada solo con audio (sin video)', 'info');
        }

        console.log('✅ Acceso a medios concedido');
        
        // Verificar si hay video
        const hasVideo = localStream.getVideoTracks().length > 0;
        
        // Mostrar video local
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        
        // Si no hay video, mostrar avatar y ocultar botones de video
        if (!hasVideo) {
            localVideo.parentElement.classList.add('audio-only');
            const toggleCameraBtn = document.getElementById('toggle-camera');
            const shareScreenBtn = document.querySelector('.call-controls button[onclick="shareScreen()"]');
            if (toggleCameraBtn) toggleCameraBtn.style.display = 'none';
            if (shareScreenBtn) shareScreenBtn.style.display = 'none';
        }
        
        // Marcar como cargado cuando el video empieza a reproducirse
        localVideo.onloadedmetadata = () => {
            localVideo.parentElement.classList.add('loaded');
        };
        
        // Crear peer como iniciador
        peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: localStream
        });

        // Cuando se genera la señal, enviarla al otro usuario
        peer.on('signal', (signal) => {
            socket.emit('call-user', {
                to: userId,
                from: currentUser.id,
                signal: signal,
                callerName: currentUser.username
            });
            console.log('📞 Señal de llamada enviada a', username);
        });

        // Cuando llega el stream remoto
        peer.on('stream', (remoteStream) => {
            const remoteVideo = document.getElementById('remote-video');
            const remoteWrapper = document.getElementById('remote-video-wrapper');
            const remoteUserName = document.getElementById('remote-user-name');
            
            if (remoteVideo) {
                remoteVideo.srcObject = remoteStream;
                console.log('📹 Stream remoto recibido');
                
                // Verificar si tiene video
                const hasVideo = remoteStream.getVideoTracks().length > 0;
                if (!hasVideo) {
                    remoteWrapper.classList.add('audio-only');
                }
                
                // Marcar como cargado cuando el video empieza a reproducirse
                remoteVideo.onloadedmetadata = () => {
                    remoteWrapper.classList.add('loaded');
                };
            }
            if (remoteWrapper) {
                remoteWrapper.style.display = 'block';
            }
            if (remoteUserName) {
                remoteUserName.textContent = username;
            }
        });

        peer.on('error', (err) => {
            console.error('❌ Error en peer:', err);
            endCall();
        });

        peer.on('close', () => {
            console.log('📴 Conexión peer cerrada');
            endCall();
        });

        // Mostrar modal de llamada
        showCallModal(username, 'calling');
        isCallActive = true;

    } catch (error) {
        console.error('❌ Error al iniciar videollamada:', error);
        
        let errorMessage = 'No se pudo acceder a la cámara/micrófono';
        
        // Mensajes específicos según el tipo de error
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = '⛔ Permisos denegados. Por favor, permite el acceso a cámara y micrófono';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = '📹 No se encontró cámara o micrófono conectado';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = '⚠️ La cámara/micrófono está siendo usado por otra aplicación';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = '⚙️ La configuración de video no es soportada';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = '🌐 Tu navegador no soporta videollamadas';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
        endCall();
    }
}

// Recibir llamada entrante
socket.on('incoming-call', async ({ from, signal, callerName }) => {
    console.log('📞 Llamada entrante de:', callerName, 'ID:', from);
    
    if (isCallActive) {
        // Rechazar automáticamente si ya hay una llamada
        socket.emit('reject-call', { to: from });
        return;
    }

    currentCallUserId = from;
    currentCallUsername = callerName;
    
    console.log('💾 Guardado currentCallUsername:', currentCallUsername);

    // Mostrar notificación de llamada entrante
    showIncomingCallModal(from, callerName, signal);
});

// Aceptar llamada entrante
async function acceptIncomingCall(callerSignal) {
    try {
        // Resetear estado de botones
        isMicMuted = false;
        isCameraOff = false;
        updateCallControls();
        
        // Obtener stream local
        console.log('🎥 Solicitando acceso a cámara y micrófono...');
        
        try {
            // Intentar con video y audio
            localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });
        } catch (videoError) {
            console.warn('⚠️ No se pudo obtener video, intentando solo audio...', videoError);
            // Si falla, intentar solo con audio
            localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });
            showNotification('Llamada aceptada solo con audio (sin video)', 'info');
        }

        // Verificar si hay video
        const hasVideo = localStream.getVideoTracks().length > 0;
        
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        
        // Si no hay video, mostrar avatar y ocultar botones de video
        if (!hasVideo) {
            localVideo.parentElement.classList.add('audio-only');
            const toggleCameraBtn = document.getElementById('toggle-camera');
            const shareScreenBtn = document.querySelector('.call-controls button[onclick="shareScreen()"]');
            if (toggleCameraBtn) toggleCameraBtn.style.display = 'none';
            if (shareScreenBtn) shareScreenBtn.style.display = 'none';
        }
        
        // Marcar como cargado cuando el video empieza a reproducirse
        localVideo.onloadedmetadata = () => {
            localVideo.parentElement.classList.add('loaded');
        };

        // Crear peer como receptor
        peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: localStream
        });

        // Procesar señal del llamante
        peer.signal(callerSignal);

        // Generar respuesta
        peer.on('signal', (signal) => {
            socket.emit('accept-call', {
                to: currentCallUserId,
                signal: signal
            });
            console.log('✅ Llamada aceptada, señal enviada');
        });

        // Stream remoto
        peer.on('stream', (remoteStream) => {
            const remoteVideo = document.getElementById('remote-video');
            const remoteWrapper = document.getElementById('remote-video-wrapper');
            const remoteUserName = document.getElementById('remote-user-name');
            
            if (remoteVideo) {
                remoteVideo.srcObject = remoteStream;
                console.log('📹 Stream remoto recibido');
                
                // Verificar si tiene video
                const hasVideo = remoteStream.getVideoTracks().length > 0;
                if (!hasVideo) {
                    remoteWrapper.classList.add('audio-only');
                }
                
                // Marcar como cargado cuando el video empieza a reproducirse
                remoteVideo.onloadedmetadata = () => {
                    remoteWrapper.classList.add('loaded');
                };
            }
            if (remoteWrapper) {
                remoteWrapper.style.display = 'block';
            }
            if (remoteUserName) {
                console.log('🏷️ Mostrando nombre remoto:', currentCallUsername);
                remoteUserName.textContent = currentCallUsername || 'Usuario';
            }
        });

        peer.on('error', (err) => {
            console.error('❌ Error en peer:', err);
            endCall();
        });

        peer.on('close', () => {
            console.log('📴 Conexión peer cerrada');
            endCall();
        });

        isCallActive = true;
        showCallModal(currentCallUsername, 'active');

    } catch (error) {
        console.error('❌ Error al aceptar llamada:', error);
        
        let errorMessage = 'No se pudo acceder a la cámara/micrófono';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = '⛔ Permisos denegados. Por favor, permite el acceso a cámara y micrófono';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = '📹 No se encontró cámara o micrófono conectado';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = '⚠️ La cámara/micrófono está siendo usado por otra aplicación';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
        rejectCall();
    }
}

// Llamada aceptada (para el iniciador)
socket.on('call-accepted', (signal) => {
    console.log('✅ Llamada aceptada por el otro usuario');
    if (peer) {
        peer.signal(signal);
        showCallModal(null, 'active');
    }
});

// Llamada rechazada
socket.on('call-rejected', () => {
    showNotification('Llamada rechazada', 'error');
    endCall();
});

// Llamada terminada por el otro usuario
socket.on('call-ended', () => {
    showNotification('Llamada finalizada', 'info');
    endCall();
});

// Usuario desconectado
socket.on('user-disconnected', (userId) => {
    if (userId === currentCallUserId && isCallActive) {
        showNotification('El usuario se desconectó', 'error');
        endCall();
    }
});

// Rechazar llamada
function rejectCall() {
    if (currentCallUserId) {
        socket.emit('reject-call', { to: currentCallUserId });
    }
    endCall();
}

// Terminar llamada
function endCall() {
    // Notificar al otro usuario
    if (currentCallUserId && isCallActive) {
        socket.emit('end-call', { to: currentCallUserId });
    }

    // Detener streams
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Detener compartir pantalla si está activo
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        console.log('🚫 Compartir pantalla detenido');
    }

    // Cerrar peer
    if (peer) {
        peer.destroy();
        peer = null;
    }

    // Resetear videos
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    const remoteWrapper = document.getElementById('remote-video-wrapper');
    const toggleCameraBtn = document.getElementById('toggle-camera');
    const shareScreenBtn = document.querySelector('.call-controls button[onclick="shareScreen()"]');
    
    if (localVideo) {
        localVideo.srcObject = null;
        localVideo.parentElement.classList.remove('loaded', 'audio-only');
    }
    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }
    if (remoteWrapper) {
        remoteWrapper.style.display = 'none';
        remoteWrapper.classList.remove('loaded', 'audio-only');
    }
    if (toggleCameraBtn) {
        toggleCameraBtn.style.display = '';
    }
    if (shareScreenBtn) {
        shareScreenBtn.style.display = '';
    }

    // Resetear estado
    isCallActive = false;
    currentCallUserId = null;
    currentCallUsername = null;
    isMicMuted = false;
    isCameraOff = false;

    // Cerrar modal
    const modal = document.getElementById('video-call-modal');
    if (modal) modal.style.display = 'none';

    const incomingModal = document.getElementById('incoming-call-modal');
    if (incomingModal) incomingModal.style.display = 'none';

    console.log('📴 Llamada terminada');
}

// Actualizar iconos de controles según estado
function updateCallControls() {
    const micBtn = document.getElementById('toggle-mic');
    const camBtn = document.getElementById('toggle-camera');
    
    if (micBtn) {
        micBtn.textContent = isMicMuted ? '🔇' : '🎤';
        micBtn.title = isMicMuted ? 'Activar micrófono' : 'Silenciar';
    }
    
    if (camBtn) {
        camBtn.textContent = isCameraOff ? '📷' : '📹';
        camBtn.title = isCameraOff ? 'Activar cámara' : 'Desactivar cámara';
    }
}

// Toggle micrófono
function toggleMic() {
    if (!localStream) {
        console.warn('⚠️ No hay stream local activo');
        return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        isMicMuted = !audioTrack.enabled;

        const micBtn = document.getElementById('toggle-mic');
        if (micBtn) {
            micBtn.textContent = isMicMuted ? '🔇' : '🎤';
            micBtn.title = isMicMuted ? 'Activar micrófono' : 'Silenciar';
        }
    }
}

// Toggle cámara
function toggleCamera() {
    if (!localStream) {
        console.warn('⚠️ No hay stream local activo');
        return;
    }

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        isCameraOff = !videoTrack.enabled;

        const camBtn = document.getElementById('toggle-camera');
        if (camBtn) {
            camBtn.textContent = isCameraOff ? '📷' : '📹';
            camBtn.title = isCameraOff ? 'Activar cámara' : 'Desactivar cámara';
        }
    }
}

// Compartir pantalla
async function shareScreen() {
    if (!peer || !isCallActive) {
        showNotification('No hay llamada activa', 'error');
        return;
    }
    
    // Verificar si hay video local
    if (!localStream || localStream.getVideoTracks().length === 0) {
        showNotification('Compartir pantalla solo está disponible con cámara activa', 'info');
        return;
    }

    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Buscar sender de video existente
        const videoSender = peer._pc.getSenders().find(s => s.track && s.track.kind === 'video');
        
        if (videoSender) {
            // Reemplazar track de cámara con pantalla
            await videoSender.replaceTrack(screenTrack);
            console.log('📺 Compartiendo pantalla');
            
            // Mostrar pantalla en el video local también
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = screenStream;
            }
            
            // Cuando se detiene compartir pantalla
            screenTrack.onended = async () => {
                const localVideoTrack = localStream?.getVideoTracks()[0];
                if (localVideoTrack && videoSender) {
                    await videoSender.replaceTrack(localVideoTrack);
                    console.log('📹 Volviendo a cámara local');
                }
                
                // Restaurar video local a la cámara
                if (localVideo && localStream) {
                    localVideo.srcObject = localStream;
                }
                
                screenStream = null;
            };
            
            showNotification('Compartiendo pantalla', 'success');
        } else {
            showNotification('No se pudo iniciar compartir pantalla', 'error');
        }

    } catch (error) {
        console.error('Error al compartir pantalla:', error);
        if (error.name === 'NotAllowedError') {
            showNotification('Permiso denegado para compartir pantalla', 'error');
        } else {
            showNotification('No se pudo compartir la pantalla', 'error');
        }
    }
}

// Mostrar modal de llamada
function showCallModal(username, status) {
    const modal = document.getElementById('video-call-modal');
    const statusText = document.getElementById('call-room-name');
    const controlsDiv = document.querySelector('.call-controls');

    if (!modal) return;

    modal.style.display = 'flex';

    if (status === 'calling') {
        if (statusText) statusText.textContent = `Llamando a ${username}...`;
        if (controlsDiv) controlsDiv.style.display = 'none';
    } else if (status === 'active') {
        if (statusText) statusText.textContent = username ? `En llamada con ${username}` : 'En llamada';
        if (controlsDiv) controlsDiv.style.display = 'flex';
    }
}

// Mostrar modal de llamada entrante
function showIncomingCallModal(callerId, callerName, callerSignal) {
    const modal = document.getElementById('incoming-call-modal');
    const callerNameElement = document.getElementById('caller-name');
    const acceptBtn = document.getElementById('accept-call-btn');
    const rejectBtn = document.getElementById('reject-call-btn');

    if (!modal) return;

    callerNameElement.textContent = callerName;
    modal.style.display = 'flex';

    // Event listeners (remover anteriores)
    const newAcceptBtn = acceptBtn.cloneNode(true);
    const newRejectBtn = rejectBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    rejectBtn.parentNode.replaceChild(newRejectBtn, rejectBtn);

    newAcceptBtn.onclick = () => {
        modal.style.display = 'none';
        acceptIncomingCall(callerSignal);
    };

    newRejectBtn.onclick = () => {
        modal.style.display = 'none';
        rejectCall();
    };
}

// Alias para compatibilidad con código anterior
function endVideoCall() {
    endCall();
}

console.log('📹 Módulo de videollamadas SimplePeer cargado');
