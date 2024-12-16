const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins
app.use(bodyParser.json()); // Parse JSON request bodies

// Database connection
const db = mysql.createConnection({
  host: 'smcyearbook.cdiagk8o8g4x.ap-southeast-1.rds.amazonaws.com',
  user: 'root',
  password: 'nR2Y72jQDfmT5MU',
  database: 'smcyearbook',
  port: 3306,
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  } else {
    console.log('Connected to the database');
  }
});

// Fetch alumni data
app.get('/alumni', (req, res) => {
  db.query('SELECT * FROM alumni', (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).send('Server error');
    }
    res.status(200).json(results);
  });
});

app.get('/login', (req, res) => {
  const { idNumber } = req.query;

  // Check if the ID Number is provided
  if (!idNumber) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  // Query to find the user by ID number
  const query = 'SELECT * FROM alumni WHERE alum_id_num = ?';
  db.query(query, [idNumber], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    // If no matching user is found, return an error
    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid ID Number' });
    }

    // Return success with user data or other relevant information
    res.status(200).json({ message: 'Login successful', user: results[0] });
  });
});









// Log requests
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

// Server setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
