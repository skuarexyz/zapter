from time import sleep
import zapterpy, random

bot_name = 'StoopidBot'

class StoopidBot(zapterpy.ZapterUser):
    def on_name_accepted(self, data):
        super().on_name_accepted(data)
        self.sendMessage('what\'s up motherfuckers')
    
    def on_message(self, data):
        if data['username'] != self.username:
            if data['message'].startswith('!'):
                words = data['message'].split(' ')
                command = words[0][1:]
                args = words[1:]
                if command == 'generate':
                    if len(args) == 0:
                        self.sendMessage('!generate <number of words>')
                    else:
                        # generate a message
                        last_word_ended_a_sentence = True
                        gen_words = []
                        for i in range(int(args[0])):
                            print(gen_words)
                            if last_word_ended_a_sentence:
                                # take a random sentence starting word
                                word = random.choice(list(self.sentenceStartingWords.keys()))
                                gen_words.append(word)
                            else:
                                if gen_words[-1] in list(self.frequencyTable.keys()):
                                    # take one of the 3 most common words following the previous word
                                    frequencies = self.frequencyTable[gen_words[-1]]
                                    # get the three most common words
                                    common_words = list(frequencies.keys())[:min(len(frequencies.keys()), 3)]
                                    # get a random word from the three most common words
                                    word = random.choice(common_words)
                                    gen_words.append(word)
                            last_word_ended_a_sentence = word.endswith('.') or word.endswith('!') or word.endswith('?')
                        self.sendMessage(' '.join(gen_words))
                elif command == 'proto':
                    # I AM PROTO, SECURITY IS MY... MOTTO
                    self.sendMessage('I AM PROTO, SECURITY IS MY... MOTTO')
                    self.sendMessage('https://www.youtube.com/watch?v=PIp06sdFHLM')
                elif command == 'help':
                    self.sendMessage('!generate <number of words>')
                    self.sendMessage('!proto')
                    self.sendMessage('!fuckoff')
                elif command == 'fuckoff':
                    self.sendMessage('bye fuckers')
                    sleep(0.1)
                    self.sio.disconnect()
                    print('them damn motherfuckers told me to fuck off')
                    exit()
                else:
                    self.sendMessage('the bro @' + data['username'] + '; here doesn\'t know how to use the bot, @all; laugh at this user')
            else:
                if data['message'].endswith('quoi') or data['message'].endswith('quoi ?') or data['message'].endswith('quoi?'):
                    self.sendMessage('feur')
                if 'mdr' in data['message'].lower():
                    self.sendMessage('***MDR***')
                if f'@{self.username};' in data['message'] or f'@all;' in data['message']:
                    # send ping copypasta
                    self.sendMessage('''Absolutely UNACCEPTABLE! I cannot begin to comprehend why you just pinged me on the Zapter app. It seems the divide between you and I (on intellectual levels) is greater than I could have ever imagined. While I was busy creating the next big thing, you and your underdeveloped brain decided to humor me with “comedy gold,” as others have said recently. Well, you certainly have failed to humor me — in fact, you have actually made me quite upset. It is for that I applaud you, I truly do. You may have just been the first of the cesspool of commoners to finally pique my attention, the first whose utter stupidity has finally caught the interest of a higher being. Well, I’m listening. What is it today, “Funnyman?” Is it another mediocre meme? Another “le epic copypasta?” This is the first and last time I acknowledge a Funnyman. In fact, this is the last time any Funnyman will be acknowledged. Image permissions will be removed starting immediately, and a one minute slow mode is being enacted in that very moment. You’ve done God’s work, Funnyman. You finally broke the last straw and ruined it for everyone else. I grow gleeful at just the thought of you writhing in pain the next time you go to shitpost, realizing quickly that this liberty is no more; know it is not a liberty, it is an act of insubordination, treason, terrorism.''')

try:
    bot = StoopidBot()
    bot.connect('https://6802-2a01-cb11-6bc-a900-f0e1-f274-2c15-2cd.ngrok.io/', bot_name)
except KeyboardInterrupt:
    print('Exiting')
    exit(0)
except Exception as e:
    print(e)
    exit(1)