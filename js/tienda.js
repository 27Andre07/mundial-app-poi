const API_BASE = 'api/';

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación y cargar puntos desde el servidor
    await checkAuthAndLoadPoints();

    // Función para verificar autenticación y cargar puntos desde la BD
    async function checkAuthAndLoadPoints() {
        try {
            const response = await fetch(API_BASE + 'auth.php?action=check', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (!data.authenticated) {
                window.location.href = 'login.html';
                return;
            }

            // Mostrar los puntos del usuario desde la base de datos
            document.getElementById('user-points-display').textContent = data.user.points || 0;
            
            // Guardar usuario actual
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            window.location.href = 'login.html';
        }
    }

    // Función para actualizar los puntos del usuario desde el servidor
    async function updateUserPoints() {
        try {
            const response = await fetch(API_BASE + 'auth.php?action=check', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.authenticated) {
                const currentPoints = data.user.points || 0;
                document.getElementById('user-points-display').textContent = currentPoints;
                return currentPoints;
            }
        } catch (error) {
            console.error('Error actualizando puntos:', error);
        }
        return 0;
    }

    // Función para manejar la compra de un artículo
    async function handlePurchase(event) {
        const buyButton = event.target;
        if (!buyButton.classList.contains('buy-btn')) return;

        const shopItem = buyButton.closest('.shop-item');
        const itemId = shopItem.dataset.itemId;
        const price = parseInt(shopItem.dataset.price, 10);
        const itemName = shopItem.querySelector('h3').textContent;
        
        const currentPoints = await updateUserPoints();

        if (currentPoints < price) {
            alert('¡No tienes suficientes puntos para comprar este artículo!');
            return;
        }

        if (confirm(`¿Estás seguro de que quieres comprar "${itemName}" por ${price} puntos?`)) {
            try {
                const response = await fetch(API_BASE + 'shop.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        action: 'purchase',
                        item_id: itemId,
                        item_name: itemName,
                        price: price
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(`¡Felicidades! Has comprado "${itemName}".`);
                    document.getElementById('user-points-display').textContent = data.new_points;
                    buyButton.textContent = 'Comprado ✓';
                    buyButton.disabled = true;
                    buyButton.style.backgroundColor = '#4caf50';
                } else {
                    alert(data.error || 'Error al realizar la compra');
                }
            } catch (error) {
                console.error('Error comprando artículo:', error);
                alert('Error al procesar la compra');
            }
        }
    }

    // Función para revisar el inventario y deshabilitar botones de artículos ya comprados
    async function checkInventory() {
        try {
            const response = await fetch(API_BASE + 'shop.php?action=purchases', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                const purchases = data.purchases;
                purchases.forEach(purchase => {
                    const shopItem = document.querySelector(`[data-item-id="${purchase.item_id}"]`);
                    if (shopItem) {
                        const buyButton = shopItem.querySelector('.buy-btn');
                        buyButton.textContent = 'Comprado ✓';
                        buyButton.disabled = true;
                        buyButton.style.backgroundColor = '#4caf50';
                    }
                });
            }
        } catch (error) {
            console.error('Error cargando inventario:', error);
        }
    }

    // Inicialización
    checkInventory();
    
    // Añadir el listener de clics a la cuadrícula de la tienda
    document.querySelector('.shop-grid').addEventListener('click', handlePurchase);
});