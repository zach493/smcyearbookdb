const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const convertapi = require('convertapi')('secret_U9apsnZRFkG873t4'); // Add your ConvertAPI secret here
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
    ca: Buffer.from(process.env.MYSQL_CA_CERT, 'base64').toString('utf-8'), // Decode CA certificate
    rejectUnauthorized: false
  }
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
    // Fetch alumni details
    const [alumRow] = await db.query(
      'SELECT alum_fname, alum_mname, alum_lname, alum_id_num, alum_year, alum_course, motto, status, status_uni, status_corp, enc_key FROM alumni WHERE alum_id_num = ?',
      [alumId]
    );

    if (!alumRow || alumRow.length === 0) {
      return res.status(404).json({ message: 'Alumni not found' });
    }

    // Fetch images
    const [imageRow] = await db.query('SELECT images, images_uni, images_corp FROM alumni WHERE alum_id_num = ?', [alumId]);

    if (!imageRow || imageRow.length === 0) {
      return res.status(404).json({ message: 'Images not found' });
    }

    let img_url = imageRow[0].images;
    let img_url1 = imageRow[0].images_uni;
    let img_url2 = imageRow[0].images_corp;

    // Convert .tif to .jpg if necessary
    if (img_url && img_url.endsWith('.tif')) {
      img_url = img_url.replace(/\.tif$/, '.jpg'); 
      img_url += '?f=jpg';
    }

    if (img_url1 && img_url1.endsWith('.tif')) {
      img_url1 = img_url1.replace(/\.tif$/, '.jpg'); 
      img_url1 += '?f=jpg';
    }

    if (img_url2 && img_url2.endsWith('.tif')) {
      img_url2 = img_url2.replace(/\.tif$/, '.jpg'); 
      img_url2 += '?f=jpg';
    }

    res.status(200).json({
      message: 'Alumni found',
      alumni: alumRow[0],
      img_url: img_url,
      img_url1: img_url1,
      img_url2: img_url2,
      status: alumRow[0].status, // Include status for the first image
      status_uni: alumRow[0].status_uni, // Include status for the second image
      status_corp: alumRow[0].status_corp, 
    });
  } catch (error) {
    console.error('Error fetching alumni details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



app.post('/updateImageStatus', async (req, res) => {
  const { alumId, imageKey, status } = req.body;

  if (!alumId || !imageKey || !status) {
    return res.status(400).json({ message: 'Alumni ID, image key, and status are required' });
  }

  try {
    // Determine which status column to update based on the imageKey
    let statusColumn;
    if (imageKey === 'status') {
      statusColumn = 'status';
    } else if (imageKey === 'status_uni') {
      statusColumn = 'status_uni';
    } else if (imageKey === 'status_corp') {
      statusColumn = 'status_corp';
    } else {
      return res.status(400).json({ message: 'Invalid image key' });
    }

    // Update the status in the database
    const result = await db.query(
      `UPDATE alumni SET ${statusColumn} = ? WHERE alum_id_num = ?`,
      [status, alumId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Alumni not found or status not updated' });
    }

    res.status(200).json({ message: 'Image status updated successfully' });
  } catch (error) {
    console.error('Error updating image status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



app.get('/api/yearbook', async (req, res) => {
  try {
    const [results] = await db.query('SELECT year, theme, img_url FROM year');
    if (results.length === 0) {
      return res.status(404).json({ message: 'No yearbook data found.' });
    }
    const yearbookData = results.map((row) => ({
      year: row.year,
      theme: row.theme,
      image: row.img_url || null, 
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
    const query = `
      SELECT 
        a.alum_fname, 
        a.alum_mname, 
        a.alum_lname, 
        a.alum_course,
        a.motto, 
        a.images,
        a.images_uni,
        a.images_corp,
        a.status,
        a.status_uni,
        a.status_corp,
        a.enc_key
      FROM 
        alumni AS a
      WHERE 
        a.alum_college = ? AND a.alum_year = ?
    `;

    const [results] = await db.query(query, [course, year]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No alumni found for the given filters.' });
    }

    const alumniData = await Promise.all(results.map(async (row) => {
      let img_url = row.images;
      let img_url1 = row.images_uni;
      let img_url2 = row.images_corp;

      if (img_url && img_url.endsWith('.tif')) {
        img_url = img_url.replace(/\.tif$/, '.jpg');
        img_url += '?f=jpg'; 
      }
      if (img_url1 && img_url1.endsWith('.tif')) {
        img_url1 = img_url1.replace(/\.tif$/, '.jpg');
        img_url1 += '?f=jpg'; 
      }
      if (img_url2 && img_url2.endsWith('.tif')) {
        img_url2 = img_url2.replace(/\.tif$/, '.jpg');
        img_url2 += '?f=jpg'; 
      }

      return {
        alum_fname: row.alum_fname,
        alum_mname: row.alum_mname,
        alum_lname: row.alum_lname,
        alum_course: row.alum_course,
        motto: row.motto,
        img_url: img_url,
        img_url1: img_url1,
        img_url2: img_url2,
        status: row.status,
        status_uni: row.status_uni,
        status_corp: row.status_corp,
        enc_key: row.enc_key,
      };
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
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
app.get('/api/faculty-status', async (req, res) => {
  const { status } = req.query;
  
  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    const query = 'SELECT * FROM smcadmins WHERE status = ?';
    const [results] = await db.query(query, [status]);

    if (results.length === 0) {
      return res.status(404).json({ message: `No faculty found with status ${status}` });
    }

    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ message: 'Server error occurred while fetching data.' });
  }
});
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

app.get('/api/ntp', async (req, res) => {
  try {
    const query = 'SELECT * FROM ntp';
    const [results] = await db.query(query);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No faculty found' });
    }

    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ message: 'Server error occurred while fetching data.' });
  }
});
////////////////////////////////////////////////////////
///////////////////////////////////////////////DO NOT TOUCH
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
