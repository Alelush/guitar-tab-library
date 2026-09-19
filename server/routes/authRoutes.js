const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Подключение модели пользователя

const router = express.Router();

//  РЕГИСТРАЦИЯ НОВОГО ПОЛЬЗОВАТЕЛЯ
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // 1. Проверяю, есть ли уже пользователь с таким именем
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким именем уже существует' });
        }

        // 2. Хеширую пароль
        const hashedPassword = await bcrypt.hash(password, 12);

        // 3. Создаю нового пользователя
        const newUser = new User({
            username,
            password: hashedPassword,
            role: role || 'user' // Если роль не указана, она будет 'user'
        });

        // 4. Сохраняю пользователя в базе данных
        await newUser.save();

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован!' });

    } catch (error) {
        res.status(500).json({ message: 'Что-то пошло не так, попробуйте снова' });
    }
});

// ВХОД ПОЛЬЗОВАТЕЛЯ 
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Ищу пользователя в базе
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Неверные учетные данные, попробуйте снова' });
        }

        // 2. Сравниваю введенный пароль с хешем в базе
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неверные учетные данные, попробуйте снова' });
        }

        // 3. Создаю JWT токен 
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            'my_super_secret_key_12345', // Секретный ключ (в реальном проекте должен быть сложнее и храниться в .env)
            { expiresIn: '1h' } // Токен будет действителен 1 час
        );

        res.json({ token, userId: user.id, username: user.username, role: user.role });

    } catch (error) {
        res.status(500).json({ message: 'Что-то пошло не так, попробуйте снова' });
    }
});


module.exports = router;