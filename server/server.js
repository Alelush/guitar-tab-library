const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Импорт новых маршрутов
const authRoutes = require('./routes/authRoutes');
const tabRoutes = require('./routes/tabRoutes');

// НАСТРОЙКА ПРИЛОЖЕНИЯ 
const app = express();
const PORT = 3000;
const MONGO_URI = "mongodb://localhost:27017/guitarTabLibrary";  

mongoose.connect(MONGO_URI) // подключение Mongoose к localhost
    .then(() => console.log('Успешное подключение к ЛОКАЛЬНОЙ MongoDB!'))
    .catch(err => console.error('Ошибка подключения к ЛОКАЛЬНОЙ MongoDB:', err)); 

// ПРОМЕЖУТОЧНОЕ ПО (MIDDLEWARE) 
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// ИСПОЛЬЗОВАНИЕ МАРШРУТОВ 
// Все запросы, начинающиеся с /api/auth, будут обрабатываться в authRoutes
app.use('/api/auth', authRoutes);
// Все запросы, начинающиеся с /api/tabs, будут обрабатываться в tabRoutes
app.use('/api/tabs', tabRoutes);


// ПОДКЛЮЧЕНИЕ К MONGODB
//mongoose.connect(MONGO_URI)
 //   .then(() => console.log('Успешное подключение к MongoDB!'))
  //  .catch(err => console.error('Ошибка подключения к MongoDB:', err));


//  ОТДАЧА ФРОНТЕНДА 
// Этот маршрут должен быть ПОСЛЕ API маршрутов
// Он отдает главную страницу для любых запросов, которые не совпали с API

app.use((req, res, next) => {
    res.sendFile(path.resolve(__dirname, '../client', 'index.html'));
});

// ЗАПУСК СЕРВЕР
app.listen(PORT, () => {
    console.log(`Сервер успешно запущен на http://localhost:${PORT}`);
});