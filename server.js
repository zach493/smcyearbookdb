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
  const idNumber = req.query.idNumber; // Extract 'idNumber' from query params

  if (!idNumber) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  const query = 'SELECT * FROM alumni WHERE alum_id_num = ?';
  db.query(query, [idNumber], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid ID Number' });
    }

    res.status(200).json({ message: 'Login successful', user: results[0] });
  });
});



// Express.js Example
app.get('/images/:alumId', async (req, res) => {
  const alumId = req.params.alumId;

  try {
    const [imageRow] = await db.query('SELECT img_data FROM images WHERE img_ID = ?', [alumId]);

    if (!imageRow) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Convert binary data to Base64
    const base64Image = imageRow.img_data.toString('base64');
    res.json({ img_base64: `data:image/jpeg;base64,${base64Image}` });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Express.js route for fetching alumni details by alum_id_num
app.get('/alumni/:alumId', async (req, res) => {
  const alumId = req.params.alumId;

  try {
    // Query to get alumni information by alum_id_num
    const [alumRow] = await db.query(
      'SELECT alum_fname, alum_mname, alum_lname, alum_id_num, alum_year, alum_course, alum_motto FROM alumni WHERE alum_id_num = ?',
      [alumId]
    );

    // Check if alumni data was found
    if (!alumRow) {
      return res.status(404).json({ message: 'Alumni not found' });
    }

    // Send alumni data as JSON response
    res.json(alumRow);
  } catch (error) {
    console.error('Error fetching alumni details:', error);
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
