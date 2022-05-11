/* eslint-disable prettier/prettier */
// const createError = require('http-errors');
const config = require('config');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');
const uuidv4 = require('uuid/v4');

const { getMorganLogger } = require('../lib/logger');
const { ping } = require('../lib/expressPing');

const indexRouter = require('../routes/index');
const usersRouter = require('../routes/users');

const app = express();

const generateUUID = (req, res, next) => {
	req.uuidv4 = uuidv4();
	res.uuidv4 = req.uuidv4;
	next();
};

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use(compression());
app.use(cors(config.get('corsOptions')));
app.use(getMorganLogger());
app.use(ping());
app.use(
	express.urlencoded({
		extended: true
	})
);
app.use(express.json({ limit: config.get('express.request.sizeLimit') }));
app.use(generateUUID);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
	res.status(404);
	res.send({ status: 404, message: 'Not found' });
	next();
});

module.exports = app;
