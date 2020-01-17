const Command = require('../structures/Command');

module.exports = class Ping extends Command {
  get name() { return 'ping'; }

  get _options() { return {
    aliases: ['p'],
    cooldown: 0,
  }; }

  async exec(message) {
    const currentPing = this.client.ws.ping;
    const timeBeforeMessage = Date.now();
    const sentMessage = await message.channel.send(`> :ping_pong: ***Pong!***\n> WS: ${currentPing} ms`);
    await sentMessage.edit(`> :ping_pong: ***Pong!***\n> WS: ${currentPing} ms\n> REST: ${Date.now() - timeBeforeMessage} ms`);
  }

  get metadata() { return {
    description: 'Pong!',
  }; }
};
