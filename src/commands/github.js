const Command = require('../structures/Command');

module.exports = class GitHUb extends Command {
  get name() { return 'github'; }

  get _options() { return {
    aliases: ['gh'],
    cooldown: 0,
  }; }

  exec(message) {
    message.channel.send('Here is the link to my source code!\n:arrow_forward:  <https://github.com/Snazzah/DiscordVid2>');
  }

  get metadata() { return {
    description: 'Sends the bot\'s open source link.',
  }; }
};
