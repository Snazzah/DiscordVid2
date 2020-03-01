const Command = require('../../structures/Command');
const config = require('config');
const Util = require('../../util');
const { exec } = require('child_process');

module.exports = class Exec extends Command {
  get name() { return 'exec'; }

  get _options() { return {
    listed: false,
  }; }

  codeBlock(content, lang = null) {
    return `\`\`\`${lang ? `${lang}\n` : ''}${content}\`\`\``;
  }

  async exec(message) {
    if(message.author.id !== config.get('owner')) return;
    message.channel.startTyping();
    exec(Util.Prefix.strip(message, this.client).split(' ').slice(1).join(' '), (err, stdout, stderr) => {
      message.channel.stopTyping();
      if(err) return message.channel.send(this.codeBlock(err, 'js'));
      message.channel.send((stderr ? this.codeBlock(`STDOUT Error: ${stderr}`, 'js') + '\n' : '') + this.codeBlock(stdout));
    });
  }

  get metadata() { return {
    description: 'Utilizes child_process.exec',
  }; }
};
