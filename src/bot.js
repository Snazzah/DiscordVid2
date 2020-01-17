const Discord = require('discord.js');
const dbots = require('dbots');
const Database = require('./database');
const EventHandler = require('./events');
const CommandLoader = require('./commandloader');
const Stats = require('./stats');
const logger = require('./logger')('[DISCORD]');
const posterLogger = require('./logger')('[POSTER]');
const fs = require('fs');
const path = require('path');
const config = require('config');

class DiscordVid2 extends Discord.Client {
  constructor({ packagePath, mainDir } = {}) {
    // Initialization
    const pkg = require(packagePath || `${mainDir}/package.json`);
    const discordConfig = JSON.parse(JSON.stringify(config.get('discord')));
    Object.assign(discordConfig, {
      userAgent: { version: pkg.version },
    });
    super(discordConfig);
    this.dir = mainDir;
    this.pkg = pkg;
    this.logger = logger;

    // Events
    this.on('ready', () => logger.info('Logged in'));
    this.on('warn', s => logger.warn(s));
    this.on('error', s => logger.error(s));
    this.on('disconnected', () => logger.info('Disconnected'));
    this.on('reconnecting', () => logger.warn('Reconnecting'));
    this.on('resume', r => logger.warn(`Resumed. ${r} events were replayed.`));
    if(config.get('debug')) this.on('debug', s => logger.debug(s));

    // SIGINT & uncaught exceptions
    process.once('uncaughtException', err => {
      logger.error('Uncaught Exception:', err.stack);
      setTimeout(() => process.exit(0), 2500);
    });

    process.once('SIGINT', async () => {
      logger.info('Caught SIGINT');
      await this.dieGracefully();
      process.exit(0);
    });

    // Create cache folder if not already
    const cachePath = path.join(this.dir, config.get('cachePath'));
    fs.access(cachePath, fs.constants.F_OK, err => {
      if(err) {
        logger.info('Cache folder does not exist, creating folder.');
        fs.mkdirSync(cachePath);
      } else logger.info('Cache folder exists, skipping');
    });

    process.env.LOGGER_PREFIX = this.logPrefix;
    process.env.LOGGER_DEBUG = config.get('debug');

    logger.info('Client initialized');
  }

  async start() {
    this.db = new Database(this);
    await this.db.connect(config.get('redis'));
    await this.login();
    this.user.setActivity('videos using DiscordVid2', { type: 3 });
    this.stats = new Stats(this);
    this.stats.init();
    this.cmds = new CommandLoader(this, path.join(this.dir, config.get('commandsPath')), config.get('debug'));
    this.cmds.reload();
    this.cmds.preloadAll();
    this.eventHandler = new EventHandler(this);
    if(Object.keys(config.get('botlist')).length) await this.initPoster();
  }

  initPoster() {
    this.poster = new dbots.Poster({
      client: this,
      apiKeys: config.get('botlist'),
      clientLibrary: 'discord.js',
      useSharding: false,
      voiceConnections: () => 0,
    });

    this.poster.post().then(this.onPost).catch(this.onPostFail);
    this.poster.addHandler('autopost', this.onPost);
    this.poster.addHandler('autopostfail', this.onPostFail.bind(this, true));
    this.poster.addHandler('post', this.onPostOne);
    this.poster.addHandler('postfail', this.onPostFail);
    this.poster.startInterval();
  }

  onPost() {
    posterLogger.info('Posted stats to all bot lists.');
  }

  onPostOne(result) {
    posterLogger.info(`Posted to ${result.request.socket.servername}!`);
  }

  onPostFail(e, auto = false) {
    posterLogger.error(`Failed to ${auto ? 'auto-post' : 'post'} in ${e.response.config.url}! (${e.request.method}, ${e.response.status})`);
    console.log(e.response.data);
  }

  login() {
    return super.login(config.get('discordToken'));
  }

  async dieGracefully() {
    logger.info('Slowly dying...');
    super.destroy();
    await this.db.disconnect();
    logger.info('It\'s all gone...');
  }
}

const DVid2 = new DiscordVid2({ mainDir: path.join(__dirname, '..'), packagePath: '../package.json' });
DVid2.start().catch(e => {
  DVid2.logger.error('Failed to start bot! Exiting in 10 seconds...');
  DVid2.logger.error(e);
  setTimeout(() => process.exit(0), 10000);
});