module.exports = {
  decodeBase64: jest.fn((base64) => Buffer.from(base64, 'base64').toString('utf8')),
};
