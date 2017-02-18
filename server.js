const express = require('express')
const app = express()
const fs = require('fs');
const parse = require('csv-parse');
const transform = require('stream-transform');
const low = require('lowdb')
const fileAsync = require('lowdb/lib/storages/file-async')

const csvFilePath = 'DAT_NT_EURUSD_T_LAST_201602.csv'
const csv = require('csvtojson')

const db = low('data.json', {
	storage: fileAsync
})
const moment = require('moment')

const http = require('http').Server(app);
const io = require('socket.io')(http);


app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
})

// Routes
// GET /posts/:id
app.get('/ticks/:data', (req, res) => {
	const tick = db.get('ticks')
		.find({
			data: req.params.data
		})
		.value()

	res.send(tick)
})

app.get('/generate', function (req, res) {
	const obj = {
		ticks: []
	}
	csv({
			delimiter: ";"
		})
		.fromFile(csvFilePath)
		.on('json', (jsonObj) => {
			obj.ticks.push({
				time: jsonObj.data.replace(' ', ''),
				ask: jsonObj.ask,
			})
		})
		.on('done', (error) => {
			fs.writeFile('data.json', JSON.stringify(obj))
			res.send('ok')
		})
})


function getDate() {
	return '2016' + moment().format('MMDDHHmmss')
}

const isEmmit = {}
const historyTicks = []


	function emitTick() {

		const tick = db.get('ticks')
			.find({
				data: getDate()
			})
			.value()


		console.log(isEmmit)
		if (tick && !isEmmit[tick.data]) {
			if(historyTicks.length === 30) {
				historyTicks.shift()
			}
			historyTicks.push(tick)
			isEmmit[tick.data] = true
			io.emit('tick', tick);
		}
		setTimeout(emitTick, 1000);
	}
	emitTick()

io.on('connection', function (socket) {
	console.log('a user connected');

	socket.on('getHistory', function (name, fn) {
		fn(historyTicks)
	});
	socket.on('disconnect', function () {
		console.log('user disconnected');
	});
})

http.listen(process.env.PORT || 3000, function () {
	console.log('Example app listening on port 3000!')
})
