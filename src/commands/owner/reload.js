const Command = require('../../structures/Command');
const config = require('config');

module.exports = class Reload extends Command {
  get name() { return 'reload'; }

  get _options() { return {
    aliases: ['r'],
    listed: false,
  }; }

  async exec(message) {
    if(message.author.id !== config.get('owner')) return;
    const canUseExternalEmoji = message.channel.type == 'text' && message.channel.permissionsFor(message.client.user).has('USE_EXTERNAL_EMOJIS');
    const sentMessage = await message.channel.send(`${canUseExternalEmoji ? '<a:matchmaking:415045517123387403>' : ':recycle:'} Reloading commands...`);
    this.client.cmds.reload();
    this.client.cmds.preloadAll();
    sentMessage.edit(`${canUseExternalEmoji ? '<:check:314349398811475968>' : ':white_check_mark:'} Reloaded commands.`);
  }

  get metadata() { return {
    description: 'Reload commands.',
  }; }
};
