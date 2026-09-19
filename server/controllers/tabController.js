
const Tablature = require('../models/tabModel');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');

// 1. ПОЛУЧИТЬ СПИСОК (Главная + Фильтры + Избранное + Приватность)
const getTabs = async (req, res) => {
    try {
        const { search, level, onlyFavorites } = req.query;
        let query = {};

        if (onlyFavorites === 'true') {
            if (!req.user) return res.status(401).json({ message: 'Нужна авторизация' });
            const user = await User.findById(req.user.userId);
            query._id = { $in: user.favorites };
        } 
        else {
            if (req.user) {
                query.$or = [
                    { visibility: 'public' },
                    { visibility: { $exists: false } },
                    { author: req.user.userId } 
                ];
            } else {
                query.$or = [
                    { visibility: 'public' },
                    { visibility: { $exists: false } }
                ];
            }
        }

        if (search) query.title = { $regex: search, $options: 'i' };
        if (level && level !== 'any') query.difficulty = level;

        const tabs = await Tablature.find(query)
            .populate('author', 'username')
            .sort({ _id: -1 });
            
        res.json(tabs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// 2. ПОЛУЧИТЬ ОДНУ (С ЗАЩИТОЙ И ПРИВАТНОСТЬЮ)
const getTabById = async (req, res) => {
    try {
        const tab = await Tablature.findById(req.params.id).populate('author', 'username');
        if (!tab) return res.status(404).json({ message: 'Табулатура не найдена' });

        if (tab.visibility === 'private') {
            if (!req.user || tab.author._id.toString() !== req.user.userId) {
                return res.status(403).json({ message: 'Это приватная табулатура. Доступ закрыт.' });
            }
        }

        if (tab.access === 'free') return res.json(tab);

        let hasAccess = false;
        if (req.user) {
            if (tab.author._id.toString() === req.user.userId) hasAccess = true;
            else {
                const user = await User.findById(req.user.userId);
                if (user && user.purchasedTabs.includes(tab._id)) hasAccess = true;
            }
        }

        if (hasAccess) {
            res.json(tab);
        } else {
            const restrictedTab = tab.toObject();
            delete restrictedTab.content;
            restrictedTab.isLocked = true;
            res.json(restrictedTab);
        }
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// 3. СОЗДАТЬ ТАБУЛАТУРУ (ФИКС: ПРОВЕРКА ПОЛЕЙ И timeSignature)
const createTab = async (req, res) => {
    if (req.user.role !== 'creator') return res.status(403).json({ message: 'Доступ запрещен' });
    try {
        const { title, artist, access, price, content, difficulty, visibility, timeSignature } = req.body;
        
        if (!title || !artist || !content || !timeSignature) {
            return res.status(400).json({ message: 'Пожалуйста, заполните все обязательные поля (Название, Исполнитель, Содержимое, Размер такта).' });
        }

        const newTab = new Tablature({
            title, artist, access, price, content, difficulty, visibility, timeSignature,
            author: req.user.userId
        });
        await newTab.save();
        res.status(201).json(newTab);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка создания' });
    }
};

// 4. УДАЛИТЬ ТАБУЛАТУРУ
const deleteTab = async (req, res) => {
    try {
        const tab = await Tablature.findById(req.params.id);
        if (!tab) return res.status(404).json({ message: 'Не найдено' });
        if (tab.author.toString() !== req.user.userId) return res.status(403).json({ message: 'Вы не автор' });
        
        await Tablature.findByIdAndDelete(req.params.id);
        res.json({ message: 'Удалено' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка удаления' });
    }
};

// 5. КУПИТЬ (ТРАНЗАКЦИЯ)
const buyTab = async (req, res) => {
    try {
        const tab = await Tablature.findById(req.params.id);
        if (!tab) return res.status(404).json({ message: 'Товар не найден' });
        
        const user = await User.findById(req.user.userId);
        if (user.purchasedTabs.includes(tab._id)) return res.status(400).json({ message: 'Уже куплено' });

        const newTransaction = new Transaction({ user: user._id, tab: tab._id, price: tab.price });
        await newTransaction.save();
        
        user.purchasedTabs.push(tab._id);
        await user.save();
        
        res.json({ message: 'Покупка успешна' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка транзакции' });
    }
};

// 6. ИЗБРАННОЕ (ТОГГЛ)
const toggleFavorite = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const tabId = req.params.id;

        const favoriteIds = user.favorites.map(id => id.toString());
        const index = favoriteIds.indexOf(tabId);
        
        let isFavorite = false;

        if (index === -1) {
            user.favorites.push(tabId);
            isFavorite = true;
        } else {
            user.favorites.splice(index, 1);
            isFavorite = false;
        }

        await user.save();
        res.json({ message: isFavorite ? 'Добавлено' : 'Удалено', isFavorite });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// 7. СПИСОК ID ИЗБРАННОГО
const getMyFavoritesIds = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const ids = user.favorites.map(id => id.toString());
        res.json(ids);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// 8. ИЗМЕНИТЬ ВИДИМОСТЬ
const updateVisibility = async (req, res) => {
    try {
        const tab = await Tablature.findById(req.params.id);
        if (!tab) return res.status(404).json({ message: 'Не найдено' });
        if (tab.author._id.toString() !== req.user.userId) return res.status(403).json({ message: 'Вы не автор' });

        tab.visibility = req.body.visibility;
        await tab.save();
        res.json({ message: 'Видимость обновлена', visibility: tab.visibility });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка обновления' });
    }
};

// 9. ОБНОВИТЬ ТАБУЛАТУРУ (ФИКС: timeSignature)
const updateTab = async (req, res) => {
    try {
        const tab = await Tablature.findById(req.params.id);
        if (!tab) { return res.status(404).json({ message: 'Табулатура не найдена' }); }
        if (tab.author._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Доступ запрещен. Вы не автор.' });
        }

        const { title, artist, difficulty, visibility, access, price, content, timeSignature } = req.body; 
        
        if (!title || !artist || !content || !timeSignature) {
            return res.status(400).json({ message: 'Пожалуйста, заполните все обязательные поля (Название, Исполнитель, Содержимое, Размер такта).' });
        }

        tab.title = title;
        tab.artist = artist;
        tab.difficulty = difficulty;
        tab.visibility = visibility;
        tab.access = access;
        tab.price = price;
        tab.content = content; 
        tab.timeSignature = timeSignature; 

        await tab.save();
        res.json({ message: 'Табулатура обновлена', tab });

    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении' });
    }
};

module.exports = { 
    getTabs, 
    getTabById, 
    createTab, 
    deleteTab, 
    buyTab, 
    toggleFavorite, 
    getMyFavoritesIds, 
    updateVisibility,
    updateTab 
};