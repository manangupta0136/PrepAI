const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json()); // Allows us to parse JSON bodies
app.use(cors());

// Basic Route for testing
app.get('/', (req, res) => {
  res.send('API is running...');
});
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));