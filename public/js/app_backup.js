var socket = io();

var predictiveTextData = {
	sentenceStartingWords: {},
	frequencyTable: {},
}; // will be given to us by the server
var lastPredictedWords = [];

let onlineUsers = [];

var selectedUsername = null;

var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');

var isAdmin = false;
var commands = ['reload', 'kick', 'ban'];

function predictNextWords(word) {
	// predictive data is formed as such:
	/*{
		sentenceStartingWords: {word: frequency},
		frequencyTable: {word: frequency},
	}*/
	// get the 3 most common words after the given word
	console.log(predictiveTextData, word);
	if (Object.keys(predictiveTextData.frequencyTable).includes(word)) {
		var words = Object.keys(predictiveTextData.frequencyTable[word]).sort(function (a, b) {
			return predictiveTextData.frequencyTable[b] - predictiveTextData.frequencyTable[a];
		}).slice(0, 3);
		return words;
	} else {
		return [];
	}
}

function getSentenceStart() {
	// get the 3 most common words at the start of a sentence
	var words = Object.keys(predictiveTextData.sentenceStartingWords).sort(function (a, b) {
		return predictiveTextData.sentenceStartingWords[b] - predictiveTextData.sentenceStartingWords[a];
	}).slice(0, 3);

	return words;
}

form.addEventListener('submit', function (e) {
	e.preventDefault();

	if (isAdmin && input.value.startsWith('..')) {
		let words = input.value.split(' ');
		// remove the .. from the command
		words[0] = words[0].substring(2);
		console.log(words);
		// if in commands
		if (commands.includes(words[0])) {
			socket.emit('command', {
				command: words[0],
				args: words.slice(1)
			});
			input.value = '';
			return;
		}
	}

	if (input.value) {
		socket.emit('chat message', input.value);
		input.value = '';
	}

	var sentenceStart = getSentenceStart();
	if (sentenceStart.length > 0) {
		// clear the prediction bot div
		const predictionBot = document.getElementById('prediction-bot');
		predictionBot.innerHTML = '';
		// add the sentence start words to the prediction bot div
		sentenceStart.forEach(function (word) {
			const wordElement = document.createElement('span');
			wordElement.innerText = word;
			predictionBot.appendChild(wordElement);
		});
		lastPredictedWords = sentenceStart;
	}

	document.body.style.paddingBottom = document.getElementById('messaging-bar').clientHeight + 'px';
});

input.addEventListener('input', function (e) {
	// if last character is a space
	if (input.value.slice(-1) === ' ') {
		// get the last word
		var sentenceWords = input.value.split(' ');
		sentenceWords.pop();
		var lastWord = sentenceWords.pop();
		// if the last word is formated as $ and a number between 1 and 3
		if (lastWord.slice(0, 1) === '$' && lastWord.slice(1).match(/^[1-3]$/)) {
			// replace the last word with the nth word
			var n = lastWord.slice(1);
			// convert to int
			n = parseInt(n);
			// get the nth word
			var nthWord = lastPredictedWords[n - 1];
			// replace the last word with the nth word
			input.value = sentenceWords.join(' ') + ' ' + nthWord + ' ';
		}
		// else if formated as \$ and num
		else if (lastWord.slice(0, 2) === '\$' && lastWord.slice(2).match(/^[1-3]$/)) {
			// replace with raw
			var n = lastWord.slice(2);
			input.value = sentenceWords.join(' ') + ' $' + n + ' ';
		}
		// repeat process
		sentenceWords = input.value.split(' ');
		sentenceWords.pop();
		lastWord = sentenceWords.pop();
		var words = predictNextWords(lastWord);
		lastPredictedWords = words;
		console.log(words);
		// clear the predictive text div
		const predictionBot = document.getElementById('prediction-bot');
		predictionBot.innerHTML = '';
		// if there are words to predict
		if (words.length) {
			words.forEach(function (w) {
				const wordElement = document.createElement('span');
				wordElement.innerText = w;
				predictionBot.appendChild(wordElement);
			});
		} else {
			const elem = document.createElement('span');
			elem.innerText = 'Unknown word...';
			predictionBot.appendChild(elem);
		}
	}
});

socket.on('select name', function () {
	let name = prompt('What is your name?');
	socket.emit('set name', name);
});

socket.on('name taken', function () {
	alert('Name already taken, please select another name.');
	socket.emit('select name');
});

socket.on('name invalid', function () {
	alert('Name invalid, please select another name. (spaces are forbidden)');
	socket.emit('select name');
});

