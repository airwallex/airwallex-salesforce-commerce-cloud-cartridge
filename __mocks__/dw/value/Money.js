// Mock for dw/value/Money
class Money {
  constructor(value, currencyCode) {
    this.value = value;
    this.currencyCode = currencyCode;
  }

  getValue() {
    return this.value;
  }

  getCurrencyCode() {
    return this.currencyCode;
  }

  toString() {
    return `${this.value} ${this.currencyCode}`;
  }

  add(other) {
    if (other.currencyCode !== this.currencyCode) {
      throw new Error('Currency mismatch');
    }
    return new Money(this.value + other.value, this.currencyCode);
  }

  subtract(other) {
    if (other.currencyCode !== this.currencyCode) {
      throw new Error('Currency mismatch');
    }
    return new Money(this.value - other.value, this.currencyCode);
  }
}

module.exports = Money;
