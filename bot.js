const { Client, GatewayIntentBits } = require('discord.js');
const { createReadStream } = require('fs');
const {
    createAudioResource,
    createAudioPlayer,
    AudioPlayerStatus,
    StreamType,
    joinVoiceChannel,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const config = require('./config.json');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let speakingDelayTimeout;
const speakingDelayTime = 500; // Delay time of 1.5 seconds before playing audio
let currentlyPlaying = false;
let file;

async function connectAndRun(connection, targetUser) {
    file = getRandomAudioResource();
    const player = createAudioPlayer();
    const subscription = connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        console.log('Finished playing');
        currentlyPlaying = false;  // Mark as not currently playing
        file = getRandomAudioResource();  // Get the next audio resource

        if (file) {
            console.log('New audio resource loaded, ready for next play');
        } else {
            console.error('Failed to load audio resource'); // Only log an error if a resource cannot be loaded
        }
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        subscription.unsubscribe();
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log('Voice connection destroyed');
    });

    connection.receiver.speaking.on('start', (user) => {
        if (user === targetUser.id) {
            console.log(`${targetUser.username} started speaking`);

            // Clear any previous delay timeout if the user starts speaking again
            clearTimeout(speakingDelayTimeout);

            // Start the delay timer to play audio after 1.5 seconds
            speakingDelayTimeout = setTimeout(() => {
                console.log(`${targetUser.username} has been speaking, playing audio...`);
                if (!currentlyPlaying) {  // Play audio only if not already playing
                    currentlyPlaying = true;
                    player.play(file); // Play the file after the delay
                }
            }, speakingDelayTime);
        }
    });

    connection.receiver.speaking.on('stop', (user) => {
        if (user === targetUser.id) {
            console.log(`${targetUser.username} stopped speaking`);

            // Clear the timer when they stop speaking before the delay is complete
            clearTimeout(speakingDelayTimeout);

            if (currentlyPlaying) {
                player.stop();  // Stop the player when the user stops speaking
                currentlyPlaying = false;  // Mark as not currently playing anymore
            }
        }
    });
}

function getRandomAudioResource() {
    const audioFiles = config.audioFiles;
    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    const path = audioFiles[randomIndex];
    try {
        const readStream = createReadStream(path);
        return createAudioResource(readStream, { inputType: StreamType.Arbitrary });
    } catch (err) {
        console.error(`Failed to create audio resource for ${path}`);
        return null;  // Return null if there is an error loading the file
    }
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
    console.log('Voice state update detected');
    const channel = newState.channel;
    const targetUser = client.users.cache.get(config.targetUser);

    if (newState.member.user.id === targetUser.id && channel) {
        console.log('Target user joined a voice channel');

        if (oldState.channel) {
            const connection = voice.getVoiceConnection(oldState.guild.id);
            if (connection) {
                connection.destroy();
            }
        }

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


