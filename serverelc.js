const express = require('express');
const mysql = require('mysql2');
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
      res.status(200).json({ message: 'Login successful' });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

// SIGNUP endpoint
app.post('/api/auth/signup', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM elc_db WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (results.length > 0) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    db.query('INSERT INTO elc_db (username, password) VALUES (?, ?)', [username, password], (err2) => {
      if (err2) return res.status(500).json({ message: 'Error creating user' });

      res.status(201).json({ message: 'Signup successful' });
    });
  });
});

// Approve booking
app.post('/approve-booking', (req, res) => {
  const { name, price, address, cellphone, payment, date, product, user } = req.body;

  // Ensure correct date format for MySQL (YYYY-MM-DD)
  const formattedDate = new Date(date);
  const mysqlDate = `${formattedDate.getFullYear()}-${String(formattedDate.getMonth() + 1).padStart(2, '0')}-${String(formattedDate.getDate()).padStart(2, '0')}`;

  // Check if any required field is missing
  if (!name || !price || !address || !cellphone || !payment || !date || !product || !user) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const query = `
    INSERT INTO elc_booked (name, price, address, cellphone, payment, date, product, user)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Use mysqlDate instead of the raw ISO string
  const values = [name, price, address, cellphone, payment, mysqlDate, product, user];

  db.query(query, values, (err) => {
    if (err) {
      console.error('Error inserting booking:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    res.status(200).json({ message: 'Booking approved and saved.' });
  });
});

// Get bookings by username
app.get('/booked-products/:username', (req, res) => {
  const { username } = req.params;

  db.query('SELECT * FROM elc_booked WHERE user = ? ORDER BY id DESC', [username], (err, results) => {
    if (err) {
      console.error('Error fetching bookings:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(results);
  });
});

// Delete booking
app.delete('/booked-products/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM elc_booked WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting booking:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ message: 'Booking deleted successfully' });
  });
});

// Update booking
app.put('/booked-products/:id', (req, res) => {
  const { id } = req.params;
  const { address, cellphone, payment, date } = req.body;

  db.query(
    'UPDATE elc_booked SET address = ?, cellphone = ?, payment = ?, date = ? WHERE id = ?',
    [address, cellphone, payment, date, id],
    (err) => {
      if (err) {
        console.error('Error updating booking:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json({ message: 'Booking updated successfully' });
    }
  );
});

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
