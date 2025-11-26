const API_BASE = 'api/';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Verificar si ya está autenticado
    checkAuthentication();

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

async function checkAuthentication() {
    // No verificar autenticación si venimos de un logout
    const justLoggedOut = sessionStorage.getItem('justLoggedOut');
    if (justLoggedOut) {
        sessionStorage.removeItem('justLoggedOut');
        return;
    }
    
    try {
        const response = await fetch(API_BASE + 'auth.php?action=check', {
            credentials: 'include' // Importante para enviar cookies de sesión
        });
        const data = await response.json();
        
        if (data.authenticated && !window.location.href.includes('app.html')) {
            window.location.href = 'app.html';
        }
    } catch (error) {
        console.log('Error verificando autenticación:', error);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('Por favor, completa todos los campos', 'error');
        return;
    }

    try {
        const response = await fetch(API_BASE + 'auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'login',
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            // Guardar también en localStorage para compatibilidad
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            showMessage('Inicio de sesión exitoso', 'success');
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 1000);
        } else {
            showMessage(data.error || 'Error al iniciar sesión', 'error');
        }
    } catch (error) {
        showMessage('Error de conexión con el servidor', 'error');
        console.error('Error:', error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !email || !password) {
        showMessage('Por favor, completa todos los campos', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        const response = await fetch(API_BASE + 'auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'register',
                username: username,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showMessage(data.error || 'Error al registrarse', 'error');
        }
    } catch (error) {
        showMessage('Error de conexión con el servidor', 'error');
        console.error('Error:', error);
    }
}

function showMessage(message, type) {
    // Remover mensaje anterior si existe
    const existingMessage = document.querySelector('.auth-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Crear nuevo mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background-color: #43b581;' : 'background-color: #f04747;'}
    `;

    document.body.appendChild(messageDiv);

    // Remover mensaje después de 4 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 4000);
}

// Función para cerrar sesión
async function logout() {
    try {
        await fetch(API_BASE + 'auth.php?action=logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = 'login.html';
    }
}

// Agregar estilos CSS para la animación
if (!document.querySelector('#auth-styles')) {
    const style = document.createElement('style');
    style.id = 'auth-styles';
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
    `;
    document.head.appendChild(style);
}