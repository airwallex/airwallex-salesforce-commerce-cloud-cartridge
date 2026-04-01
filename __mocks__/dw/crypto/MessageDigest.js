const crypto = require('crypto');

class MessageDigest {
  constructor(algorithm) {
    this.algorithm = algorithm.toLowerCase().replace('-', '');
  }

  digest(input) {
    return crypto.createHash(this.algorithm).update(input).digest('hex');
  }
}

MessageDigest.DIGEST_SHA_256 = 'SHA-256';
MessageDigest.DIGEST_SHA_512 = 'SHA-512';

module.exports = MessageDigest;
