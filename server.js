const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Инициализация базы данных (сохраняется в файл db.json)
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

// Настройки по умолчанию для БД
db.defaults({ clans: [] }).write();

const app = express();
const PORT = 3000;

// Настройка сохранения картинок (логотипов)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 1. Получить список всех кланов
app.get('/api/clans', (req, res) => {
    const clans = db.get('clans').value();
    res.json(clans);
});

// 2. Добавить новый клан
app.post('/api/clans', upload.single('logo'), (req, res) => {
    const { name, leader, members } = req.body;
    const logoUrl = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.png';

    if (!name || !leader) {
        return res.status(400).send('Название клана и лидер обязательны!');
    }

    const newClan = {
        id: Date.now().toString(),
        name,
        leader,
        members: members ? members.split(',').map(m => m.trim()).filter(m => m) : [],
        logo: logoUrl
    };

    db.get('clans').push(newClan).write();
    res.redirect('/'); // Перенаправляем обратно на главную
});

// 3. Удалить клан (Админская функция для тебя)
app.delete('/api/clans/:id', (req, res) => {
    const { id } = req.params;
    
    // Удаляем файл логотипа, если он не дефолтный
    const clan = db.get('clans').find({ id }).value();
    if (clan && clan.logo !== '/uploads/default.png') {
        const filePath = path.join(__dirname, 'public', clan.logo);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.get('clans').remove({ id }).write();
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Сервер LK VIII запущен на http://localhost:${PORT}`);
});
