const Util = require('./util');

module.exports = class Stats {
  constructor(client) {
    this.client = client;
    this.db = client.db;
    const HOUR = this.HOUR = 3600;

    this._keys = {
      'videos:total': null,
      'videos:lastHour': HOUR,
      'videos:lastDay': HOUR * 24,
      'videos:lastWeek': HOUR * 24 * 7,

      'messages:total': null,
      'messages:lastHour': HOUR,
      'messages:lastDay': HOUR * 24,
      'messages:lastWeek': HOUR * 24 * 7,
    };
  }

  async init() {
    Util.keyValueForEach(this._keys, this._prepKey.bind(this));
  }

  async _prepKey(key, expires) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const exists = await this.db.exists(key).catch(e => reject(e));
      if(!exists) {
        await this.db.set(key, 0).catch(e => reject(e));
        if(expires !== null) await this.db.expire(key, expires).catch(e => reject(e));
      }
      resolve();
    });
  }

  prepKeysStart(start) {
    return this.prepThis(Util.sliceKeys(this._keys, k => k.startsWith(start)));
  }

  prepThis(keys) {
    return Util.keyValueForEach(keys, this._prepKey.bind(this));
  }

  incrAll(start) {
    return this.incrThis(Util.sliceKeys(this._keys, k => k.startsWith(start)));
  }

  incrThis(keys) {
    return Util.keyValueForEach(keys, this.db.incr.bind(this.db));
  }

  bumpStat(stat) {
    this.prepKeysStart(stat);
    this.incrAll(stat);
  }

  async bumpCommandStat(command) {
    const stats = {};
    stats[`commands:${command}:total`] = null;
    stats[`commands:${command}:lastHour`] = this.HOUR;
    stats[`commands:${command}:lastDay`] = this.HOUR * 24;
    stats[`commands:${command}:lastWeek`] = this.HOUR * 24 * 7;
    this.prepThis(stats);
    this.incrAll(stats);
  }
};
