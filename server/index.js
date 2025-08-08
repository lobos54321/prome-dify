const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory user data (in production, this would be a database)
let userBalance = 1000; // Starting balance of 1000 points

// API Routes
app.get('/api/me/points', (req, res) => {
  res.json({ balance: userBalance });
});

app.post('/api/usage', (req, res) => {
  const { cost = 10 } = req.body; // Default cost of 10 points per usage
  
  if (userBalance >= cost) {
    userBalance -= cost;
    res.json({ 
      success: true, 
      balance: userBalance,
      conversationId: 'conv_' + Date.now()
    });
  } else {
    res.status(400).json({ 
      success: false, 
      error: 'Insufficient balance',
      balance: userBalance 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});