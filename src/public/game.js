/*
 * Copyright (c) 2021, Bastian Leicht <mail@bastainleicht.de>
 *
 * PDX-License-Identifier: BSD-2-Clause
 */
const DEBUG = true;

/**
 * 	Loading customID and customName.
 * 	If there are none they get generated.
 */
if(localStorage.getItem('customID') === null) {
	const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	localStorage.setItem('customID', id);
	log(`Generated and saved customID: ${id}`);
}

if(localStorage.getItem('customName') === null) {
	const playerName = 'Player' + Math.floor(Math.random() * 50 + 1);
	localStorage.setItem('customName', playerName)
	log(`Generated and saved customName: ${playerName}`);
}

let impostor$ = false;
let killed$ = false;

//	Custom Settings
const save_customID$ = localStorage.getItem('customID');
const save_customName$ = localStorage.getItem('customName');
//	Game Image & Loading
const waitingPreloader$ = document.querySelector('#game-loading');
const emergencyImage$ = document.querySelector('#emergency-meeting-image');
const deadBodyImage$ = document.querySelector('#dead-body-image');
// Player Control
const playerControls$ = document.querySelector('#player-controls');
const emergencyMeeting$ = document.querySelector('#emergency-meeting');
const report$ = document.querySelector('#report');
//	Impostor Control
const impostorControls$ = document.querySelector('#impostor-controls');
const killPlayer$ = document.querySelector('#kill-player');
const sabotage$ = document.querySelector('#sabotage');
// Music stuff
const enableMusic$ = document.querySelector('#enable-music');
const disableMusic$ = document.querySelector('#disable-music');
//	Task Progress Bar
const progress$ = document.querySelector('#progress');
const progressBar$ = document.querySelector('.progress-bar');
//	Everything else
const tasks$ = document.querySelector('#tasks');
const player_uuid$ = document.querySelector('#player-uuid');
const player_custom_name$ = document.querySelector('#player-custom-name');

/**
 * Setting up the Websocket
 */
const socket = io({
	query: {
		role: 'PLAYER',
		customID: save_customID$,
		customName: save_customName$,
	}
});

log(`Got customName: ${save_customName$}`)
log(`Got customID: ${save_customID$}`)

/**
 *	Sounds
 */
const soundPlayer = new Audio();
soundPlayer.play();
const backgroundMusicPlayer = new Audio('/sounds/title-song.mp3');
const SOUNDS = {
	meeting: '/sounds/meeting.mp3',
	sabotage: '/sounds/sabotage.mp3',
	start: '/sounds/start.mp3',
	sussyBoy: '/sounds/sussy-boy.mp3',
	voteResult: '/sounds/vote-result.mp3',
	youLose: '/sounds/you-lose.mp3',
	youWin: '/sounds/you-win.mp3'
};

player_custom_name$.innerHTML = localStorage.getItem('customName')

report$.addEventListener('click', () => {
	socket.emit('report');
	report$.disabled = true;
});

emergencyMeeting$.addEventListener('click', () => {
	socket.emit('emergency-meeting');
	emergencyMeeting$.disabled = true;
});

enableMusic$.addEventListener('click', async () => {
	log('Music Enabled')
	enableMusic$.classList.remove('enabled');
	enableMusic$.classList.add('disabled');
	disableMusic$.classList.remove('disabled');
	disableMusic$.classList.add('enabled');
	await backgroundMusicPlayer.play();
});

disableMusic$.addEventListener('click', async () => {
	log('Music Disabled');
	enableMusic$.classList.remove('disabled');
	enableMusic$.classList.add('enabled');
	disableMusic$.classList.remove('enabled');
	disableMusic$.classList.add('disabled');
	await backgroundMusicPlayer.pause();
});

socket.on('load-game', async () => {
	window.location.reload();
})

socket.on('getID', id => {
	log(`Received Player ID: ${id}`);
	player_uuid$.innerHTML = id;
});

socket.on('tasks', tasks => {
	log('Game Started!');
	log('Received Tasks');
	console.log(tasks);
	// Remove existing tasks
	while (tasks$.firstChild) {
		tasks$.removeChild(tasks$.firstChild);
	}

	for (const [taskId, task] of Object.entries(tasks)) {
		const task$ = document.createElement('li');
		const label$ = document.createElement('label');

		const checkbox$ = document.createElement('input');
		checkbox$.type = 'checkbox';
		// checkbox.name = "name";
		// checkbox.value = "value";
		// checkbox.id = "id";
		checkbox$.onchange = event => {
			log('Checkbox changed: ' + event.target.checked);
			if (event.target.checked) {
				socket.emit('task-complete', taskId);
			} else {
				socket.emit('task-incomplete', taskId);
			}
		};

		label$.appendChild(checkbox$);
		label$.appendChild(document.createTextNode(task));

		task$.appendChild(label$);
		tasks$.appendChild(task$);
	}
});

socket.on('role', role => {
	hideRole();
	if(role === 'Impostor') {
		impostor$ = true;
		impostorControls$.classList.remove('disabled');
		impostorControls$.classList.add('enabled');
	}
	const role$ = document.createElement('a');
	role$.classList.add('role');
	role$.appendChild(
		document.createTextNode(`You are a(n) ${role}. Click to dismiss.`)
	);
	role$.onclick = () => hideRole();

	document.body.appendChild(role$);
});

socket.on('start-game', async () => {
	//TODO: Add waiting screen
	log('Game started!');
	waitingPreloader$.classList.remove('enabled');
	waitingPreloader$.classList.add('disabled');
	log('Disabled waitingPreloader');
	playerControls$.classList.remove('disabled');
	playerControls$.classList.add('enabled');
	log('Enabled playerControls')
	await playSound(SOUNDS.start);
});

socket.on('progress', progress => {
	let calc_progress = progress * 100
	log(`Updated Progress to: ${calc_progress}%`)
	progress$.innerHTML = (progress * 100).toFixed(0);
	progressBar$.style.width = `${progress * 100}%`;
});

socket.on('play-report', async  () => {
	log('Player Report: Emergency Meeting Started!');
	deadBodyImage$.classList.remove('disabled');
	deadBodyImage$.classList.add('enabled');
	playerControls$.classList.remove('enabled');
	playerControls$.classList.add('disabled');
	await playSound(SOUNDS.meeting);
	await wait(2000);
	await playSound(SOUNDS.sussyBoy);
})

socket.on('play-meeting', async () => {
	log('Emergency Meeting Started!');
	emergencyImage$.classList.remove('disabled');
	emergencyImage$.classList.add('enabled');
	playerControls$.classList.remove('enabled');
	playerControls$.classList.add('disabled');
	await playSound(SOUNDS.meeting);
	await wait(2000);
	await playSound(SOUNDS.sussyBoy);
});

socket.on('stop-meeting', async () => {
	log('Emergency Meeting Ended (Stopped)!');
	emergencyImage$.classList.add('disabled');
	emergencyImage$.classList.remove('enabled');
	deadBodyImage$.classList.add('disabled');
	deadBodyImage$.classList.remove('enabled');
	playerControls$.classList.add('enabled');
	playerControls$.classList.remove('disabled');
	emergencyMeeting$.disabled = false;
	report$.disabled = false;
})

socket.on('play-win', async () => {
	await playSound(SOUNDS.youWin);
});

async function wait(milliseconds) {
	await new Promise(resolve => {
		setTimeout(() => resolve(), milliseconds);
	});
}

function hideRole() {
	document.querySelectorAll('.role').forEach(element => (element.style.display = 'none'));
}

async function playSound(url) {
	soundPlayer.src = url;
	await soundPlayer.play();
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
