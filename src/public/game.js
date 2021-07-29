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
	window.location.replace('/');
	//const playerName = 'Player' + Math.floor(Math.random() * 50 + 1);
	//localStorage.setItem('customName', playerName)
	//log(`Generated and saved customName: ${playerName}`);
}
let impostor$ = false;
let sabotage_running$ = false;

//	Custom Settings
const save_customID$ = localStorage.getItem('customID');
const save_customName$ = localStorage.getItem('customName');
//	Game Image & Loading
const waitingPreloader$ = document.querySelector('#game-loading');
const emergencyImage$ = document.querySelector('#emergency-meeting-image');
const deadBodyImage$ = document.querySelector('#dead-body-image');
const sabotageImage$ = document.querySelector('#sabotage-image');
const crewVictoryImage$ = document.querySelector('#crew-win-image');
const impostorVictoryImage$ = document.querySelector('#impostor-win-image');
// Player Control
const playerControls$ = document.querySelector('#player-controls');
const emergencyMeeting$ = document.querySelector('#emergency-meeting');
const report$ = document.querySelector('#report');
//	Impostor Control
const impostorHide$ = document.querySelector('#impostor-hide');
const impostorHideButton$ = document.querySelector('#hide-impostor');
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

log(`Got customName: ${save_customName$}`);
log(`Got customID: ${save_customID$}`);

/**
 * Temp Storage
 */
let TEMP_sabotage_cooldown;
let TEMP_kill_cooldown;

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
/**
 * Player Controls
 */
emergencyMeeting$.addEventListener('click', () => {
	socket.emit('emergency-meeting', save_customName$);
	emergencyMeeting$.disabled = true;
});

report$.addEventListener('click', () => {
	socket.emit('report', save_customName$);
	report$.disabled = true;
});

/**
 * Impostor Controls
 */
let impostor_hidden = false;
impostorHideButton$.addEventListener('click', () => {
	if(impostor_hidden === false) {
		impostorHide$.classList.add('disabled');
		impostor_hidden = true;
	} else {
		impostorHide$.classList.remove('disabled');
		impostor_hidden = false;
	}
})

sabotage$.addEventListener('click', () => {
	socket.emit('sabotage', save_customName$);
	sabotage$.disabled = true;
	TEMP_sabotage_cooldown = setInterval(timer, 1000);
	let countdown = 30;

	function timer() {
		countdown = countdown - 1;
		//meetingTimer$.innerHTML = countdown;
		if(countdown === 0) {
			clearInterval(TEMP_sabotage_cooldown);
			report$.disabled = false;
		}
	}
});

killPlayer$.disabled = true;

/**
 * Music Controls
 */
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
	log(`Socket: Received Player ID: ${id}`);
	player_uuid$.innerHTML = id;
});

socket.on('tasks', tasks => {
	log('Socket: Received Tasks from Socket');
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
			log('Socket: Checkbox changed: ' + event.target.checked);
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

let impostor_player
socket.on('receive-impostors', impostors => {
	impostor_player = impostors;
});

socket.on('role', role => {
	log(`Socket: Received role: ${role}`);
	hideRole();
	const role$ = document.createElement('a');
	role$.classList.add('role');
	if(role === 'Impostor') {
		impostor$ = true;
		impostorControls$.classList.remove('disabled');
		impostorControls$.classList.add('enabled');
		impostorHideButton$.classList.remove('disabled');
		role$.appendChild(
			document.createTextNode(`You are a(n) ${role} with ${impostor_player.toString()}. Click to dismiss.`)
		);
	} else {
		role$.appendChild(
			document.createTextNode(`You are a(n) ${role}. Click to dismiss.`)
		);
	}
	role$.onclick = () => hideRole();

	document.body.appendChild(role$);
});

socket.on('start-game', async () => {
	log('Socket: Game started!');
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
	log(`Socket: Updated Progress to: ${calc_progress}%`)
	progress$.innerHTML = (progress * 100).toFixed(0);
	progressBar$.style.width = `${progress * 100}%`;
});

socket.on('play-report', async  () => {
	log('Socket: Player Report -> Emergency Meeting Started!');
	deadBodyImage$.classList.remove('disabled');
	deadBodyImage$.classList.add('enabled');
	playerControls$.classList.remove('enabled');
	playerControls$.classList.add('disabled');
	await playSound(SOUNDS.meeting);
	await wait(2000);
	await playSound(SOUNDS.sussyBoy);
})

socket.on('play-meeting', async () => {
	log('Socket: Emergency Meeting Started!');
	emergencyImage$.classList.remove('disabled');
	emergencyImage$.classList.add('enabled');
	playerControls$.classList.remove('enabled');
	playerControls$.classList.add('disabled');
	await playSound(SOUNDS.meeting);
	await wait(2000);
	await playSound(SOUNDS.sussyBoy);
});

socket.on('stop-meeting', async () => {
	log('Socket: Emergency Meeting Ended (Stopped)!');
	emergencyImage$.classList.add('disabled');
	emergencyImage$.classList.remove('enabled');
	deadBodyImage$.classList.add('disabled');
	deadBodyImage$.classList.remove('enabled');
	playerControls$.classList.add('enabled');
	playerControls$.classList.remove('disabled');
	emergencyMeeting$.disabled = false;
	report$.disabled = false;
});

socket.on('sabotage-start', async () => {
	log('Socket: Sabotage started!');
	sabotageImage$.classList.remove('disabled');
	sabotageImage$.classList.add('enabled');
	playerControls$.classList.remove('enabled');
	playerControls$.classList.add('disabled');
});

socket.on('sabotage-stop', async () => {
	log('Socket: Sabotage stopped!');
	sabotageImage$.classList.remove('enabled');
	sabotageImage$.classList.add('disabled');
	playerControls$.classList.remove('disabled');
	playerControls$.classList.add('enabled');
})

socket.on('crew-win', async () => {
	log('Socket: The Crew won the Game!');
	crewVictoryImage$.classList.remove('disabled');
	crewVictoryImage$.classList.add('enabled');
	playerControls$.classList.remove('enabled');
	playerControls$.classList.add('disabled');
	if(impostor$ === true) {
		await playSound(SOUNDS.youLose);
	} else {
		await playSound(SOUNDS.youWin);
	}
});

socket.on('impostor-win', async () => {
	log('Socket: The Impostor(s) won the Game!');
	impostorVictoryImage$.classList.remove('disabled');
	impostorVictoryImage$.classList.add('enabled');
	if(sabotage_running$ === true) {
		sabotageImage$.classList.remove('enabled');
		sabotageImage$.classList.add('disabled');
	} else {
		playerControls$.classList.remove('enabled');
		playerControls$.classList.add('disabled');
	}
	if(impostor$ === true) {
		await playSound(SOUNDS.youWin);
	} else {
		await playSound(SOUNDS.youLose);
	}
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
