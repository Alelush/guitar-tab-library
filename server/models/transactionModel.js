
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    tab: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tablature', 
        required: true 
    },
    // Цену сохраняю на момент покупки (вдруг цена табулатуры потом изменится)
    price: { 
        type: Number, 
        required: true 
    },
    date: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);