import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: '190.210.186.124',
  user: 'estudiotyt.com.a',
  password: 'wx0VCUMP',
  database: 'tyt_golf',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});

app.get('/api/scores', (req, res) => {
  db.query('SELECT * FROM scores ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/scores', (req, res) => {
  const s = req.body;
  const sql = `INSERT INTO scores (playerId, dateLabel, monthKey, netScore, back9, longDrive, bestApproach, course, tee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [s.playerId, s.dateLabel, s.monthKey, s.netScore, s.back9, s.longDrive ? 1 : 0, s.bestApproach ? 1 : 0, s.course, s.tee];
  
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ id: result.insertId, ...s });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Servidor MySQL Activo"));
