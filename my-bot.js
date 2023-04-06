const {Client, Events, GatewayIntentBits} = require('discord.js');
const config = require('./config.json')
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { createReadStream } = require('fs');
const { createAudioResource, AudioPlayerStatus, StreamType, joinVoiceChannel } = require('@discordjs/voice');

client.once(Events.ClientReady, c => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = config.targetUser; 
  if (newState.member.user.id === userId && newState.channel) {
    const connection = joinVoiceChannel({
      channelId: newState.channel.id,
      guildId: newState.guild.id,
      adapterCreator: newState.guild.voiceAdapterCreator,
    });

    const resource = createAudioResource(createReadStream(config.audioFile), { inputType: StreamType.Arbitrary });
    const player = connection.subscribe(resource);

    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });
  }
});
z
client.login(config.token);
