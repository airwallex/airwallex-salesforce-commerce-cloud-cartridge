// Mock for dw/system/Status
class Status {
  constructor(code, status, message) {
    this.code = code;
    this.status = status || '';
    this.message = message || '';
  }
}

Status.OK = 0;
Status.ERROR = 1;

module.exports = Status;
