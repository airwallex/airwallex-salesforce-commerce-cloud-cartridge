import server from 'server';
import csrf from '@/cartridge/scripts/middleware/csrf';

declare const module: NodeJS.Module & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  superModule: any;
};

server.extend(module.superModule);

server.prepend('MiniCartShow', csrf.generateToken, (req, res, next) => {
  next();
});

module.exports = server.exports();
