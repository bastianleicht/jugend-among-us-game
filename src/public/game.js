const socket = io({
	query: {
		role: 'PLAYER'
	}
});

const emergencyMeeting$ = document.querySelector('#emergency-meeting');
const enableMusic$ = document.querySelector('#enable-music');
const disableMusic$ = document.querySelector('#disable-music');
const progress$ = document.querySelector('#progress');
const progressBar$ = document.querySelector('.progress-bar');
const report$ = document.querySelector('#report');
const tasks$ = document.querySelector('#tasks');
const player_uuid$ = document.querySelector('#player-uuid');

report$.addEventListener('click', () => {
	socket.emit('report');
});

emergencyMeeting$.addEventListener('click', () => {
	socket.emit('emergency-meeting');
	emergencyMeeting$.style.display = 'none';
});

socket.on('getID', id => {
	log(`Received Player ID: ${id}`)
	player_uuid$.innerHTML = id;
})

socket.on('tasks', tasks => {
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
	const role$ = document.createElement('a');
	role$.classList.add('role');
	role$.appendChild(
		document.createTextNode(`You are a(n) ${role}. Click to dismiss.`)
	);
	role$.onclick = () => hideRole();

	document.body.appendChild(role$);
});

function hideRole() {
	document
		.querySelectorAll('.role')
		.forEach(element => (element.style.display = 'none'));
}

socket.on('progress', progress => {
	let calc_progress = progress * 100
	log(`Updated Progress to: ${calc_progress}%`)
	progress$.innerHTML = (progress * 100).toFixed(0);
	progressBar$.style.width = `${progress * 100}%`;
});

/**
 * Sounds
 */

async function wait(milliseconds) {
	await new Promise(resolve => {
		setTimeout(() => resolve(), milliseconds);
	});
}

const soundPlayer = new Audio();
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

socket.on('play-meeting', async () => {
	await playSound(SOUNDS.meeting);
	await wait(2000);
	await playSound(SOUNDS.sussyBoy);
});

socket.on('play-win', async () => {
	await playSound(SOUNDS.youWin);
});

soundPlayer.play();

enableMusic$.addEventListener('click', async () => {
	log('Music Enabled')
	enableMusic$.classList.remove('music-button-enabled');
	enableMusic$.classList.add('music-button-disabled');
	disableMusic$.classList.remove('music-button-disabled');
	disableMusic$.classList.add('music-button-enabled');
	await backgroundMusicPlayer.play();
});

disableMusic$.addEventListener('click', async () => {
	log('Music Disabled')
	enableMusic$.classList.remove('music-button-disabled');
	enableMusic$.classList.add('music-button-enabled');
	disableMusic$.classList.remove('music-button-enabled');
	disableMusic$.classList.add('music-button-disabled');
	await backgroundMusicPlayer.pause();
})

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
