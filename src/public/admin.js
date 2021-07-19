/*
 * Copyright (c) 2021, Bastian Leicht <mail@bastainleicht.de>
 *
 * PDX-License-Identifier: BSD-2-Clause
 */
const DEBUG = true;

const socket = io({
	query: {
		role: 'ADMIN',
		customID: '0',
		customName: 'Admin',
	}
});

const startGame$ = document.querySelector('#start-game');
const stopGame$ = document.querySelector('#stop-game');	//TODO:
const stopMeeting$ = document.querySelector('#stop-emergency-meeting');

startGame$.addEventListener('click', () => {
	log('Started the Game');
	socket.emit('start-game');
});

stopMeeting$.addEventListener('click', () => {
	log('Stopped Emergency Meeting');
	socket.emit('stop-meeting');
});

/**
 * Sounds
 */
const SOUNDS = {
	meeting: new Audio('/sounds/meeting.mp3'),
	sabotage: new Audio('/sounds/sabotage.mp3'),
	start: new Audio('/sounds/start.mp3'),
	sussyBoy: new Audio('/sounds/sussy-boy.mp3'),
	voteResult: new Audio('/sounds/vote-result.mp3'),
	youLose: new Audio('/sounds/you-lose.mp3'),
	youWin: new Audio('/sounds/you-win.mp3')
};

socket.on('play-meeting', async () => {
	log('An Emergency Meeting was started!')
	await SOUNDS.meeting.play();
	await wait(2000);
	await SOUNDS.sussyBoy.play();
});

socket.on('play-win', async () => {
	await SOUNDS.youWin.play();
});

async function wait(milliseconds) {
	await new Promise(resolve => {
		setTimeout(() => resolve(), milliseconds);
	});
}

function log(message) {
	let d, hours ,minutes, seconds;
	if ('undefined' !== typeof console && DEBUG) {
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

/*
socket.emit('send-player-list');

socket.on('receive-player-list', player_list => {
	console.log(`Received player list!`)
	console.log(player_list)
	for(let player of player_list) {
		console.log(player.customName)
		console.log(`Player (${player.handshake.query.customName}) has connected with ID: ${player.id}`)
	}
});
 */
