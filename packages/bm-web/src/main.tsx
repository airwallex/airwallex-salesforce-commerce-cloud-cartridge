import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Global, css } from '@emotion/react';

import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Global
      styles={css`
        // Document root element
        :root {
          --app-padding: 52px;
          --color-white: #ffffff;
          --color-black: #000000;
          --color-gray-5: #fafafb;
          --color-gray-10: #f5f6f7;
          --color-gray-20: #e8eaed;
          --color-gray-30: #d0d4d9;
          --color-gray-40: #b0b6bf;
          --color-gray-50: #878e99;
          --color-gray-60: #68707a;
          --color-gray-70: #4c5259;
          --color-gray-80: #2b2f33;
          --color-gray-90: #1b1f21;
          --color-gray-100: #14171a;
          --color-purple-5: #f7f7ff;
          --color-purple-10: #f0efff;
          --color-purple-20: #dfdeff;
          --color-purple-30: #cbc9ff;
          --color-purple-40: #aba8ff;
          --color-purple-50: #867dff;
          --color-purple-60: #6b54f0;
          --color-purple-70: #612fff;
          --color-purple-80: #5500e5;
          --color-purple-90: #320094;
          --color-purple-100: #15005c;
          --color-blue-5: #f0f9ff;
          --color-blue-40: #3ac0fc;
          --color-green-5: #effbf4;
          --color-green-20: #baf2d1;
          --color-green-40: #49d189;
          --color-green-80: #054f2c;
          --color-orange-5: #fff6ef;
          --color-orange-40: #ff8e3c;
          --color-red-5: #fff5f5;
          --color-red-10: #ffe7e5;
          --color-red-20: #ffcecc;
          --color-red-30: #ffaaa6;
          --color-red-40: #fc796d;
          --color-red-50: #ff4f42;
          --color-red-60: #d91807;
          --color-text-subtle: #6c747f;
          --shadow-card: 0px 0px 16px 0px rgba(0, 0, 0, 0.08);
        }

        // Airwallex root element (App component)
        #root {
          padding: var(--app-padding);

          * {
            box-sizing: border-box;
            font-family: Helvetica, Arial, sans-serif;
          }
        }
      `}
    />
    <App />
  </StrictMode>,
);
