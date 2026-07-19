require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Perbaikan 1: 'admin' diubah menjadi huruf kecil semua sesuai standar Linux
const authRoutes = require('./routes/auth');
const adminRouter = require('./routes/admin'); 
const votingRoutes = require('./routes/voting');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet());

// === 1. CORS HARUS BERADA DI PALING ATAS ===
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// === 2. LONGGARKAN HELMET AGAR TIDAK MEMBLOKIR RESPONS RESOURCE ===
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

app.use(express.json({ limit: '100kb' })); // Limit body size

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
// Perbaikan 2: Menggunakan nama variabel yang benar (adminRouter)
app.use('/api/admin', adminRouter); 
app.use('/api', votingRoutes); 

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Perbaikan 3: Hapus kondisi IF agar serverExpress WAJIB menyala di Back4app (Production)
// Ditambahkan '0.0.0.0' agar kontainer menerima koneksi luar untuk Health Check
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
