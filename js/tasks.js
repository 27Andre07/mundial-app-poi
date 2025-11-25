// Variable para almacenar los miembros del grupo actual, la llenaremos desde app.js
let currentGroupMembers = [];

// Muestra el gestor de tareas
async function showTasksManager() {
    if (!currentGroup) {
        showNotification('Selecciona un grupo primero', 'error');
        return;
    }

    // Obtener los miembros del grupo actual para usarlos en los dropdowns
    currentGroupMembers = await getGroupMembers(currentGroup.id);
    const tasks = await getGroupTasks(currentGroup.id);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'tasks-modal';
    modal.innerHTML = `
        <div class="modal-content" style="width: 800px; max-width: 90vw;">
            <h3>Gestión de Tareas - ${currentGroup.name}</h3>
            
            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" onclick="showCreateTaskForm()">+ Nueva Tarea</button>
            </div>
            
            <div id="tasksContainer" style="max-height: 400px; overflow-y: auto;">
                ${renderTasksList(tasks)}
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Obtiene los miembros de un grupo desde la API
async function getGroupMembers(groupId) {
    try {
        const response = await fetch(`${API_BASE}groups.php?group_id=${groupId}`);
        const data = await response.json();
        if (data.success) {
            return data.members || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching members:', error);
        return [];
    }
}


// Obtiene las tareas de un grupo desde la API
async function getGroupTasks(groupId) {
    try {
        const response = await fetch(`${API_BASE}tasks.php?group_id=${groupId}`);
        const data = await response.json();
        if (data.success) {
            return data.tasks;
        } else {
            showNotification(data.error || 'Error al cargar tareas', 'error');
            return [];
        }
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

// Dibuja la lista de tareas en el HTML
function renderTasksList(tasks) {
    if (tasks.length === 0) {
        return `<div style="text-align: center; padding: 40px; color: #b9bbbe;"><p>No hay tareas en este grupo. ¡Crea una para empezar!</p></div>`;
    }

    return tasks.map(task => {
        // Solo el creador de la tarea puede completarla/reabrirla, editarla y eliminarla
        const isCreator = task.assigned_by == currentUser.id;
        
        const completeButton = isCreator 
            ? `<button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="changeTaskStatus('${task.id}', '${task.status === 'completed' ? 'pending' : 'completed'}')">${task.status === 'completed' ? '↶ Reabrir' : '✓ Completar'}</button>`
            : '';
        
        const editButton = isCreator
            ? `<button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="showEditTaskForm('${task.id}')">✏️ Editar</button>`
            : '';
            
        const deleteButton = isCreator
            ? `<button class="btn" style="padding: 5px 10px; font-size: 12px; background: #f04747;" onclick="deleteTask('${task.id}')">🗑️ Eliminar</button>`
            : '';
        
        return `
            <div class="task-item" style="border: 1px solid #40444b; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: ${task.status === 'completed' ? '#2f4b26' : '#40444b'};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0; ${task.status === 'completed' ? 'text-decoration: line-through;' : ''}">${task.title}</h4>
                        <p style="margin: 5px 0; color: #b9bbbe; font-size: 14px;">${task.description || ''}</p>
                        <div style="font-size: 12px; color: #72767d; margin-top: 10px;">
                            <span>📅 Límite: ${new Date(task.due_date).toLocaleDateString()}</span> | 
                            <span>👤 Asignada a: ${task.assigned_to_username || 'Nadie'}</span> |
                            <span>👨‍💼 Creada por: ${task.created_by_username || 'Desconocido'}</span> |
                            <span style="color: ${getStatusColor(task.status)}; font-weight: bold;">● ${task.status}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        ${completeButton}
                        ${editButton}
                        ${deleteButton}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}


