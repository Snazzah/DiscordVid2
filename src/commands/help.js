const Command = require('../structures/Command');
const config = require('config');
const Util = require('../util');

module.exports = class Help extends Command {
  get name() { return 'help'; }

  get _options() { return {
    aliases: ['?', 'h', 'commands', 'cmds', 'c'],
    cooldown: 0,
  }; }

  async exec(message, { args }) {
    const canUseExternalEmoji = message.channel.type == 'text' && message.channel.permissionsFor(message.client.user).has('USE_EXTERNAL_EMOJIS');
    const commands = this.client.cmds.commands.filter(c => {
      if(!c.options.listed && message && message.author.id !== config.get('owner')) return false;
      return true;
    });
    const prefixes = [...config.get('prefixes'), '@' + this.client.user.tag];

    if(args[0]) {
      const command = this.client.cmds.get(args[0], message);
      if(!command)
        return message.channel.send(':stop_sign: That command couldn\'t be found!');
      message.channel.send(
        `> ${canUseExternalEmoji ? '<:DiscordVid2:667610979248504833> ' : ''}${this.client.user} **${command.name}**\n` +
        `> ${command.metadata.description}\n> \n` +
        `> **Usage:** \`${Util.Random.array(prefixes)} ${command.name}${command.metadata.usage ? ' ' + command.metadata.usage : ''}\`\n` +
        (command.options.aliases.length ? `> **Aliases:** ${command.options.aliases.map(v => '`' + v + '`').join(', ')}\n` : '') +
        (command.metadata.note ? `> **Note:** ${command.metadata.note}` : ''));
    } else message.channel.send(
      `> ${canUseExternalEmoji ? '<:DiscordVid2:667610979248504833> ' : ''}**DiscordVid2** Commands\n> \n` +
      `> **Prefixes:** ${prefixes.map(v => '`' + v + '`').join(', ')}\n` +
      `> **Commands:** ${commands.map(v => '`' + v.name + '`').join(', ')}\n> \n` +
      `> \`${Util.Random.array(prefixes)} help [command]\` for more info`);
  }

  get metadata() { return {
    description: 'Get some help on a command.',
    usage: '[command]',
  }; }
};
