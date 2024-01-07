
require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(process.env.DATABASE_PATH);

const app = express();

const makeId = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
    }
    return result;
}

db.exec(`CREATE TABLE IF NOT EXISTS urls (
	id TEXT PRIMARY KEY ASC,
	url TEXT UNIQUE
);`)
.exec(`CREATE INDEX IF NOT EXISTS url_index ON urls (url);`)
.exec(`CREATE INDEX IF NOT EXISTS id_index ON urls (id);`);

app.post('/url/submit', express.json(), (req, res, next) => {

	const url = req.body.url;

	db.all('SELECT id FROM urls WHERE url=?;', [url], (err, rows) => {
		if (err) {
			return next(err);
		}
		if (rows.length > 0) {
			return res.json({id: rows[0].id});
		}
		const id = makeId(6);
		db.all('INSERT INTO urls (url, id) VALUES (?, ?) RETURNING id;', [url, id], (err, rows) => {
			if (err) {
				return next(err);
			}
			if (rows.length === 0) {
				return next(new Error(`Error inserting url`));
			}
			return res.json({id: id});
		});
	});

});

app.get('/url', (req, res, next) => {

	res.sendFile(path.resolve('./src/home.html'));

});

app.get('/url/:id', (req, res, next) => {

	const id = req.params.id;

	db.all('SELECT url FROM urls WHERE id=?;', [id], (err, rows) => {
		if (err) {
			return next(err);
		}
		if (rows.length !== 1) {
			return next(new Error(`Found ${rows.length} possible entries`));
		}
		res.redirect(308, rows[0].url);
	});

});

const port = process.env.PORT;
app.listen(port, '0.0.0.0', () => {
	console.log(`Listening on port ${port}`);
});
