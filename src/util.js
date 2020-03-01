const mustache = require('mustache');
const config = require('config');

exports.keyValueForEach = (obj, func) => Object.keys(obj).map(key => func(key, obj[key]));

exports.sliceKeys = (obj, f) => {
  const newObject = {};
  exports.keyValueForEach(obj, (k, v) => {
    if(f(k, v)) newObject[k] = v;
  });
  return newObject;
};

exports.formatNumber = num => num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');

exports.Random = {
  int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  bool() {
    return exports.Random.int(0, 1) === 1;
  },
  array(array) {
    return array[exports.Random.int(0, array.length - 1)];
  },
  shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  },
  prompt(prompts, context) {
    return mustache.render(exports.Random.array(prompts), context);
  },
  id() {
    return Math.random().toString(36).substring(2, 15);
  },
};

exports.Prefix = {
  regex(client, prefixes = config.get('prefixes')) {
    return new RegExp(`^((?:<@!?${client.user.id}>|${prefixes.map(prefix => exports.Escape.regex(prefix)).join('|')})\\s?)(\\n|.)`, 'i');
  },
  strip(message, client, prefixes) {
    return message.content.replace(exports.Prefix.regex(client, prefixes), '$2').replace(/\s\s+/g, ' ').trim();
  },
};

exports.Regex = {
  escape: /[-/\\^$*+?.()|[\]{}]/g,
  url: /https?:\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?/gi,
  spoiler: /\|\|\s*?([^|]+)\s*?\|\|/gi,
  twitter: /https?:\/\/twitter\.com\/\w+\/status\/(\d{17,19})(?:\/(?:video\/(\d))?)?/,
};

exports.Escape = {
  regex(s) {
    return s.replace(exports.Regex.escape, '\\$&');
  },
};