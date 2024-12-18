const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

app.use(cors({ origin: '*' })); 
app.use(bodyParser.json()); 

const db = mysql.createPool({
  host: 'smcyearbook.cdiagk8o8g4x.ap-southeast-1.rds.amazonaws.com',
  user: 'root',
  password: 'nR2Y72jQDfmT5MU',
  database: 'smcyearbook',
  port: 3306,
});

app.get('/api/vision-mission', async (req, res) => {
  try {
    const [results] = await db.execute('SELECT mission, vision, ignacia, almamater, schoolhymn,stmichael FROM missionvision LIMIT 1');
    if (results.length === 0) {
      res.status(404).json({ message: 'Data not found.' });
    } else {
      res.status(200).json({
        mission: results[0].mission,
        vision: results[0].vision,
        ignacia: results[0].ignacia,
        almamater: results[0].almamater,
        schoolhymn: results[0].schoolhymn ,
        stmichael: results[0].stmichael
      });
    }
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});
app.get('/alumni', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM alumni');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching data:', err);
    return res.status(500).send('Server error');
  }
});
app.get('/login', async (req, res) => {
  const idNumber = req.query.idNumber; 

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
app.get('/alumniprof', async (req, res) => {
  const alumId = req.query.idNumber; 
  if (!alumId) {
    return res.status(400).json({ message: 'ID Number is required' });
  }

  try {
    const [alumRow] = await db.query(
      'SELECT alum_fname, alum_mname, alum_lname, alum_id_num, alum_year, alum_course, motto FROM alumni WHERE alum_id_num = ?',
      [alumId]
    );
    if (!alumRow || alumRow.length === 0) {
      return res.status(404).json({ message: 'Alumni not found' });
    }
    res.status(200).json({ message: 'Alumni found', alumni: alumRow[0] });
  } catch (error) {
    console.error('Error fetching alumni details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
app.get('/images', async (req, res) => {
  const alumId = req.query.idNumber; 

  if (!alumId) {
    return res.status(400).json({ message: 'ID Number is required' });
  } try {
    const [imageRow] = await db.query('SELECT img_data FROM images WHERE img_ID = ?', [alumId]);

    if (!imageRow || imageRow.length === 0 || !imageRow[0].img_data) {
      return res.status(404).json({ message: 'Image not found' });
    }
    const base64Image = imageRow[0].img_data.toString('base64');
    res.status(200).json({ img_base64: `data:image/jpeg;base64,${base64Image}` });
  }catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/yearbook', async (req, res) => {
  try {
    const [results] = await db.query('SELECT year, theme, img_data FROM year');
    if (results.length === 0) {
      return res.status(404).json({ message: 'No yearbook data found.' });
    }const yearbookData = results.map((row) => ({
      year: row.year,
      theme: row.theme,
      image: row.img_data ? `data:image/jpeg;base64,${row.img_data.toString('base64')}` : null,
    }));

    res.status(200).json(yearbookData);
  } catch (error) {
    console.error('Error fetching yearbook data:', error);
    res.status(500).json({ message: 'Failed to fetch yearbook data' });
  }
});
app.get('/api/alumnicollege', async (req, res) => {
  const { course, year } = req.query;

  if (!course || !year) {
    return res.status(400).json({ message: 'Both course and year are required' });
  }

  try {
    // Updated query to join alumni table with images table
    const query = `
      SELECT 
        a.alum_fname, 
        a.alum_mname, 
        a.alum_lname, 
        a.motto, 
        i.img_data
      FROM 
        alumni AS a
      LEFT JOIN 
        images AS i 
      ON 
        a.alum_id_num = i.img_id
      WHERE 
        a.alum_course = ? AND a.alum_year = ?
    `;

    const [results] = await db.query(query, [course, year]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No alumni found for the given filters.' });
    }

    // Process the results to include base64-encoded image data
    const alumniData = results.map((row) => ({
      alum_fname: row.alum_fname,
      alum_mname: row.alum_mname,
      alum_lname: row.alum_lname,
      motto: row.motto,
      img_data: row.img_data
        ? `data:image/jpeg;base64,${Buffer.from(row.img_data).toString('base64')}`
        : null,
    }));

    res.status(200).json(alumniData);
  } catch (error) {
    console.error('Error fetching alumni data with images:', error.message);
    res.status(500).json({ message: 'Server error occurred while fetching alumni data.' });
  }
});

app.get('/api/faculty-department', async (req, res) => {
  const { departmentName } = req.query;

  if (!departmentName) {
    return res.status(400).json({ message: 'Department name is required' });
  }

  try {
    const query = `
      SELECT 
        name, 
        department, 
        image
      FROM 
        smcadmins
      WHERE 
        department = ?
    `;
    
    const [results] = await db.query(query, [departmentName]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No faculty found for the given department.' });
    }

    const facultyData = results.map((row) => ({
      name: row.name,
      department: row.department,
      image: row.image || null,
    }));

    res.status(200).json(facultyData);
  } catch (error) {
    console.error('Error fetching faculty data:', error);
    res.status(500).json({ message: 'Server error occurred while fetching faculty data.' });
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
