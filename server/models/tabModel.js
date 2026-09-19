const mongoose = require('mongoose');

const tabSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    access: { type: String, enum: ['free', 'paid'], default: 'free' },
    price: { type: Number, default: 0 },
    content: { type: Object, required: true },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    timeSignature: { type: String, default: "4/4" }
});

const Tablature = mongoose.model('Tablature', tabSchema);
module.exports = Tablature;