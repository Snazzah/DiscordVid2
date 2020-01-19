const Command = require('../structures/Command');
const Util = require('../util');
const config = require('config');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const FileType = require('file-type');
const { escapeMarkdown } = require('discord.js');
const AbortController = require('abort-controller');
const generateVideo = require('../videogen');
const logger = require('../logger')('[GEN-CMD]');

module.exports = class Generate extends Command {
  get name() { return 'generate'; }

  get _options() { return {
    aliases: ['gen', 'g', 'download', 'dl'],
    cooldown: 10,
  }; }

  preload() {
    this.MESSAGES = [
      // this_vid2
      'Downloaded!',
      'Here\'s your video!',
      'Take a look, y\'all:',
      'Check it out:',
      'Done!',
      'Download complete!',
      'Uploaded!',
      'Sorted. :+1:',
      'I got it!',

      // this__vid3
      'Here you go!',
      'I got it!',
      'Easy!',
      'I\'m here!',
      'Don\'t Worry! =)',
      'Gotcha!',
      'Like this?',
      'Beep boop',
      'Sure thing!',
      'Got it boss!',
      'Your video, {{{displayName}}} sir!',
      'Your video has been downloaded, {{{displayName}}}!',
      'Finished!',

      // DiscordVid2
      'I gotcha!',
      'Here ya go!',
      'Video compressed and ready!',
      'Get some popcorn!',
      'Your feature presentation!',
      'Video downloaded! :sunglasses:',
      ':video_camera::arrow_down::white_check_mark:',
      ':film_frames::inbox_tray::white_check_mark:',
      'New message! :envelope_with_arrow:',
      'You\'re gonna love this one!',
      'Nice video!',
      'Video online!',
      'Hey, I downloaded your video!',
      'One pipin\' hot video comin\' right up!',
    ];
  }

  get hasTwitterKeys() {
    return config.has('twitter.consumer') && config.has('twitter.secret') && !!config.get('twitter.consumer') && !!config.get('twitter.secret');
  }

  async getTwitterStatus(id) {
    if(!this.twitterToken) await this.refreshToken();
    const response = await fetch(`https://api.twitter.com/1.1/statuses/show/${id}.json`, {
      headers: {
        Authorization: `Bearer ${this.twitterToken}`,
      },
    });
    if(response.status === 404) {
      return null;
    } else if(response.status === 403) {
      await this.refreshToken();
      return await this.getTwitterStatus(id);
    } else {
      return response.json();
    }
  }

  async refreshToken() {
    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'post',
      body: new URLSearchParams('grant_type=client_credentials'),
      headers: {
        Authorization: `Basic ${Buffer.from(config.get('twitter.consumer') + ':' + config.get('twitter.secret'), 'binary').toString('base64')}`,
      },
    });
    if(response.status === 403) throw new Error('Invalid Twitter Credentials');
    this.twitterToken = (await response.json()).access_token;
  }

  async findMedia(message, { usePast = true } = {}) {
    // Attachment
    if(message.attachments.size)
      return {
        url: message.attachments.first().url,
        spoiler: message.attachments.first().spoiler,
      };

    // Twitter URL detection in content
    if(this.hasTwitterKeys && Util.Regex.twitter.test(message.content)) {
      const [ url, twitterID, videoID ] = message.content.match(Util.Regex.twitter);
      const twitterData = await this.getTwitterStatus(twitterID);
      if(twitterData && twitterData.extended_entities.media) {
        const video = twitterData.extended_entities.media[parseInt(videoID) - 1 || 0] || twitterData.extended_entities.media[0];
        if(video.type === 'video' && video.video_info.variants.find(v => v.content_type === 'video/mp4')) {
          const spoilers = Util.Regex.spoiler.test(message.content) ? message.content.match(Util.Regex.spoiler).map(m => Util.Regex.spoiler.exec(m)[1]) : [];
          const hasSpoiler = url ? spoilers.find(spoil => spoil.includes(url.trim())) !== undefined : false;
          return {
            url: video.video_info.variants.find(v => v.content_type === 'video/mp4').url,
            spoiler: hasSpoiler,
          };
        }
      }
    }

    // URL detection in content
    if(Util.Regex.url.test(message.content)) {
      const targetURL = message.content.match(Util.Regex.url).filter(url => new URL(url).pathname.endsWith('.mp4'))[0];
      const spoilers = Util.Regex.spoiler.test(message.content) ? message.content.match(Util.Regex.spoiler).map(m => Util.Regex.spoiler.exec(m)[1]) : [];
      const hasSpoiler = targetURL ? spoilers.find(spoil => spoil.includes(targetURL.trim())) !== undefined : false;
      if(targetURL) return {
        url: targetURL,
        spoiler: hasSpoiler,
      };
    }

    // Past Messages
    if(usePast) {
      const pastMessages = await message.channel.messages.fetch({
        limit: config.get('pastMessagesLimit'),
        before: message.id,
      });
      const filteredMessages = await Promise.all(pastMessages.array().map(pastMessage => this.findMedia(pastMessage, { usePast: false })));
      return filteredMessages.filter(result => !!result)[0];
    }

    return false;
  }

  async downloadFromURL(url, userID) {
    // Make an AbortController to cut off any hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(controller.abort.bind(controller), config.get('requestTimeout'));

    // Make request
    const response = await fetch(url, { signal: controller.signal })
      .catch(error => {
        if(error.name === 'AbortError')
          return { error: 'Request took too long!' };
        else return { error: 'Couldn\'t fetch from URL!' };
      });
    clearTimeout(timeout);
    if(response.error) return response;

    // Get buffer and check type
    const buffer = await response.buffer();
    const fileType = await FileType.fromBuffer(buffer);
    if(fileType.ext !== 'mp4')
      return { error: 'Invalid file format!' };

    // Assign a random ID and download to cache
    const randomID = Util.Random.id();
    logger.info(`Downloading ${url} for user ${userID} to video id ${randomID}`);
    const filePath = path.join(this.client.dir, config.get('cachePath'), `${randomID}.mp4`);
    // For some reason I can't use streams, so this is the next best option.
    fs.writeFileSync(filePath, buffer);

    return {
      path: filePath,
      outputPath: path.join(this.client.dir, config.get('cachePath'), `${randomID}-out.mp4`),
      id: randomID,
    };
  }

  async exec(message) {
    if(message.channel.type !== 'text' ? false : !message.channel.permissionsFor(message.client.user).has('ATTACH_FILES'))
      return message.channel.send(':stop_sign: I cannot attach files!');

    const displayName = escapeMarkdown(message.member ? message.member.displayName : message.author.username);
    const content = Util.Random.prompt(this.MESSAGES, { displayName });

    const media = await this.findMedia(message);
    if(!media)
      return message.channel.send(':stop_sign: I couldn\'t find a video to download!');

    const input = await this.downloadFromURL(media.url, message.author.id);
    if(input.error)
      return message.channel.send(`:stop_sign: ${input.error}`);

    // Start generating
    message.channel.startTyping();
    await generateVideo(input.path, input.outputPath, {
      discordTag: message.author.tag,
      videoGenPath: path.join(this.client.dir, './src/videogen'),
      id: input.id,
    });
    message.channel.stopTyping();

    logger.info(`Finished processing ${input.id}!`);
    this.client.stats.bumpStat('videos');

    await message.reply(content, {
      files: [{
        attachment: input.outputPath,
        name: `${media.spoiler ? 'SPOILER_' : ''}${input.id}.mp4`,
      }],
    });

    // Cleanup
    fs.unlinkSync(input.path);
    fs.unlinkSync(input.outputPath);
  }

  get metadata() { return {
    description: 'Download a video!',
    note: 'You can simply mention the bot (with no other text) to use this command. You can also use attachments as media.',
  }; }
};
