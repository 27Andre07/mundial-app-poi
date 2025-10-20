const API_BASE = '../api/';

document.addEventListener('DOMContentLoaded', () => {
    // Cargar datos del usuario y sus puntos
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        // Si no hay usuario, redirigir al login
        window.location.href = 'login.html';
        return;
    }

    // Función para calcular y mostrar los puntos
    function updateUserPoints() {
        const rewards = JSON.parse(localStorage.getItem('rewards') || '[]');
        const purchases = JSON.parse(localStorage.getItem('purchases') || '[]');

        const totalPointsEarned = rewards
            .filter(r => r.userId === currentUser.id)
            .reduce((sum, r) => sum + r.points, 0);

        const totalPointsSpent = purchases
            .filter(p => p.userId === currentUser.id)
            .reduce((sum, p) => sum + p.price, 0);

        const currentPoints = totalPointsEarned - totalPointsSpent;
        
        document.getElementById('user-points-display').textContent = currentPoints;
        return currentPoints;
    }

    // Función para manejar la compra de un artículo
    function handlePurchase(event) {
        const buyButton = event.target;
        if (!buyButton.classList.contains('buy-btn')) return;

        const shopItem = buyButton.closest('.shop-item');
        const itemId = shopItem.dataset.itemId;
        const price = parseInt(shopItem.dataset.price, 10);
        const itemName = shopItem.querySelector('h3').textContent;
        
        const currentPoints = updateUserPoints();

        if (currentPoints < price) {
            alert('¡No tienes suficientes puntos para comprar este artículo!');
            return;
        }

        if (confirm(`¿Estás seguro de que quieres comprar "${itemName}" por ${price} puntos?`)) {
            // Registrar la compra
            const purchases = JSON.parse(localStorage.getItem('purchases') || '[]');
            const newPurchase = {
                purchaseId: 'purchase_' + Date.now(),
                userId: currentUser.id,
                itemId: itemId,
                itemName: itemName,
                price: price,
                purchasedAt: new Date().toISOString()
            };
            purchases.push(newPurchase);
            localStorage.setItem('purchases', JSON.stringify(purchases));

            // Agregar al inventario del usuario
            const inventory = JSON.parse(localStorage.getItem('userInventory') || '[]');
            inventory.push(newPurchase);
            localStorage.setItem('userInventory', JSON.stringify(inventory));

            // Actualizar puntos y mostrar confirmación
            updateUserPoints();
            alert(`¡Felicidades! Has comprado "${itemName}".`);
            checkInventory(); // Actualizar estado de los botones
        }
    }

    // Función para revisar el inventario y deshabilitar botones de artículos ya comprados
    function checkInventory() {
        const inventory = JSON.parse(localStorage.getItem('userInventory') || '[]');
        const purchasedItemIds = inventory.map(item => item.itemId);

        document.querySelectorAll('.shop-item').forEach(item => {
            const itemId = item.dataset.itemId;
            const buyButton = item.querySelector('.buy-btn');
            
            if (purchasedItemIds.includes(itemId)) {
                buyButton.textContent = 'Adquirido';
                buyButton.disabled = true;
            }
        });
    }

    // Inicialización
    updateUserPoints();
    checkInventory();
    
    // Añadir el listener de clics a la cuadrícula de la tienda
    document.querySelector('.shop-grid').addEventListener('click', handlePurchase);
});