// Muestra el formulario para crear una tarea
function showCreateTaskForm() {
    closeModal(); // Cierra el modal de la lista
    
    // Obtener la fecha de mañana (siguiente día)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'create-task-modal';
    modal.innerHTML = `
        <div class="modal-content" style="width: 500px;">
            <h3>Crear Nueva Tarea</h3>
            <input type="text" id="taskTitle" placeholder="Título de la tarea" style="width: 95%; padding: 10px; margin-bottom: 10px;">
            <textarea id="taskDescription" placeholder="Descripción..." style="width: 95%; padding: 10px; margin-bottom: 10px; min-height: 80px;"></textarea>
            <select id="taskAssignTo" style="width: 100%; padding: 10px; margin-bottom: 10px;">
                <option value="">Asignar a...</option>
                ${currentGroupMembers.filter(member => member.id !== currentUser.id).map(member => `<option value="${member.id}">${member.username}</option>`).join('')}
            </select>
            <input type="date" id="taskDueDate" min="${minDate}" style="width: 95%; padding: 10px; margin-bottom: 10px;">
            <select id="taskPriority" style="width: 100%; padding: 10px; margin-bottom: 10px;">
                <option value="low">Baja</option>
                <option value="medium" selected>Media</option>
                <option value="high">Alta</option>
            </select>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal(); showTasksManager();">Cancelar</button>
                <button class="btn btn-primary" onclick="createTask()">Crear</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Llama a la API para crear la tarea
async function createTask() {
    const taskData = {
        action: 'create',
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        groupId: currentGroup.id,
        assignedTo: document.getElementById('taskAssignTo').value,
        dueDate: document.getElementById('taskDueDate').value,
        priority: document.getElementById('taskPriority').value
    };

    if (!taskData.title || !taskData.dueDate) {
        showNotification('El título y la fecha límite son obligatorios', 'error');
        return;
    }
    
    // Validar que la fecha sea futura
    const selectedDate = new Date(taskData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
        showNotification('La fecha límite debe ser posterior a hoy', 'error');
        return;
    }

    const response = await fetch(`${API_BASE}tasks.php`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(taskData)
    });
    const result = await response.json();

    if (result.success) {
        showNotification('Tarea creada con éxito', 'success');
        closeModal();
        showTasksManager();
    } else {
        showNotification(result.error || 'Error al crear la tarea', 'error');
    }
}

// Muestra el formulario para editar una tarea
async function showEditTaskForm(taskId) {
    const tasks = await getGroupTasks(currentGroup.id);
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;

    // Obtener la fecha de mañana (siguiente día)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    closeModal();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'edit-task-modal';
    modal.innerHTML = `
         <div class="modal-content" style="width: 500px;">
            <h3>Editar Tarea</h3>
            <input type="hidden" id="editTaskId" value="${task.id}">
            <input type="text" id="editTaskTitle" value="${task.title}" style="width: 95%; padding: 10px; margin-bottom: 10px;">
            <textarea id="editTaskDescription" style="width: 95%; padding: 10px; margin-bottom: 10px; min-height: 80px;">${task.description || ''}</textarea>
            <select id="editTaskAssignTo" style="width: 100%; padding: 10px; margin-bottom: 10px;">
                <option value="">Asignar a...</option>
                ${currentGroupMembers.map(member => `<option value="${member.id}" ${task.assigned_to == member.id ? 'selected' : ''}>${member.username}</option>`).join('')}
            </select>
            <input type="date" id="editTaskDueDate" value="${task.due_date}" min="${minDate}" style="width: 95%; padding: 10px; margin-bottom: 10px;">
            <select id="editTaskPriority" style="width: 100%; padding: 10px; margin-bottom: 10px;">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Baja</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Media</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Alta</option>
            </select>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal(); showTasksManager();">Cancelar</button>
                <button class="btn btn-primary" onclick="editTask()">Guardar Cambios</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Llama a la API para editar la tarea
async function editTask() {
    const taskData = {
        action: 'edit',
        id: document.getElementById('editTaskId').value,
        title: document.getElementById('editTaskTitle').value,
        description: document.getElementById('editTaskDescription').value,
        assignedTo: document.getElementById('editTaskAssignTo').value,
        dueDate: document.getElementById('editTaskDueDate').value,
        priority: document.getElementById('editTaskPriority').value
    };

    const response = await fetch(`${API_BASE}tasks.php`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(taskData)
    });
    const result = await response.json();

    if (result.success) {
        showNotification('Tarea actualizada', 'success');
        closeModal();
        showTasksManager();
    } else {
        showNotification(result.error || 'Error al actualizar', 'error');
    }
}


// Llama a la API para cambiar el estado
async function changeTaskStatus(taskId, status) {
    const response = await fetch(`${API_BASE}tasks.php`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'update_status', taskId, status })
    });
    const result = await response.json();

    if (result.success) {
        let message = 'Estado de la tarea actualizado';
        if (result.points_awarded && result.points_awarded > 0) {
            message += ` - Se otorgaron ${result.points_awarded} puntos al usuario asignado 🎉`;
        }
        showNotification(message, 'success');
        // Refrescar solo la lista de tareas sin cerrar el modal
        const tasks = await getGroupTasks(currentGroup.id);
        document.getElementById('tasksContainer').innerHTML = renderTasksList(tasks);
    } else {
        showNotification(result.error || 'Error al actualizar', 'error');
    }
}

// Llama a la API para eliminar la tarea
async function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;

    const response = await fetch(`${API_BASE}tasks.php`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'delete', taskId })
    });
    const result = await response.json();

    if (result.success) {
        showNotification('Tarea eliminada', 'success');
        const tasks = await getGroupTasks(currentGroup.id);
        document.getElementById('tasksContainer').innerHTML = renderTasksList(tasks);
    } else {
        showNotification(result.error || 'Error al eliminar', 'error');
    }
}

// Función auxiliar para el color del estado
function getStatusColor(status) {
    switch(status) {
        case 'completed': return '#43b581';
        case 'in-progress': return '#faa61a';
        case 'pending': return '#7289da';
        default: return '#b9bbbe';
    }
}

// Función auxiliar para cerrar modales (si no la tienes ya)
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}