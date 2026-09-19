
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const { 
    getTabs, 
    getTabById, 
    createTab, 
    deleteTab, 
    buyTab, 
    toggleFavorite, 
    getMyFavoritesIds, 
    updateVisibility,
    updateTab 
} = require('../controllers/tabController');

const optionalAuth = (req, res, next) => {
    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            req.user = jwt.verify(token, 'my_super_secret_key_12345');
        } catch (e) {}
    }
    next();
};

router.get('/', optionalAuth, getTabs);
router.get('/favorites/ids', authMiddleware, getMyFavoritesIds);
router.get('/:id', optionalAuth, getTabById);

router.post('/', authMiddleware, createTab);
router.delete('/:id', authMiddleware, deleteTab);
router.post('/:id/buy', authMiddleware, buyTab);
router.post('/:id/favorite', authMiddleware, toggleFavorite);
router.put('/:id/visibility', authMiddleware, updateVisibility);

// Маршрут для редактирования
router.put('/:id', authMiddleware, updateTab);

module.exports = router;