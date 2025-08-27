const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS for frontend-backend communication
app.use(express.json()); // Parse JSON bodies

// Database configuration - update username/password/database as needed
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'bank_management_system'
};

// Register endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'INSERT INTO users (username, password, balance) VALUES (?, ?, ?)',
      [username, password, 0]
    );
    await connection.end();
    res.status(201).json({ message: 'Registration successful.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    res.status(500).json({ message: 'Database error.', error });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    await connection.end();

    if (rows.length > 0) {
      const user = rows[0];
      res.json({ message: 'Login successful.', user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Database error.', error });
  }
});

// Get user data (balance + transactions)
app.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [userRows] = await connection.execute('SELECT balance FROM users WHERE id = ?', [userId]);
    const [transactionRows] = await connection.execute(
      'SELECT type, amount, transaction_date FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC',
      [userId]
    );
    await connection.end();

    if (userRows.length > 0) {
      res.json({
        balance: userRows[0].balance,
        transactions: transactionRows
      });
    } else {
      res.status(404).json({ message: 'User not found.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Database error.', error });
  }
});

// Deposit endpoint
app.post('/deposit', async (req, res) => {
  const { userId, amount } = req.body;
  if (amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount.' });
  }
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
    await connection.execute('INSERT INTO transactions (user_id, type, amount) VALUES (?, ?, ?)', [
      userId,
      'Deposit',
      amount
    ]);
    await connection.commit();
    res.json({ message: 'Deposit successful.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Database error.', error });
  } finally {
    await connection.end();
  }
});

// Withdraw endpoint
app.post('/withdraw', async (req, res) => {
  const { userId, amount } = req.body;
  if (amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount.' });
  }
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT balance FROM users WHERE id = ?', [userId]);
    if (rows[0].balance < amount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Insufficient balance.' });
    }
    await connection.execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);
    await connection.execute('INSERT INTO transactions (user_id, type, amount) VALUES (?, ?, ?)', [
      userId,
      'Withdraw',
      amount
    ]);
    await connection.commit();
    res.json({ message: 'Withdrawal successful.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Database error.', error });
  } finally {
    await connection.end();
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
