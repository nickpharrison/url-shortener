
require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(process.env.DATABASE_PATH);

class FriendlyError extends Error {}

const noIdError = Symbol('NoIdError');

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

const parseUrl = (url) => {
	if (typeof url !== 'string') {
		throw new FriendlyError(`URL must be a string`);
	}
	if (url === '') {
		throw new FriendlyError(`Please specify a URL`);
	}
	let obj;
	try {
		obj = new URL(url);
	} catch (err1) {
		if (err1.code !== 'ERR_INVALID_URL') {
			throw err1;
		}
		try {
			url = 'http://' + url;
			obj = new URL(url);
		} catch (err2) {
			throw new FriendlyError('Invalid URL');
		}
	}
	if (obj.protocol !== 'http:' && obj.protocol !== 'https:') {
		throw new FriendlyError('Unrecognised protocol');
	}
	if (!obj.hostname?.includes('.')) {
		throw new FriendlyError('Invalid hostname');
	}
	return url;
}

db.exec(`CREATE TABLE IF NOT EXISTS urls (
	id TEXT PRIMARY KEY ASC,
	url TEXT UNIQUE
);`)
.exec(`CREATE INDEX IF NOT EXISTS url_index ON urls (url);`)
.exec(`CREATE INDEX IF NOT EXISTS id_index ON urls (id);`);

app.post(process.env.URL_BASE + '/submit', express.json(), (req, res, next) => {

	const url = parseUrl(req.body.url);

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

}, (err, req, res, next) => {

	if (!(err instanceof FriendlyError)) {
		return next(err);
	}

	res.status(400);
	res.json({friendlyError: true, message: err.message});

});

app.get(process.env.URL_BASE + '/', (req, res, next) => {

	res.sendFile(path.resolve('./src/home.html'));

});

app.get(process.env.URL_BASE + '/:id', (req, res, next) => {

	const id = req.params.id;

	db.all('SELECT url FROM urls WHERE id=?;', [id], (err, rows) => {
		if (err) {
			return next(err);
		}
		if (rows.length === 0) {
			return next(); // Causes the default 404 page
		}
		res.redirect(308, rows[0].url);
	});

});

const port = process.env.PORT;
app.listen(port, '0.0.0.0', () => {
	console.log(`Listening on port ${port}`);
});
