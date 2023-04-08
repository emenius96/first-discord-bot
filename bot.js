const {Client, Events, GatewayIntentBits} = require('discord.js');
const voice = require('@discordjs/voice');
const config = require('./config.json');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const { createReadStream } = require('fs');
const { createAudioResource, createAudioPlayer, AudioPlayerStatus, StreamType, joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');

function connectAndRun(connection, targetUser){
    const audioFiles = config.audioFiles;
    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    const audioFile = audioFiles[randomIndex];
    let resource = createAudioResource(createReadStream(audioFiles[randomIndex]), { inputType: StreamType.Arbitrary });
    const player = createAudioPlayer();
    const subscription = connection.subscribe(player);
    

    if (player['_events']['idle']) return;
    player.on(AudioPlayerStatus.Idle, () => {
      const newRandomIndex = Math.floor(Math.random() * audioFiles.length);
      const newAudioFile = audioFiles [newRandomIndex]
      resource = createAudioResource(createReadStream(newAudioFile), { inputType: StreamType.Arbitrary });
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      subscription.unsubscribe();
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log('Voice connection destroyed');
    })
    
    connection.receiver.speaking.on('start', (user) => {
        if (user === targetUser.id) {
            console.log(`ready function: ${targetUser.username} is speaking`);
              player.play(resource);
        }
    });

    connection.receiver.speaking.on('stop', (user) => {
        if (user === targetUser.id) {
            console.log(`ready function: ${targetUser.username} stopped speaking`);
            player.stop();
        }
    });
}



client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const targetUser = client.users.cache.get(config.targetUser);
  const guild = client.guilds.cache.get(config.guildId);
  const member = guild.members.cache.get(targetUser.id);
  const channel = member.voice.channel;
  
  if (channel) {
    console.log(`Target user is in channel ${channel.name}`);
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    connectAndRun(connection, targetUser);
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  console.log('voice state update detected');
  const channel = newState.channel;
  const targetUser = client.users.cache.get(config.targetUser);
    console.log(targetUser);
  // Check if the target user is joining a new voice channel
  if (newState.member.user.id === targetUser.id && channel) {
    console.log('target user joined a voice channel');

    // Destroy the previous connection if the user was already in a voice channel
    if (oldState.channel) {
      const connection = voice.getVoiceConnection(oldState.guild.id);
      if (connection) {
        connection.destroy();
      }
    }

    // Join the new voice channel
    const connection = joinVoiceChannel({
      channelId: newState.channel.id,
      guildId: newState.guild.id,
      adapterCreator: newState.guild.voiceAdapterCreator,
    });

 
    connectAndRun(connection, targetUser);
  }
});

process.on('SIGINT', () => {
  console.log('Stopping the bot...');
  client.destroy();
});

client.login(config.token);

