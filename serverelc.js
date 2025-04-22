const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const convertapi = require('convertapi')('secret_U9apsnZRFkG873t4');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.use(cors({ origin: '*' })); 
app.use(bodyParser.json()); 

require('dotenv').config();

const db = mysql.createPool({
  host: 'yearbook-zaxer147-7f4c.c.aivencloud.com',
  user: 'avnadmin',
  password: process.env.MYSQL_PASSWORD, 
  database: 'defaultdb',
  port: 17784,
  ssl: {
    ca: Buffer.from(process.env.MYSQL_CA_CERT, 'base64').toString('utf-8'), 
    rejectUnauthorized: false
  }
});

// LOGIN endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const sql = 'SELECT * FROM elc_db WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (results.length > 0) {
      return res.status(200).json({ message: 'Login successful' });
    } else {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

// SIGNUP endpoint
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (checkUser[0].length > 0) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
    return res.status(201).json({ message: 'Signup successful' });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});


app.post('/approve-booking', async (req, res) => {
  const { name, price, address, cellphone, payment, date, product, user } = req.body;

  if (!name || !price || !address || !cellphone || !payment || !date || !product || !user) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const query = `
      INSERT INTO elc_booked (name, price, address, cellphone, payment, date, product, user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.query(query, [name, price, address, cellphone, payment, date, product, user]);
    res.status(200).json({ message: 'Booking approved and saved.' });
  } catch (error) {
    console.error('Error inserting booking:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET bookings by username
app.get('/booked-products/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const [results] = await db.query(
      'SELECT * FROM elc_booked WHERE user = ? ORDER BY id DESC',
      [username]
    );
    res.json(results);
  } catch (error) {
    console.error('Error fetching booked products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE booking
app.delete('/booked-products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM elc_booked WHERE id = ?', [id]);
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT (update) booking
app.put('/booked-products/:id', async (req, res) => {
  const { id } = req.params;
  const { address, cellphone, payment, date } = req.body;
  try {
    await db.query(
      'UPDATE elc_booked SET address = ?, cellphone = ?, payment = ?, date = ? WHERE id = ?',
      [address, cellphone, payment, date, id]
    );
    res.json({ message: 'Booking updated successfully' });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
