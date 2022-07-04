import socketio
import signal

# on keyboardinterrupt, close socket
def close_socket(sio):
    sio.disconnect()
    print("Socket closed")
    exit(0)

class ZapterUser:
    def __init__(self):
        self.sio = socketio.Client()
        self.sentenceStartingWords = {}
        self.frequencyTable = {}
        signal.signal(signal.SIGINT, lambda x, y: close_socket(self.sio))
    
    def connect(self, url, username):
        self.sio.connect(url)
        self.username = username
        # if message handler exists
        if hasattr(self, "on_message"):
            self.sio.on('chat message', self.on_message)

        self.sio.on('select name', self.on_select_name)
        self.sio.on('name taken', self.on_name_taken)
        self.sio.on('name accepted', self.on_name_accepted)
        self.sio.on('kick', self.on_kick)
        self.sio.on('ban', self.on_ban)
        self.sio.on('predictive text', self.on_predictive_text)

    # event handlers
    def on_select_name(self):
        self.sio.emit('set name', self.username)
    
    def on_name_taken(self):
        # name is already taken
        print("Name is already taken")
        self.username += "_"
        self.sio.emit('set name', self.username)
    
    def on_name_accepted(self, data):
        print("Connected to Zapter")

    def on_kick(self, data):
        # if we are kicked, disconnect
        if data == self.username:
            self.sio.disconnect()
            print("Disconnected")
            exit(0)
        
    def on_ban(self, data):
        if data == self.username:
            self.sio.disconnect()
            print("Disconnected")
            exit(0)
    
    def on_message(self, data): pass

    def sendMessage(self, message):
        self.sio.emit('chat message', message)

    def on_predictive_text(self, data):
        self.sentenceStartingWords = data['sentenceStartingWords']
        self.frequencyTable = data['frequencyTable']