socket.on('name accepted', function (data) {
	document.getElementById('input').placeholder = '@' + data.name;
	selectedUsername = data.name;
	onlineUsers = data.onlineUsers;
	const userList = document.getElementById('online-users');
	const string = '👁️ ' + onlineUsers.join(', ');
	userList.textContent = string;

	// fill event history
	for (let event of data.eventHistory) {
		console.log(event);
		switch (event.type) {
			case 'message':
				message({
					username: event.username,
					message: event.message
				});
				break;
			case 'join':
				userJoined(event.name, true);
				break;
			case 'leave':
				userLeft(event.name, true);
				break;
		}
	}

	window.scrollTo(0, document.body.scrollHeight);

	var sentenceStart = getSentenceStart();
	if (sentenceStart.length > 0) {
		// clear the prediction bot div
		const predictionBot = document.getElementById('prediction-bot');
		predictionBot.innerHTML = '';
		// add the sentence start words to the prediction bot div
		sentenceStart.forEach(function (word) {
			const wordElement = document.createElement('span');
			wordElement.innerText = word;
			predictionBot.appendChild(wordElement);
		});
		lastPredictedWords = sentenceStart;
	}
});

socket.on('admin', function () {
	isAdmin = true;
	var item = document.createElement('li');
	item.innerHTML = `You are an admin! You may use multiple commands:<br>
* ..kick <username> - kick a user from the chat<br>
* ..ban <username> - ban a user from the chat<br>
* ..unban <username> - unban a user from the chat<br>
	alias: pardon<br>
* ..reload - force everyone to refresh the page<br>
This message is only visible to you.`;
	messages.appendChild(item);
});

socket.on('reload', function () {
	location.reload();
});

socket.on('kick', function (name) {
	if (name === selectedUsername) {
		alert('You have been kicked from the chat.');
		// close tab
		window.close();
	} else {
		var item = document.createElement('li');
		item.textContent = `${name} has been kicked from the chat.`;
		messages.appendChild(item);
	}
});

socket.on('ban', function (name) {
	if (name === selectedUsername) {
		alert('You have been banned from the chat.');
		// close tab
		window.close();
	} else {
		var item = document.createElement('li');
		item.textContent = `${name} has been banned from the chat.`;
		messages.appendChild(item);
	}
});

socket.on('predictive text', function (data) {
	predictiveTextData = data;
});

function userJoined(name, doNotCompleteUserList) {
	var item = document.createElement('li');
	item.classList.add('user-joined');
	item.textContent = '@' + name + ' has joined the chat.';
	messages.appendChild(item);
	if (!doNotCompleteUserList) {
		onlineUsers.push(name);
		const userList = document.getElementById('online-users');
		const string = '👁️ ' + onlineUsers.join(', ');
		userList.textContent = string;
	}
}
socket.on('new user', userJoined);

function userLeft(name, doNotCompleteUserList) {
	var item = document.createElement('li');
	item.classList.add('user-left');
	item.textContent = '@' + name + ' has left the chat.';
	messages.appendChild(item);
	if (!doNotCompleteUserList) {
		onlineUsers.splice(onlineUsers.indexOf(name), 1);
		const userList = document.getElementById('online-users');
		const string = '👁️ ' + onlineUsers.join(', ');
		userList.textContent = string;
	}
}
socket.on('user left', userLeft);

function message(data) {
	var item = document.createElement('li');
	var username = document.createElement('span');
	username.classList.add('username');
	username.textContent = data.username;
	var message = document.createElement('span');
	// check if message contains @username; or @all;, and wrap in <span class="mention">
	message.textContent = data.message;
	if (data.message.includes('@' + selectedUsername + ';') || data.message.includes('@all;')) {
		// play sound
		var audio = new Audio('/audio/mention.wav');
		audio.play();
		// wrap in <span class="mention">
		message.innerHTML = message.innerHTML.replace(new RegExp('@' + selectedUsername + ';', 'g'), '<span class="mention">' + selectedUsername + '</span>');
		message.innerHTML = message.innerHTML.replace(new RegExp('@all;', 'g'), '<span class="mention">all</span>');
	}
	// if it contains @anyUsername;
	if (message.innerHTML.match(/@([a-zA-Z0-9_]+);/g)) {
		// wrap in <span class="mention-other">
		message.innerHTML = message.innerHTML.replace(new RegExp('@([a-zA-Z0-9_]+);', 'g'), '<span class="mention-other">$1</span>');
	}
	item.appendChild(username);
	// item.innerText += ' ';
	item.appendChild(message);
	// replace **string** with <strong>string</strong>
	item.innerHTML = item.innerHTML.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
	// replace *string* with <i>string</i>
	item.innerHTML = item.innerHTML.replace(/\*([^*]+)\*/g, '<i>$1</i>');
	// replace __string__ with <u>string</u>
	item.innerHTML = item.innerHTML.replace(/__(.*?)__/g, '<u>$1</u>');
	// replace ~~string~~ with <s>string</s>
	item.innerHTML = item.innerHTML.replace(/\~\~(.*?)\~\~/g, '<s>$1</s>');
	// replace `string` with <code>string</code>
	item.innerHTML = item.innerHTML.replace(/`(.*?)`/g, '<code>$1</code>');
	messages.appendChild(item);
	window.scrollTo(0, document.body.scrollHeight);
}
socket.on('chat message', message);