const express = require('express');
const sqlite3 = require('sqlite3');
const app = express();
const db = new sqlite3.Database('./taskDB.db');
const port = 3014
const a = 1

app.use(express.static('front'))
app.use(express.json());

db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    priority TEXT DEFAULT 'low',
    column_index INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0
)`, (err) => {
     if (err) {
        console.error('❌ Ошибка создания таблицы:', err);
    } 
});


app.post('/create', (req, res) => {
    console.log('📦 Данные запроса:', req.body);
    const { text, priority = 'low', column_index = 0, position = 0 } = req.body;
    
    db.run(`
        INSERT INTO tasks (text, priority, column_index, position) 
        VALUES (?, ?, ?, ?)
    `, [text, priority, column_index, position], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ 
                id: this.lastID,
                text, 
                priority, 
                column_index, 
                position 
            });
        }
    });
});

app.patch('/update/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Динамически строим SET часть
    const fields = [];
    const values = [];
    
    if (updates.text !== undefined) {
        fields.push('text = ?');
        values.push(updates.text);
    }
    if (updates.priority !== undefined) {
        fields.push('priority = ?');
        values.push(updates.priority);
    }
    if (updates.column_index !== undefined) {
        fields.push('column_index = ?');
        values.push(updates.column_index);
    }
    if (updates.position !== undefined) {
        fields.push('position = ?');
        values.push(updates.position);
    }
    
    if (fields.length === 0) {
        return res.status(400).json({ error: 'Нет полей для обновления' });
    }
    
    values.push(id);
    
    const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
    
    db.run(sql, values, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ 
                updated: this.changes,
                id,
                ...updates
            });
        }
    });
});

app.delete('/delete/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ 
                deleted: this.changes,
                id 
            });
        }
    });
});

app.get('/tryy', (req, res) => {
    res.json("adfsafsaf");
})

app.get('/load', (req, res) => {
    db.all('SELECT * FROM tasks ORDER BY column_index, position', (err, rows) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.json(rows)
        }
    })
})


app.listen(port, () => {
    console.log(`сервер: http://localhost:${port}`)
});