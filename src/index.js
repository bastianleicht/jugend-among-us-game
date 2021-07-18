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

const PORT = 3000;
const N_TASKS = 5;
const N_IMPOSTORS = 1;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const TASKS = [
	"Do 10 reps of machine exercise (Joe's Gym)",
	'Pour water (Kitchen)',
	'Sink 1 ball (Billards table)',
	"Flip water bottle (Michael's room)",
	'Wash your hands (basement bathroom)',
	'Wash your hands (1st floor bathroom)',
	'Take elevator',
	'Spin 8, 9, or 10 in Life game (Hearth room)',
	'Beat Smash (Upstairs guest room)',
	'Hit a layup (Basketball court)',
	'Take photo (Green screen)',
	// 'Mess with Jack (basement)',
	'Bounce ping pong ball 10 times (front door)',
	'Take a lap (Around pool)',
	'Flip a pillow (Activity room)'
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
	res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
	res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.use('/', express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
	console.log(
		`A user connected with role: ${socket.handshake.query.role}, total: ${
			io.of('/').sockets.size
		}`
	);

	socket.on('start-game', () => {
		// Get player sockets
		const players = [];
		const customPlayers = [];
		for (const [_, socket] of io.of('/').sockets) {
			if (socket.handshake.query.role === 'PLAYER') {
				players.push(socket);

				let playerInfo = {};
				playerInfo.socketID = socket.id;
				playerInfo.customName = socket.handshake.query.customName;
				customPlayers.push(playerInfo);
			}
		}
		const playerIds = players.map(player => player.id);
		console.log('player sockets', players.length);
		console.log(playerIds)

		// Assign impostors
		const impostors = _.shuffle(playerIds).slice(0, N_IMPOSTORS);
		for (const [id, socket] of io.of('/').sockets) {
			if (socket.handshake.query.role === 'PLAYER') {
				socket.emit('getID', id)
				if (impostors.includes(id)) {
					socket.emit('role', 'Impostor');
					console.log(`${id} (${socket.handshake.query.customName}) is Impostor!`);
				} else {
					socket.emit('role', 'Crewmate');
					console.log(`${id} (${socket.handshake.query.customName}) is Crewmate!`);
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
				playerTasks[player.id]['customName'] = player.handshake.query.customName;
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

		emitTaskProgress();
	});

	socket.on('report', () => {
		io.emit('play-meeting');
	});

	socket.on('emergency-meeting', () => {
		io.emit('play-meeting');
	});

	socket.on('task-complete', taskId => {
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

function emitTaskProgress() {
	const tasks = Object.values(taskProgress);
	const completed = tasks.filter(task => task).length;
	const total = completed / tasks.length;
	io.emit('progress', total);

	if (total === 1) {
		io.emit('play-win');
	}
}

server.listen(PORT, () => console.log(`Server listening on ${network_results["WLAN"]}:${PORT}`));
console.log(`Here is a link to the Admin panel: http://${network_results['WLAN']}:${PORT}/admin
Here is a link for the Player's: http://${network_results['WLAN']}:${PORT}`)