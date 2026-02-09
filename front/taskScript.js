function createNewBlock(content = 'Пиши сюда', priority = 'low', column = null, id = null) {
    const newBlock = document.createElement('li')
    newBlock.classList.add('block')
    if (id) {
        newBlock.dataset.taskId = id;
    }
    setBlockPriority(newBlock, priority)

    const newField = document.createElement('div')
    newField.classList.add('field')
    newField.textContent = content

    const editButton = document.createElement('button')
    editButton.className = 'redact_button'
    editButton.textContent = '✏️'
    editButton.type = 'button'

    const priorityButtons = document.createElement('div')
    priorityButtons.className = 'priority-buttons'

    const priorityUp = document.createElement('button')
    priorityUp.className = 'priority-up';
    priorityUp.textContent = '↑';
    priorityUp.type = 'button';

    const priorityDown = document.createElement('button');
    priorityDown.className = 'priority-down';
    priorityDown.textContent = '↓';
    priorityDown.type = 'button';

    priorityButtons.appendChild(priorityUp);
    priorityButtons.appendChild(priorityDown);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete_button';
    deleteButton.textContent = '🗑️';
    deleteButton.type = 'button';

    newBlock.appendChild(newField);
    newBlock.appendChild(editButton);
    newBlock.appendChild(priorityButtons);
    newBlock.appendChild(deleteButton);
    

    if (column) {
        const addButton = column.querySelector('.add-block-btn');
        column.insertBefore(newBlock, addButton);
    }

    // Добавляем обработчики
    editButton.addEventListener('click', async function() {
        await toggleEditMode(newField, editButton, newBlock);
    });
    
    priorityUp.addEventListener('click', async function() {
        await increasePriority(newBlock);
    });
    
    priorityDown.addEventListener('click', async function() {
        await decreasePriority(newBlock);
    });
    
    deleteButton.addEventListener('click', async function() {
        if (newBlock.dataset.taskId) {
            await deleteTask(newBlock.dataset.taskId);
        }
        newBlock.remove();
        enableDragAndDrop();
    });
    
    return newBlock
}

async function createTask(text = 'Пиши сюда', priority = 'low', columnIndex = 0) {
    try {
        // 1. Находим колонку
        const columns = document.querySelectorAll('.column');
        const column = columns[columnIndex];
        if (!column) throw new Error(`Колонка ${columnIndex} не найдена`);
        
        // 2. Создаём временный блок в DOM
        const tempBlock = createNewBlock(text, priority, column);
        tempBlock.dataset.tempId = `temp_${Date.now()}_${Math.random()}`;
        
        // 3. Отправляем на сервер
        const response = await fetch('/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text, 
                priority, 
                column_index: columnIndex,
                position: column.querySelectorAll('.block').length - 1
            })
        });
        
        if (!response.ok) throw new Error('Ошибка сервера');
        
        // 4. Получаем ID и обновляем блок
        const { id } = await response.json();
        tempBlock.dataset.taskId = id;
        delete tempBlock.dataset.tempId;
        
        // 5. Обновляем интерфейс
        sortBlocksByPriority(column);
        
        return tempBlock;
        
    } catch (error) {
        console.error('Ошибка создания задачи:', error);
        // Можно показать ошибку пользователю
        alert('Не удалось создать задачу: ' + error.message);
        throw error;
    }
}

function InitAddButtons() {
    document.querySelectorAll('.add-block-btn').forEach((button, index) => {
        button.addEventListener('click', async function() {
            await createTask('Блок', 'low', index)
        });
    });
}

function setBlockPriority(block, priority) {
    block.classList.remove('priority-low', 'priority-medium', 'priority-high');
    block.classList.add(`priority-${priority}`);
}

function getBlockPriority(block) {
    if (block.classList.contains('priority-high')) return 'high';
    if (block.classList.contains('priority-medium')) return 'medium';
    return 'low'; // По умолчанию
}

async function increasePriority(block) {
    const currentPriority = getBlockPriority(block);
    
    if (currentPriority === 'low') {
        setBlockPriority(block, 'medium');
    } else if (currentPriority === 'medium') {
        setBlockPriority(block, 'high');
    } 
    // Если high - ничего не делаем
    
    if (block.dataset.taskId) {
        await updateTask(block.dataset.taskId, {
            priority: getBlockPriority(block)
        });
    }
}

