/*
 * Copyright (c) 2021, Bastian Leicht <mail@bastainleicht.de>
 *
 * PDX-License-Identifier: BSD-2-Clause
 */
const express = require('express');
const http = require('http');
const os = require('os');
const _ = require('lodash');
const path = require('path');
const { Server } = require('socket.io');
const { v4: uuid } = require('uuid');

const LOGGING = true;
const PORT = 3000;
const N_TASKS = 5;
const N_IMPOSTORS = 1;
const N_TIME = 10;		//	In Minutes

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const TASKS = [
	'Wurmloch Simulation',
	'Suchmaschinen - Konfiguration',
	'Porträt des Captains',
	'Dateien ordnen',
	'Sicherungen sortieren',
	'Becherstapeln',
	'Bottle Flip',
	'Würfel den Code',
	'Verkable das Schiff neu',
	'Time to Kill - Sanduhr',
	'Navigationsgerät neu konfigurieren',
	'Passwort knacken',
	'Besiege die K.I.',
	'Kognitiver Test',
	'Geheimbotschaften entschlüsseln',
	'Funkkommunikation wiederherstellen',
	'Crewliste',
	'Raumschiff staubsaugen',
];

let taskProgress = {};

const nets = os.networkInterfaces();
const network_results = { };

for (const name of Object.keys(nets)) {
	for (const net of nets[name]) {
		// Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
		if (net.family === 'IPv4' && !net.internal) {
			if (!network_results[name]) {
				network_results[name] = [];
			}
			network_results[name].push(net.address);
		}
	}
}

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'views', 'auth.html'));
});

app.get('/admin', (req, res) => {
	res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/game', (req, res) => {
	res.sendFile(path.join(__dirname, 'views', 'index.html'));
})

app.use('/', express.static(path.join(__dirname, 'public')));

const connected_player_list = [];
const player_list = [];
io.emit('load-game');

io.on('connection', socket => {
	player_list.push(socket)

	log(`${socket.handshake.query.customName} (${socket.handshake.query.customID}) connected as: ${socket.handshake.query.role}, total: ${io.of('/').sockets.size}`);

	if(socket.handshake.query.role === 'PLAYER') {
		const playerID = socket.handshake.query.customID;
		socket.emit('getID', playerID);

		if (!connected_player_list[playerID]) {
			connected_player_list[playerID] = {};
		}
		//connected_player_list[playerID]['socket'] = socket;
		connected_player_list[playerID]['socketID'] = socket.id;
		connected_player_list[playerID]['role'] = socket.handshake.query.role;
		connected_player_list[playerID]['customName'] = socket.handshake.query.customName;
		connected_player_list[playerID]['customID'] = socket.handshake.query.customID;

		socket.emit('receive-player-list', connected_player_list);
	}

	socket.on('stop-game', () => {
		log('Admin: Stopped the Game (reloading everyone)')
		io.emit('load-game');
	});

	socket.on('send-player-list', () => {
		console.log('Sending Player list to Admin')
		console.log(connected_player_list)
		socket.emit('receive-player-list', io.of('/').sockets);	//TODO:
	})

	socket.on('start-game', () => {
		// Get player sockets
		const players = [];
		for (const [_, socket] of io.of('/').sockets) {
			if (socket.handshake.query.role === 'PLAYER') {
				players.push(socket);
			}
		}
		const playerIds = players.map(player => player.id);
		log('Player Sockets: ', players.length);
		console.log(playerIds)		//TODO: Remove!

		// Assign impostors
		const impostors = _.shuffle(playerIds).slice(0, N_IMPOSTORS);
		for (const [id, socket] of io.of('/').sockets) {
			if (socket.handshake.query.role === 'PLAYER') {
				socket.emit('getID', id)
				if (impostors.includes(id)) {
					socket.emit('role', 'Impostor');
					log(`${socket.handshake.query.customName} (${id}) is Impostor!`);
				} else {
					socket.emit('role', 'Crewmate');
					console.log(`${socket.handshake.query.customName} (${id}) is Crewmate!`);
				}
			}
		}

		// Pool of tasks so they are distributed evenly
		let shuffledTasks = [];

		// Dictionary with key as socket.id and value is array of tasks
		const playerTasks = {};

		// Assign tasks
		taskProgress = {};
		for (let i = 0; i < N_TASKS; i++) {
			for (const player of players) {
				// Make sure there's a pool of shuffled tasks
				if (shuffledTasks.length === 0) {
					shuffledTasks = _.shuffle(TASKS);
				}

				if (!playerTasks[player.id]) {
					playerTasks[player.id] = {};
				}

				const taskId = uuid();
				playerTasks[player.id][taskId] = shuffledTasks.pop();

				if (!impostors.includes(player.id)) {
					taskProgress[taskId] = false;
				}
			}
		}

		console.log('player tasks', playerTasks);

		for (const [id, socket] of io.of('/').sockets) {
			if (playerIds.includes(id)) {
				socket.emit('tasks', playerTasks[id]);
			}
		}

		io.emit('start-game');

		emitTaskProgress();
	});

	socket.on('report', () => {
		log('Player Reported: Emergency Meeting started!')
		io.emit('play-report');
	});

	socket.on('emergency-meeting', () => {
		log('Emergency Meeting started!');
		io.emit('play-meeting');
	});

	socket.on('stop-meeting', () => {
		log('Admin: Emergency Meeting stopped!')
		io.emit('stop-meeting');
	});

	socket.on('task-complete', taskId => {
		log(`Task completed: ${taskId}`)
		if (typeof taskProgress[taskId] === 'boolean') {
			taskProgress[taskId] = true;
		}
		emitTaskProgress();
	});

	socket.on('task-incomplete', taskId => {
		if (typeof taskProgress[taskId] === 'boolean') {
			taskProgress[taskId] = false;
		}
		emitTaskProgress();
	});
});

function emitPlayerList() {
	console.log('Emitting Player List')
	console.log(player_list)
	io.emit('receive-player-list', player_list);
}

function emitTaskProgress() {
	const tasks = Object.values(taskProgress);
	const completed = tasks.filter(task => task).length;
	const total = completed / tasks.length;
	log(`Emitting Progress to: ${total}%`)
	io.emit('progress', total);

	if (total === 1) {
		io.emit('crew-win');
	}
}

function log(message) {
	let d, hours ,minutes, seconds;
	if ('undefined' !== typeof console && LOGGING) {
		d = new Date();
		hours = d.getHours();
		if (hours < 10)
			hours = "0" + hours;
		minutes = d.getMinutes();
		if (minutes < 10)
			minutes = "0" + minutes;
		seconds = d.getSeconds();
		if (seconds < 10)
			seconds = "0" + seconds;
		console.log(hours + ':' + minutes + ':' + seconds + ' | AMONG US > ' + message);
	}
}

server.listen(PORT, () => console.log(`Server listening on ${network_results["WLAN"]}:${PORT}`));
console.log(`Here is a link to the Admin panel: http://${network_results['WLAN']}:${PORT}/admin
Here is a link for the Player's: http://${network_results['WLAN']}:${PORT}`)