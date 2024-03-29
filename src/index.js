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
const PORT = 80;
const N_TASKS = 5;
const N_IMPOSTORS = 3;
const N_TIME = 10;		//	In Minutes	//TODO: Not Implemented!
const N_TIME_SABOTAGE = 90;

let TEMP_admin_log = [];
TEMP_admin_log.push('-> Among Us Web Edition');
TEMP_admin_log.push('-> by Bastian Leicht');
TEMP_admin_log.push('-> made for https://fegsj.de/');
let TEMP_admin_received_log = [];

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
	//'Kognitiver Test',
	//'Geheimbotschaften entschlüsseln',
	'Funkkommunikation wiederherstellen',
	//'Crew Liste',
	//'Raumschiff staubsaugen',
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
	res.sendFile(path.join(__dirname, 'views', 'game.html'));
})

app.use('/', express.static(path.join(__dirname, 'public')));

let connected_player_count = 0;
let connected_players = [];
const player_list = [];
//	Force reload all Connected Players on Core restart
io.emit('load-game');

io.on('connection', socket => {
	player_list.push(socket)

	log(`${socket.handshake.query.customName} (${socket.handshake.query.customID}) connected as: ${socket.handshake.query.role}, total: ${io.of('/').sockets.size}`);

	if(socket.handshake.query.role === 'PLAYER') {
		connected_player_count = connected_player_count + 1;
		connected_players.push(socket.handshake.query.customName);
		//console.log(connected_players);	//	DEBUG
		const playerID = socket.handshake.query.customID;
		socket.emit('getID', playerID);
		io.emit('updated-player-list', connected_players);
		io.emit('updated-player-count', connected_player_count);
	}

	socket.on('disconnect', function() {
		if(socket.handshake.query.role === 'PLAYER') connected_player_count = connected_player_count - 1;
		log(`${socket.handshake.query.customName} (${socket.handshake.query.customID}) disconnected! total: ${io.of('/').sockets.size}`)
		let player_socket = connected_players.indexOf(socket.handshake.query.customName);
		connected_players.splice(player_socket, 1);
		//console.log(connected_players); //	DEBUG
		io.emit('updated-player-list', connected_players);
		io.emit('updated-player-count', connected_player_count);
	});

	socket.on('admin-receive-information', () => {
		io.emit('updated-player-list', connected_players);
		io.emit('updated-player-count', connected_player_count);
	});

	socket.on('admin-request-log', socketID => {
		TEMP_admin_received_log.push(socketID);
		//console.log(TEMP_admin_log);	//	DEBUG
		io.emit('admin-receive-log', TEMP_admin_log);
	});

	socket.on('stop-game', () => {
		log('Admin: Stopped the Game (reloading everyone)')
		io.emit('load-game');
	});

	socket.on('start-game', () => {
		// Get player sockets
		const players = [];
		for (const socket of io.of('/').sockets) {
			if (socket.handshake.query.role === 'PLAYER') {
				players.push(socket);
			}
		}
		const playerIds = players.map(player => player.id);

		// Pool of tasks so they are distributed evenly
		let shuffledTasks = [];

		// Dictionary with key as socket.id and value is array of tasks
		const playerTasks = {};

		// Assign Impostors
		const impostors = _.shuffle(playerIds).slice(0, N_IMPOSTORS);

		// Assign tasks
		taskProgress = {};
		for (let i = 0; i < N_TASKS; i++) {
			for (const player of players) {
				// Make sure there's a pool of shuffled tasks
				if (shuffledTasks.length === 0) {
					shuffledTasks = _.shuffle(TASKS);
				}
				// Male sure the Player wont get the same Task twice
				if (!playerTasks[player.id]) {
					playerTasks[player.id] = {};
				}

				const taskId = uuid();
				let nextTask = shuffledTasks.pop();
				//playerTasks[player.id][taskId] = shuffledTasks.pop();
				if(!playerTasks[player.id].hasOwnProperty(nextTask)) {
					playerTasks[player.id][taskId] = nextTask;
				}

				if (!impostors.includes(player.id)) {
					taskProgress[taskId] = false;
				}
			}
		}

		console.log('player tasks', playerTasks);

		/**
		 * Generating an array of the Impostors.
		 * This Array is then getting send to the Impostors.
		 */
		const ImpostorNames = [];
		for (const [id, socket] of io.of('/').sockets) {
			if(socket.handshake.query.role === 'PLAYER' && impostors.includes(id)) {
				ImpostorNames.push(socket.handshake.query.customName);
			}
		}
		io.emit('receive-impostors', ImpostorNames);
		console.log('Impostors: ' + ImpostorNames);

		// Sending role to Players
		for (const [id, socket] of io.of('/').sockets) {
			if (socket.handshake.query.role === 'PLAYER') {
				socket.emit('getID', id);
				if (impostors.includes(id)) {
					socket.emit('role', 'Impostor');
					log(`${socket.handshake.query.customName} (${id}) is Impostor!`);
				} else {
					socket.emit('role', 'Crewmate');
					console.log(`${socket.handshake.query.customName} (${id}) is Crewmate!`);
				}
			}
		}

		for (const [id, socket] of io.of('/').sockets) {
			if (playerIds.includes(id)) {
				socket.emit('tasks', playerTasks[id]);
			}
		}

		io.emit('start-game');

		emitTaskProgress();
	});

	socket.on('report', (customName) => {
		log(`Player Reported: ${customName} -> Emergency Meeting started!`);
		io.emit('play-report');
	});

	socket.on('emergency-meeting', (customName) => {
		log(`Emergency Meeting: ${customName} -> started the Meeting!`);
		io.emit('play-meeting');
	});

	socket.on('stop-meeting', () => {
		log('Admin: Emergency Meeting stopped!');
		io.emit('stop-meeting');
	});

	let sabotage_running = false;

	function start_sabotage_timer() {
		let sabotage_timer = setInterval(timer, 1000);
		let countdown = N_TIME_SABOTAGE;

		function timer() {
			countdown = countdown - 1;
			console.log(sabotage_running);
			if(sabotage_running === true) {
				log('Sabotage Timer: ' + countdown);
				if (countdown === 0) {
					clearInterval(sabotage_timer);
					log('Sabotage Timer reached zero!');
					log('Impostor(s) won the game!');
					io.emit('impostor-win');
				}
			} else {
				clearInterval(sabotage_timer);
			}
		}
	}

	socket.on('player-killed', customName => {
		log(`Impostor: ${customName} -> Killed a Player!`);
	})

	socket.on('sabotage', (customName) => {
		log(`Impostor: ${customName} -> Sabotage started!`);
		sabotage_running = true;
		//start_sabotage_timer();
		io.emit('sabotage-start');
	});

	socket.on('stop-sabotage', () => {
		log('Admin: Sabotage stopped!');
		sabotage_running = false;
		console.log(sabotage_running);
		io.emit('sabotage-stop');
	});

	socket.on('admin-impostor-win', () => {
		log('Admin: Emitting Impostor win!');
		io.emit('impostor-win');
	})

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

function emitTaskProgress() {
	const tasks = Object.values(taskProgress);
	const completed = tasks.filter(task => task).length;
	let total = completed / tasks.length;
	if(isNaN(total)) total = 0;
	log(`Emitting Progress to: ${total}%`);
	io.emit('progress', total);

	if (total === 1) {
		log('The Crew won the game!');
		io.emit('crew-win');
	}
}

function log(message) {
	let d, hours ,minutes, seconds, log_message;
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
		log_message = hours + ':' + minutes + ':' + seconds + ' | AMONG US > ' + message;
		io.emit('admin-receive-single-log', log_message);
		TEMP_admin_log.push(log_message);
		console.log(log_message);
	}
}
TEMP_admin_log.push(`Server listening on ${network_results["WLAN"]}:${PORT}`);
server.listen(PORT, () => console.log(`Server listening on ${network_results["WLAN"]}:${PORT}`));
console.log(`Here is a link to the Admin panel: http://${network_results['WLAN']}:${PORT}/admin
Here is a link for the Player's: http://${network_results['WLAN']}:${PORT}`);