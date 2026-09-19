const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'creator'], default: 'user' },
    purchasedTabs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tablature' }],
    
    // НОВОЕ ПОЛЕ: Избранные табулатуры
    favorites: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tablature' 
    }]
});

const User = mongoose.model('User', userSchema);
module.exports = User;