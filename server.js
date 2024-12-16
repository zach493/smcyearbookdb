const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins
app.use(bodyParser.json()); // Parse JSON request bodies

// Database connection
const db = mysql.createPool({
  host: 'smcyearbook.cdiagk8o8g4x.ap-southeast-1.rds.amazonaws.com',
  user: 'root',
  password: 'nR2Y72jQDfmT5MU',
  database: 'smcyearbook',
  port: 3306,
});

// Fetch alumni data
app.get('/alumni', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM alumni');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching data:', err);
    return res.status(500).send('Server error');
  }
});

// Login route to authenticate user
app.get('/login', async (req, res) => {
  const idNumber = req.query.idNumber; // Extract 'idNumber' from query params

  if (!idNumber) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  const query = 'SELECT * FROM alumni WHERE alum_id_num = ?';
  try {
    const [results] = await db.query(query, [idNumber]);

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid ID Number' });
    }

    res.status(200).json({ message: 'Login successful', user: results[0] });
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Route to fetch alumni details by alum_id_num (using query params like in the login)
app.get('/alumniprof', async (req, res) => {
  const alumId = req.query.idNumber; // Extract 'idNumber' from query params

  if (!alumId) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  try {
    // Query to get alumni information by alum_id_num
    const [alumRow] = await db.query(
      'SELECT alum_fname, alum_mname, alum_lname, alum_id_num, alum_year, alum_course, motto FROM alumni WHERE alum_id_num = ?',
      [alumId]
    );

    if (!alumRow || alumRow.length === 0) {
      return res.status(404).json({ message: 'Alumni not found' });
    }

    // Send alumni data as JSON response
    res.status(200).json({ message: 'Alumni found', alumni: alumRow[0] });
  } catch (error) {
    console.error('Error fetching alumni details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to fetch image data by img_ID
app.get('/images', async (req, res) => {
  const alumId = req.query.idNumber; // Extract 'idNumber' from query params

  if (!alumId) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  try {
    // Query to get the image data by img_ID
    const [imageRow] = await db.query('SELECT img_data FROM images WHERE img_ID = ?', [alumId]);

    if (!imageRow || imageRow.length === 0 || !imageRow[0].img_data) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Convert binary data to Base64
    const base64Image = imageRow[0].img_data.toString('base64');
    res.status(200).json({ img_base64: `data:image/jpeg;base64,${base64Image}` });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Server error' });
  }
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
