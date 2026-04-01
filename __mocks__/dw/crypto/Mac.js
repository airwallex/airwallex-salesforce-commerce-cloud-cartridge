const crypto = require('crypto');

class Mac {
  constructor(algorithm) {
    this.algorithm = algorithm;
  }

  digest(data, key) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    return Buffer.from(hmac.digest('hex'), 'hex');
  }
}

Mac.HMAC_SHA_256 = 'HmacSHA256';

module.exports = Mac;
