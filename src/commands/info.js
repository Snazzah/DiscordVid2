const Command = require('../structures/Command');
const config = require('config');
const Util = require('../util');

module.exports = class Info extends Command {
  get name() { return 'info'; }

  get _options() { return {
    aliases: ['i'],
    cooldown: 0,
  }; }

  async exec(message) {
    const canUseExternalEmoji = message.channel.type == 'text' && message.channel.permissionsFor(message.client.user).has('USE_EXTERNAL_EMOJIS');
    const videoCount = parseInt(await this.client.db.get('videos:total'));
    message.channel.send(
      `> ${canUseExternalEmoji ? '<:DiscordVid2:667610979248504833> ' : ''}**DiscordVid2 *(v${this.client.pkg.version})*** is a port of the twitter account @this\\_\\_vid3 (which is a port of @this\\_vid2)\n` +
      '> The objectively best Discord video downloader bot.\n> \n' +
      `> Videos over **${config.get('video.duration')}** seconds are cut off.\n` +
      `> Media can be found past **${config.get('pastMessagesLimit')}** messages.\n` +
      `> Requests can be dropped if they take longer than **${config.get('requestTimeout') / 1000}** seconds.\n` +
      `> I have created **${Util.formatNumber(videoCount)}** videos.\n> \n` +
      '> GitHub: <https://github.com/Snazzah/DiscordVid2>\n' +
      '> @this\\_\\_vid3 Source: <https://github.com/T-P0ser/this__vid3>\n');
  }

  get metadata() { return {
    description: 'Get information about the bot.',
  }; }
};
