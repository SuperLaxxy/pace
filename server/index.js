require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const adminRouter = require('./routes/admin'); 
const votingRoutes = require('./routes/voting');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Wajib di Back4app agar express-rate-limit mengenali IP Reverse Proxy
app.set('trust proxy', 1);

// 2. Helmet dipasang paling atas
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// 🟢 PERBAIKAN: Definisi allowedOrigins DILAKUKAN SEBELUM DIGUNAKAN
const allowedOrigins = [
  'https://pace-gold.vercel.app',
  'http://localhost:5173'
];

// 3. Konfigurasi CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// 4. Terapkan CORS sebagai Global Middleware
app.use(cors(corsOptions));

// 5. Body Parser
app.use(express.json({ limit: '100kb' }));

// Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRouter); 
app.use('/api', votingRoutes); 

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
