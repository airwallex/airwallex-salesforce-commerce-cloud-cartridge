import type { Quote } from '../../types';

const QUOTE_ROW_CLASS = 'awx-quote-row';
const EXCHANGE_RATE_ROW_CLASS = 'awx-exchange-rate-row';
const EXCHANGE_RATE_CLASS = 'awx-exchange-rate';
const PAY_AMOUNT_ROW_CLASS = 'awx-pay-amount-row';
const PAY_AMOUNT_CLASS = 'awx-pay-amount';

const removeElementsByClassName = (className: string): void => {
  document.querySelectorAll(`.${className}`).forEach(el => el.remove());
};

interface CreateQuoteSectionParams {
  label: string;
  content: string;
  rowClassName: string;
  contentSpanClassName: string;
}

const createQuoteSection = (params: CreateQuoteSectionParams): HTMLDivElement => {
  const { label, content, rowClassName, contentSpanClassName } = params;
  const row = document.createElement('div');
  row.className = `row leading-lines ${QUOTE_ROW_CLASS} ${rowClassName}`;

  const startCol = document.createElement('div');
  startCol.className = 'col-6 start-lines';
  const labelP = document.createElement('p');
  labelP.className = 'order-receipt-label';
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  labelP.appendChild(labelSpan);
  startCol.appendChild(labelP);

  const endCol = document.createElement('div');
  endCol.className = 'col-6 end-lines';
  const contentP = document.createElement('p');
  contentP.className = 'text-right';
  const contentSpan = document.createElement('span');
  contentSpan.className = contentSpanClassName;
  contentSpan.textContent = content;
  contentP.appendChild(contentSpan);
  endCol.appendChild(contentP);

  row.appendChild(startCol);
  row.appendChild(endCol);
  return row;
};

export const displayQuote = (quote: Quote): void => {
  const { client_rate, payment_currency, target_currency, target_amount } = quote;

  const grandTotalEl = document.querySelector('.grand-total');
  if (!grandTotalEl) {
    return;
  }
  removeQuote();

  const exchangeRateContent = `1 ${payment_currency} = ${client_rate} ${target_currency}`;
  const payContent = `${target_amount} ${target_currency}`;

  const exchangeRateSection = createQuoteSection({
    label: window.i18nResources.exchangeRate,
    content: exchangeRateContent,
    rowClassName: EXCHANGE_RATE_ROW_CLASS,
    contentSpanClassName: EXCHANGE_RATE_CLASS,
  });
  const paySection = createQuoteSection({
    label: window.i18nResources.pay,
    content: payContent,
    rowClassName: PAY_AMOUNT_ROW_CLASS,
    contentSpanClassName: PAY_AMOUNT_CLASS,
  });

  const parent = grandTotalEl.parentElement;
  if (!parent) {
    return;
  }

  const nextSibling = grandTotalEl.nextSibling;
  if (nextSibling) {
    parent.insertBefore(exchangeRateSection, nextSibling);
    parent.insertBefore(paySection, nextSibling);
  } else {
    parent.appendChild(exchangeRateSection);
    parent.appendChild(paySection);
  }
};

export const removeQuote = (): void => {
  removeElementsByClassName(QUOTE_ROW_CLASS);
};
