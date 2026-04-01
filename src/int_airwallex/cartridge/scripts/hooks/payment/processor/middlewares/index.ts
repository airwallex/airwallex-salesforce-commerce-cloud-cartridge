import { authorize } from './authorize';
import processForm from './processForm';
import { handle } from './handle';

const middlewares = {
  authorize,
  processForm,
  handle,
};

module.exports = middlewares;
export default middlewares;
