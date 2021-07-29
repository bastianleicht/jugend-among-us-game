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
//	Sabotage
const sabotageInfo$ = document.querySelector('#info-sabotage');
const sabotageTimer$ = document.querySelector('#sabotage-timer');
//	Meeting
const meetingInfo$ = document.querySelector('#info-meeting');
const meetingTimer$ = document.querySelector('#meeting-timer');
//	Game Controls
const startGame$ = document.querySelector('#start-game');
const stopGame$ = document.querySelector('#stop-game');
const stopMeeting$ = document.querySelector('#stop-emergency-meeting');
const stopSabotage$ = document.querySelector('#stop-sabotage');
const impostorWin = document.querySelector('#impostor-win');
//	Admin Console
const adminConsole$ = document.querySelector('#admin-console');

/**
 * Temporarily stored stuff
 */
let TEMP_core_log;
let TEMP_meeting_timer;
let TEMP_sabotage_timer;

startGame$.addEventListener('click', () => {
	log('Started the Game');
	socket.emit('start-game');
});

stopGame$.addEventListener('click', () => {
	log('Stopped the Game (reloading everyone)');
	clearInterval(TEMP_meeting_timer);
	clearInterval(TEMP_sabotage_timer);
	socket.emit('stop-game');
});

stopMeeting$.addEventListener('click', () => {
	log('Stopped Emergency Meeting');
	socket.emit('stop-meeting');
	clearInterval(TEMP_meeting_timer);
	meetingInfo$.classList.add('disabled');
});

stopSabotage$.addEventListener('click', () => {
	log('Stopped Sabotage');
	socket.emit('stop-sabotage');
	clearInterval(TEMP_sabotage_timer);
	sabotageInfo$.classList.add('disabled');
});

impostorWin.addEventListener('click', () => {
	log('Emitting Impostor win');
	socket.emit('admin-impostor-win');
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

/**
 * Game Log
 */
//	Request the whole log
socket.emit('admin-request-log', socket.id);
log('Requesting Log from Core');
socket.on('admin-receive-log', core_log => {
	TEMP_core_log = core_log;
	log('Socket: Received Core Log: ');
	console.log(TEMP_core_log);
	adminConsole$.innerHTML = core_log.join('\n');
	adminConsole$.scrollTop = adminConsole$.scrollHeight;
});
//	Receive Single Log messages
socket.on('admin-receive-single-log', log_message => {
	if(TEMP_core_log) {
		log(`Socket: Received log message from Core: \n"${log_message}"`);
		TEMP_core_log.push(log_message);
		adminConsole$.append('\n' + log_message);
		adminConsole$.scrollTop = adminConsole$.scrollHeight;
	}
});

socket.on('sabotage-start', async  () => {
	sabotageInfo$.classList.remove('disabled');
	TEMP_sabotage_timer = setInterval(timer, 1000);
	let countdown = 90;

	function timer() {
		countdown = countdown - 1;
		sabotageTimer$.innerHTML = countdown;
		if(countdown === 0) clearInterval(TEMP_sabotage_timer);
	}
});

socket.on('play-meeting', async () => {
	log('An Emergency Meeting was started!')
	meetingInfo$.classList.remove('disabled');
	TEMP_meeting_timer = setInterval(timer, 1000);
	let countdown = 150;

	function timer() {
		countdown = countdown - 1;
		meetingTimer$.innerHTML = countdown;
		if(countdown === 0) clearInterval(TEMP_meeting_timer);
	}

	await SOUNDS.meeting.play();
	await wait(2000);
	await SOUNDS.sussyBoy.play();
});

socket.on('player-report', async () => {
	log('A player was reported -> Emergency Meeting started!')
	meetingInfo$.classList.remove('disabled');
	TEMP_meeting_timer = setInterval(timer, 1000);
	let countdown = 150;

	function timer() {
		countdown = countdown - 1;
		meetingTimer$.innerHTML = countdown;
		if(countdown <= 10) meetingTimer$.style.color = '#dc354';
		if(countdown === 0) clearInterval(TEMP_meeting_timer);
	}

	await SOUNDS.meeting.play();
	await wait(2000);
	await SOUNDS.sussyBoy.play();
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
