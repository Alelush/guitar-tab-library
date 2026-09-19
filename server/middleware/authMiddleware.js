const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Получаю токен из заголовка Authorization
    // Он приходит в формате "Bearer <токен>"
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Нет токена, авторизация отклонена' });
    }

    try {
        // Расшифровываю токен с помощью секретного ключа
        const decoded = jwt.verify(token, 'my_super_secret_key_12345');

        // Добавляю информацию о пользователе из токена в объект запроса (req)
        // Теперь в следующих функциях буду знать, кто сделал этот запрос
        req.user = decoded;

        next(); // Передаю управление следующей функции (созданию таба)
    } catch (error) {
        res.status(401).json({ message: 'Токен недействителен' });
    }
};

module.exports = authMiddleware;