const Encoding = {
  toHex(bytes) {
    return Buffer.from(bytes).toString('hex');
  },
  fromHex(hex) {
    return Buffer.from(hex, 'hex');
  },
  toBase64(bytes) {
    return Buffer.from(bytes).toString('base64');
  },
  fromBase64(base64) {
    return Buffer.from(base64, 'base64');
  },
};

module.exports = Encoding;