async function decreasePriority(block) {
    const currentPriority = getBlockPriority(block);
    
    if (currentPriority === 'high') {
        setBlockPriority(block, 'medium');
    } else if (currentPriority === 'medium') {
        setBlockPriority(block, 'low');
    }
    // Если low - ничего не делаем
    
    if (block.dataset.taskId) {
        await updateTask(block.dataset.taskId, {
            priority: getBlockPriority(block)
        });
    }
}

function sortBlocksByPriority(column) {
    const blocks = Array.from(column.querySelectorAll('.block'));
    const addButton = column.querySelector('.add-block-btn');

    blocks.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        const aPriority = getBlockPriority(a);
        const bPriority = getBlockPriority(b);
        return priorityOrder[aPriority] - priorityOrder[bPriority];
    });

    blocks.forEach(block => block.remove());
    blocks.forEach(block => column.insertBefore(block, addButton));
}

function sortAllColumns() {
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => sortBlocksByPriority(column));
}

async function toggleEditMode(field, button, block) {
    if (field.isContentEditable) {
        field.setAttribute('contenteditable', 'false');
        button.textContent = '✏️';
        field.style.userSelect = 'none';
        
        // Сохраняем изменения в БД
        if (block.dataset.taskId) {
            await updateTask(block.dataset.taskId, {
                text: field.textContent
            });
        }
        
    } else {
        field.setAttribute('contenteditable', 'true');
        button.textContent = '✅';
        field.style.userSelect = 'auto';
        field.focus();
    }
}

function enableDragAndDrop() {
    // Устанавливаем обработчики для блоков
    document.querySelectorAll('.block').forEach(block => {
        block.setAttribute('draggable', 'true');
        
        block.ondragstart = function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.taskId || '');
            this.style.opacity = '0.4';
            window.draggedBlock = this;
        };
        
        block.ondragend = function() {
            this.style.opacity = '1';
            window.draggedBlock = null;
        };
    });
    
    // Устанавливаем обработчики для колонок
    document.querySelectorAll('.column').forEach(column => {
        column.ondragover = function(e) {
            e.preventDefault();
        };
        
        column.ondrop = async function(e) {
            e.preventDefault();
            
            if (!window.draggedBlock) return;
            
            // Вставляем блок перед кнопкой добавления
            const addButton = this.querySelector('.add-block-btn');
            if (addButton) {
                this.insertBefore(window.draggedBlock, addButton);
            } else {
                this.appendChild(window.draggedBlock);
            }
            
            // Обновляем колонку в БД
            if (window.draggedBlock.dataset.taskId) {
                const columns = Array.from(document.querySelectorAll('.column'));
                const newColumnIndex = columns.indexOf(this);
                
                try {
                    await updateTask(window.draggedBlock.dataset.taskId, {
                        column_index: newColumnIndex
                    });
                } catch (error) {
                    console.error('Ошибка обновления колонки:', error);
                }
            }
            
            // Сортируем блоки в колонке
            sortBlocksByPriority(this);
        };
    });
}

async function updateTask(taskId, changes) {
    try {
        const response = await fetch(`/update/${taskId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(changes)
        })

        if (!response.ok) throw new Error('Update error')
        
        const data = await response.json()
        return data
    } catch(error) {
        console.error(` Ошибка обновления задачи ${taskId}:`, error);
        throw error;
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`/delete/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Ошибка удаления');
        return true;
    } catch (error) {
        console.error(`❌ Ошибка удаления задачи ${taskId}:`, error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', async function() {  
    // Показываем загрузку
    document.body.innerHTML += '<div id="loading">Загрузка задач...</div>';
    
    try {
        // 1. Загружаем задачи из БД
        const response = await fetch('/load')
        if (!response.ok) throw new Error('Сервер не отвечает')
        
        const tasks = await response.json()

        // 2. Очищаем текущие блоки (если есть)
        document.querySelectorAll('.block').forEach(block => block.remove())

        // 3. Создаём блоки из БД
        tasks.forEach(task => {
            const column = document.querySelectorAll('.column')[task.column_index]
            if (column) {
                const block = createNewBlock(task.text, task.priority, column)
                block.dataset.taskId = task.id
            }
        })

        console.log(`✅ Загружено ${tasks.length} задач из БД`);

    } catch (e) {console.error(' Ошибка загрузки из БД:', e)}

    document.getElementById('loading')?.remove();

    enableDragAndDrop();
    sortAllColumns();
    InitAddButtons()
});


