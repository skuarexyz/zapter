const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const fs = require('fs');

const admins = require('./admins.json');
const bannedUsers = require('./banned.json');
const predictiveTextData = require('./predictive_text/data.json');

const events = []; // stores leaves, joins and messages

/* Adapting from python code:
def train(self, text: str):
    # text is a string of words separated by spaces
    # this function will train the bot with the text
    # it will also update the frequency table
    words = text.split()
    last_word_ended_a_sentence = True
    for i in range(len(words) - 1):
        current_word = words[i]
        next_word = words[i + 1]
        if current_word not in self.frequency_table:
            self.frequency_table[current_word] = {}
        if next_word not in self.frequency_table[current_word]:
            self.frequency_table[current_word][next_word] = 0
        self.frequency_table[current_word][next_word] += 1
        if last_word_ended_a_sentence:
            if current_word not in self.sentence_starting_words:
                self.sentence_starting_words[current_word] = 0
            self.sentence_starting_words[current_word] += 1
        last_word_ended_a_sentence = current_word.endswith('.') or current_word.endswith('?') or current_word.endswith('!')
*/

function trainPredictiveText(text) {
	console.log('Training predictive text');
	const words = text.split(' ');
	let lastWordEndedASentence = true;
	for (let i = 0; i < words.length - 1; i++) {
		const currentWord = words[i];
		const nextWord = words[i + 1];
		if (!Object.keys(predictiveTextData.frequencyTable).includes(currentWord)) {
			predictiveTextData.frequencyTable[currentWord] = {};
		}
		if (!Object.keys(predictiveTextData.frequencyTable[currentWord]).includes(nextWord)) {
			predictiveTextData.frequencyTable[currentWord][nextWord] = 0;
		}
		predictiveTextData.frequencyTable[currentWord][nextWord] += 1;
		if (lastWordEndedASentence) {
			if (!Object.keys(predictiveTextData.sentenceStartingWords).includes(currentWord)) {
				predictiveTextData.sentenceStartingWords[currentWord] = 0;
			}
			predictiveTextData.sentenceStartingWords[currentWord] += 1;
		}
		lastWordEndedASentence = currentWord.endsWith('.') || currentWord.endsWith('?') || currentWord.endsWith('!');
	}
	console.log('Trained predictive text with text: ' + text);
	savePredictionData();
}

// we will train the bot with each message, and then send a socket message with the bot data to the client
// the prediction will be handled client-side

function savePredictionData() {
  	fs.writeFileSync('./predictive_text/data.json', JSON.stringify(predictiveTextData));
}

let usernames = [];

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html');
});

app.get('/*', express.static(__dirname + '/public'));

io.on('connection', (socket) => {
	socket.emit('select name');

	socket.on('set name', (name) => {
		if (name === null)
			return;

		if (usernames.indexOf(name) > -1) {
			socket.emit('name taken');
		} else if (name.includes(' ') || name.includes('@') || name.includes(';')) {
			socket.emit('name invalid');
		} else {
			socket.username = name;
			// get socket data:
			// IP address
			// language
			// user agent
			socket.userData = {
				ip: socket.request.connection.remoteAddress,
				language: socket.request.headers['accept-language'],
				userAgent: socket.request.headers['user-agent']
			};
			// check if user is an admin
			for(let adminAccount of admins) {
				// check if data is identical to admin account
				if(adminAccount.ip === socket.userData.ip && adminAccount.language === socket.userData.language && adminAccount.userAgent === socket.userData.userAgent) {
					socket.isAdmin = true;
					socket.emit('admin');
					console.log('Admin connected: ' + socket.username);
					break;
				}
			}
			// check if user is banned
			for(let bannedUser of bannedUsers) {
				// check if data is identical to banned user account
				if(bannedUser.ip === socket.userData.ip && bannedUser.language === socket.userData.language && bannedUser.userAgent === socket.userData.userAgent) {
					socket.emit('banned', name);
				}
			}
			console.log(name, socket.userData);
			socket.emit('name accepted', {
				name: name,
				onlineUsers: usernames,
				eventHistory: events
			});
			usernames.push(name);
			socket.emit('predictive text', predictiveTextData);
			io.emit('new user', name);
			events.push({
				type: 'join',
				name: name
			});
		}
	});

	socket.on('command', (data) => {
		if (socket.isAdmin) {
			if (data.command === 'reload') {
				io.emit('reload');
			} else if (data.command === 'kick') {
				let user = data.args[0];
				if (user) {
					io.emit('kick', user);
				}
			} else if (data.command === 'ban') {
				let user = data.args[0];
				// get array of all connected sockets
				let sockets = io.of("/").sockets;
				// loop through all sockets
				sockets.forEach((soc) => {
					// check if socket has the same username as the user
					if (soc.username === user) {
						// add to ban list
						bannedUsers.push(soc.userData);
						io.emit('ban', user);
					}
				});
			}
		}
	});
	
	// temporaire i guess
	function uuid() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		  var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		  return v.toString(16);
		});
	}	  

	socket.on('chat message', msg => {
		let genID = uuid();
		console.log(genID);
		io.emit('chat message', {
			username: socket.username,
			message: msg,
			id: genID
		});
		events.push({
			type: 'message',
			username: socket.username,
			message: msg,
			id: genID
		});

		trainPredictiveText(msg);

		io.emit('predictive text', predictiveTextData);
	});

	socket.on('disconnect', () => {
		if (socket.username) {
			io.emit('user left', socket.username);
			events.push({
				type: 'leave',
				name: socket.username
			});
			usernames.splice(usernames.indexOf(socket.username), 1);
		}
	});
});

http.listen(port, () => {
	console.log(`Socket.IO server running at http://localhost:${port}/`);
});
