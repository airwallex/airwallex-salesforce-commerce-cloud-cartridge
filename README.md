# Airwallex Payments Cartridge for Salesforce Commerce Cloud

The Airwallex Payments Cartridge is a prebuilt integration for Salesforce Commerce Cloud (SFCC) Storefront Reference Architecture (SFRA) that enables merchants to accept 160+ payment methods through Airwallex — including credit cards, Apple Pay, Google Pay, and a wide range of local payment methods — while benefiting from competitive FX rates through Like-for-Like (LFL) settlement.

## Shopper Checkout Experience

When a shopper reaches checkout on an SFCC storefront powered by this cartridge, they can expect:

- **Express checkout** — Apple Pay and Google Pay buttons appear at the top of the checkout page, enabling one-tap purchases with shipping address and payment collected in a single step.
- **Onsite credit/debit card payments** — A secure, PCI-compliant card form (card number, expiry, CVC) rendered via the Airwallex Components SDK. Supports Visa, Mastercard, American Express, UnionPay, JCB, Diners Club, and Discover.
- **Additional local payment method options** — Region-specific payment options such as Alipay, WeChat Pay, iDEAL, Klarna, Afterpay, GrabPay, DANA, PIX, and 160+ more — automatically presented based on the shopper's currency and region.
- **Auto or manual capture** — Merchants can choose to capture payments automatically at order placement or manually at a later time (e.g., at fulfillment).

## Compatibility

| Requirement                | Version         |
| -------------------------- | --------------- |
| SFCC B2C Commerce          | SFRA 5.x+       |
| Node.js (build only)       | 20.x or later   |
| Storefront Reference Architecture | Required |

## Architecture

The cartridge is composed of three modules:

| Cartridge        | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `int_airwallex`  | Server-side integration — API clients, payment processing, webhooks, jobs |
| `app_airwallex`  | Storefront UI — ISML templates, client-side JavaScript, checkout flow   |
| `bm_airwallex`   | Business Manager module — Airwallex settings configuration page         |

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Prepare and Import Metadata](#2-prepare-and-import-metadata)
3. [Download, Build, and Upload the Cartridge](#3-download-build-and-upload-the-cartridge)
4. [Configure SFCC to Enable the Cartridge](#4-configure-sfcc-to-enable-the-cartridge)
5. [Configure Airwallex Settings in Business Manager](#5-configure-airwallex-settings-in-business-manager)
6. [Configure Webhooks](#6-configure-webhooks)
7. [Enable the Webhook Processing Job](#7-enable-the-webhook-processing-job)
8. [Go-Live Checklist](#8-go-live-checklist)

---

## 1. Prerequisites

Before installing the cartridge, ensure you have:

1. **SFCC Administrator access** — with permissions to upload code, import site data, and configure Business Manager.
2. **SFRA installed** — The [Storefront Reference Architecture](https://github.com/SalesforceCommerceCloud/storefront-reference-architecture) repository cloned and deployed to your realm.
3. **Node.js 18+** — installed on your local machine for building the cartridge.
4. **Airwallex account** — with API credentials (Client ID and API Key) for your target environment. Sign up at [airwallex.com](https://www.airwallex.com) if you don't have one.
5. **WebDAV access key** — generated from SFCC Account Manager for uploading cartridges. See [Salesforce documentation on WebDAV authentication](https://documentation.b2c.commercecloud.salesforce.com/DOC1/index.jsp?topic=%2Fcom.demandware.dochelp%2Fcontent%2Fb2c_commerce%2Ftopics%2Fadmin%2Fb2c_access_keys_for_business_manager.html).

---

## 2. Prepare and Import Metadata

The metadata import creates all the necessary system object extensions, custom objects, services, payment methods, payment processors, and scheduled jobs in your SFCC realm.

### What gets imported

| Component                  | Details                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| **Site Preferences**       | Airwallex settings group (`awx_v1_*`) — environment, API credentials, feature toggles |
| **System Object Extensions** | Custom attributes on `Basket`, `Order`, and `OrderPaymentInstrument`          |
| **Custom Object**          | `AirwallexWebhookEvent` — queue for asynchronous webhook processing             |
| **Payment Processors**     | `AIRWALLEX_CREDIT_CARD`, `AIRWALLEX_ONLINE`                                     |
| **Payment Methods**        | `AirwallexCreditCard`, `AirwallexOnline`                                        |
| **Service**                | `AirwallexPublicAPI` — HTTP service for Airwallex API calls                     |
| **Job**                    | `AirwallexProcessWebhooks` — processes webhook events every 5 minutes           |

### Steps

1. Open the `metadata/site_import/` folder in the repository.

2. **Rename the site folder** — Inside `metadata/site_import/sites/`, rename `RefArchGlobal` to match your site ID as it appears in Business Manager (e.g., `RefArch`, or your custom site ID).

3. **Update the job site ID** — Open `metadata/site_import/jobs.xml` and replace `RefArchGlobal` in the `<context site-id="RefArchGlobal"/>` line with your site ID:

   ```xml
   <context site-id="YourSiteId"/>
   ```

4. **Zip the folder** — Create a ZIP archive of the `site_import` folder. The ZIP should contain the `site_import` folder at its root.

5. **Import in Business Manager**:
   - Go to **Administration > Site Development > Site Import & Export**
   - Click **Upload** and select your ZIP file
   - After the upload completes, select the archive and click **Import**
   - Verify the import completes without errors

### Verify the import

After importing, confirm the following were created:

- **Administration > Site Development > System Object Types > SitePreferences > Attribute Definitions** — attributes prefixed with `awx_v1_` should appear
- **Administration > Site Development > System Object Types > Order > Attribute Definitions** — attributes prefixed with `awx` should appear
- **Administration > Site Development > Custom Object Types** — `AirwallexWebhookEvent` should appear
- **Merchant Tools > Ordering > Payment Methods** — `AirwallexCreditCard` and `AirwallexOnline` should appear
- **Merchant Tools > Ordering > Payment Processors** — `AIRWALLEX_CREDIT_CARD` and `AIRWALLEX_ONLINE` should appear
- **Administration > Operations > Services** — `AirwallexPublicAPI` service, credential, and profile should appear
- **Administration > Operations > Jobs** — `AirwallexProcessWebhooks` should appear

---

## 3. Download, Build, and Upload the Cartridge

### Step 1: Clone the repository

```bash
git clone <repository-url>
cd payment-plugin-salesforce
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Create the environment file

Create a `.env` file in the project root with the cartridge names:

```bash
APP_AIRWALLEX_CARTRIDGE_NAME="app_airwallex"
BM_AIRWALLEX_CARTRIDGE_NAME="bm_airwallex"
INT_AIRWALLEX_CARTRIDGE_NAME="int_airwallex"
```

### Step 4: Build the cartridge

```bash
npm run build-compile
```

This compiles the TypeScript source in `src/` and outputs deployable JavaScript to the `cartridges/` directory. It also builds the Business Manager React UI.

### Step 5: Configure your SFCC connection

Create a `dw.json` file in the project root with your SFCC credentials:

```json
{
  "hostname": "your-sfcc-realm.dx.commercecloud.salesforce.com",
  "username": "your-username@example.com",
  "password": "your-webdav-access-key",
  "code-version": "version_to_upload_to"
}
```

| Field          | Description                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| `hostname`     | Your SFCC realm hostname (from Business Manager > Administration > Site Development > Development Setup) |
| `username`     | Your Business Manager username                                                                            |
| `password`     | Your WebDAV access key (not your BM password — generate from Account Manager > API Client)                |
| `code-version` | The active code version on your realm (visible in Business Manager > Administration > Site Development > Code Deployment) |

> **Security note:** The `dw.json` file is git-ignored by default. Never commit this file to version control.

### Step 6: Upload the cartridge

```bash
npm run uploadCartridge
```

You can also upload individual cartridges:

```bash
npm run uploadCartridge:int   # int_airwallex only
npm run uploadCartridge:app   # app_airwallex only
npm run uploadCartridge:bm    # bm_airwallex only
```

<details>
<summary>Advanced: Custom cartridge names</summary>

If your project requires custom cartridge names, create a `.env` file with:

```bash
INT_AIRWALLEX_CARTRIDGE_NAME=int_airwallex_custom
BM_AIRWALLEX_CARTRIDGE_NAME=bm_airwallex_custom
APP_AIRWALLEX_CARTRIDGE_NAME=app_airwallex_custom
```

Then use the `:env` variants of the upload commands:

```bash
npm run uploadCartridge:env
```

</details>

---

## 4. Configure SFCC to Enable the Cartridge

After uploading, you need to register the cartridges in Business Manager so SFCC loads them.

### 4.1 Add cartridges to the storefront site path

1. Go to **Administration > Sites > Manage Sites**
2. Select your storefront site (e.g., `RefArch`)
3. Open the **Settings** tab
4. In the **Cartridges** field, prepend the Airwallex cartridges to the existing path:

   ```
   app_airwallex:int_airwallex:app_storefront_base
   ```

   If you have other cartridges, place `app_airwallex:int_airwallex` **before** `app_storefront_base` but after any custom overlay cartridges:

   ```
   your_custom_cartridge:app_airwallex:int_airwallex:app_storefront_base
   ```

5. Click **Apply**

### 4.2 Add cartridges to Business Manager

1. Go to **Administration > Sites > Manage Sites > Business Manager** site
2. Open the **Settings** tab
3. In the **Cartridges** field, add:

   ```
   bm_airwallex:int_airwallex:app_storefront_base
   ```

4. Click **Apply**

### 4.3 Grant Business Manager module permissions

1. Go to **Administration > Organization > Roles & Permissions**
2. Select the **Administrator** role (or the relevant role)
3. Click **Business Manager Modules**
4. In the dialog, check the box next to your site(s) to enable the Airwallex module, or select **Select All**
5. Click **Update**

### 4.4 Enable payment methods

1. Go to **Merchant Tools > Ordering > Payment Methods**
2. Ensure **AirwallexCreditCard** is enabled (checkbox in the Enabled column)
3. Ensure **AirwallexOnline** is enabled
4. Optionally adjust the sort order to control how payment methods appear at checkout

### 4.5 Enable Apple Pay

To enable Apple Pay, you must register your store domain with Airwallex. Follow the steps below:

#### 1. Configure Domain Alias in SFCC

1. Make sure the **int_airwallex** cartridge is enabled for the current site.
2. Go to **Merchant Tools > SEO > Aliases**.
3. Define the following alias so that the domain association file is externally accessible at the path required by Apple:

```json
{
  "__version": "1",
  "settings": {
    "http-host": "your.sandbox-domain.com",
    "https-host": "your.sandbox-domain.com",
    "default": "true",
    "site-path": "/"
  },
  "your.sandbox-domain.com": [
    {
      "locale": "YOUR_LOCALE",
      "if-site-path": "/"
    }
  ]
}
```

Replace `your.sandbox-domain.com` with your actual store domain and `YOUR_LOCALE` with your default site locale.

#### 2. Register Domain with Airwallex

1. Go to [Airwallex Apple Pay Settings](https://www.airwallex.com/app/acquiring/settings/apple-pay/add-domain).
2. Enter your store domain (e.g. `your.sandbox-domain.com`).
3. Click **Add** to complete the domain registration.

---

## 5. Configure Airwallex Settings in Business Manager

After enabling the cartridge, you'll find a dedicated Airwallex settings page in Business Manager.

### Access the settings page

1. Navigate to **Merchant Tools > Site Preferences > Airwallex Settings**
2. You should see the Airwallex configuration interface

### Configure your credentials

The cartridge supports three Airwallex environments. Configure the credentials for the environment you want to use:

| Setting               | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **Environment**       | Select `Sandbox` or `Production`. |
| **Client ID**         | Your Airwallex API Client ID for the selected environment.                                    |
| **API Key**           | Your Airwallex API Key for the selected environment.                                          |
| **Webhook Secret**    | The webhook signing secret from your Airwallex account (see [Configure Webhooks](#6-configure-webhooks)). |

> **Where to find your credentials:** Log in to [Airwallex](https://www.airwallex.com/app) > **Settings > Developer > API keys**. Generate a new API key pair if needed.

### Configure payment features

| Setting                       | Default | Description                                                                                          |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| **Auto Capture**              | `true`  | When enabled, payments are automatically captured when the order is placed. Disable for manual capture (e.g., capture at fulfillment). |
| **Enable Credit Card**        | `false` | Enable credit/debit card payments at checkout.                                                       |
| **Enable Apple Pay**          | `false` | Enable Apple Pay express checkout. Requires Apple Pay to be configured in your Airwallex account.     |
| **Enable Google Pay**         | `false` | Enable Google Pay express checkout. Requires Google Pay to be configured in your Airwallex account.   |
| **Enable Airwallex Analytics** | `false` | When enabled, diagnostic logs are sent to Airwallex to help troubleshoot integration issues.         |

> **Important:** Payment methods must be activated in your Airwallex account before enabling them in the cartridge. Log in to [Airwallex](https://www.airwallex.com/app) > **Payments > Payment methods > Other available payment methods** to activate the desired payment methods.

### Airwallex environments

| Environment   | URL                    | Usage                                          |
| ------------- | ------------------------------- | ---------------------------------------------- |
| `Sandbox`        | `demo.airwallex.com`        | Pre-production testing with sandbox credentials    |
| `Production`  | `airwallex.com`             | Live transactions with real payment methods     |

We recommend starting with `Sandbox` for initial setup and testing, then switching to `Production` when ready to go live.

---

## 6. Configure Webhooks

Webhooks allow Airwallex to notify your SFCC storefront about asynchronous payment events (e.g., successful payments, refunds). This is critical for keeping order statuses in sync.

### Step 1: Register the webhook URL in Airwallex

1. In your SFCC realm, go to **Merchant Tools > Site Preferences > Airwallex Settings** and copy the **Webhook URL**
2. Log in to [Airwallex WebApp](https://www.airwallex.com)
3. Go to **Settings > Developer > Webhooks** and create a new webhook
4. Paste the copied URL into the **Notification URL**
5. Subscribe to the following events:
   - `payment_intent.succeeded`
   - `refund.accepted`
6. Copy the **Webhook Secret** that Airwallex generates

### Step 2: Save the webhook secret in Business Manager

1. In your SFCC realm, go to **Merchant Tools > Site Preferences > Airwallex Settings**
2. Paste the webhook secret in the **Webhook Secret** field for the environment
3. Save your changes

### How webhooks work

1. Airwallex sends a `POST` request to your webhook endpoint with the event payload.
2. The cartridge verifies the request signature using HMAC-SHA256 with your webhook secret and the `x-signature` / `x-timestamp` headers.
3. Requests with timestamps older than 5 minutes are rejected for replay attack protection.
4. Valid events are enqueued as `AirwallexWebhookEvent` custom objects for asynchronous processing.
5. The scheduled job (see next section) processes queued events and updates order statuses.

---

## 7. Enable the Webhook Processing Job

The `AirwallexProcessWebhooks` job processes queued webhook events every 5 minutes. It should have been created during the metadata import, but you need to verify it's enabled and configured for your site.

1. In your SFCC realm, go to **Administration > Operations > Jobs**
2. Find `AirwallexProcessWebhooks`
3. Open the job and verify:
   - The **Site Context** is set to your site ID (update if needed)
   - The schedule is set to run every 5 minutes
4. If the job is not already enabled, click **Enable** or toggle it on

The job processes up to 100 pending webhook events per run, with up to 3 retries for failed events. Completed events are automatically cleaned up after 30 days.

---

## 8. Go-Live Checklist

Before switching to production, verify the following:

- [ ] **Metadata imported** — All site preferences, custom objects, services, payment methods, processors, and jobs are present in your production realm.
- [ ] **Cartridges uploaded** — `int_airwallex`, `app_airwallex`, and `bm_airwallex` are uploaded to the active code version.
- [ ] **Cartridge paths configured** — Both the storefront site and Business Manager site have the correct cartridge paths.
- [ ] **Environment set to `Production`** — In Airwallex Settings, switch from `Sandbox` to `Production`.
- [ ] **Production credentials entered** — Client ID, API Key, and Webhook Secret for the production environment are configured.
- [ ] **Payment methods enabled** — Credit Card, Apple Pay, and/or Google Pay are toggled on in Airwallex Settings, and the corresponding methods are activated in your Airwallex account.
- [ ] **Payment methods enabled in SFCC** — `AirwallexCreditCard` and `AirwallexOnline` are enabled in Merchant Tools > Ordering > Payment Methods.
- [ ] **Webhook endpoint registered** — The production webhook URL is configured in the Airwallex WebApp, and the webhook secret is saved in Business Manager.
- [ ] **Webhook job enabled** — `AirwallexProcessWebhooks` job is enabled and running on schedule.
- [ ] **Test transactions** — Place test orders using each enabled payment method and verify order statuses update correctly.
- [ ] **Refund test** — Process a test refund from the Airwallex WebApp and verify the order status updates via webhook.

---

## Troubleshooting

### Checking service logs

The `AirwallexPublicAPI` service has communication logging enabled by default. To view API request/response logs:

1. Go to **Administration > Operations > Services**
2. Click on **AirwallexPublicAPI**
3. Check the **Communication Log** for recent requests

### Common issues

| Issue                                    | Solution                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Payment methods not appearing at checkout | Verify the cartridge path order, ensure payment methods are enabled both in SFCC and in your Airwallex account. |
| API authentication failures              | Double-check Client ID and API Key for the active environment. Ensure they match the correct Airwallex environment. |
| Webhook events not processing            | Verify the webhook secret is correct, the job is enabled, and the webhook URL is accessible from the internet. |
| Order status not updating after payment  | Check that the `AirwallexProcessWebhooks` job is running. Review `AirwallexWebhookEvent` custom objects for failed events. |
| Express checkout buttons not appearing   | Ensure Apple Pay / Google Pay are enabled in Airwallex Settings and configured in your Airwallex account. Apple Pay also requires domain verification. |

---

## Development

### Project structure

```
payment-plugin-salesforce/
├── src/                           # TypeScript source
│   ├── int_airwallex/             # Server-side integration
│   │   └── cartridge/scripts/
│   │       ├── airwallex/api/     # HTTP clients (auth, paymentIntent, refund)
│   │       ├── airwallex/models/  # Domain models
│   │       ├── airwallex/util/    # Signature verification, helpers
│   │       ├── constants/         # API endpoints, enums
│   │       ├── helpers/           # Logger, config, currency/order utilities
│   │       ├── hooks/             # SFCC lifecycle hooks
│   │       ├── jobs/              # Background jobs
│   │       └── controllers/       # API endpoints
│   ├── app_airwallex/             # Storefront UI
│   │   └── cartridge/
│   │       ├── templates/         # ISML templates
│   │       └── client/            # Client-side JavaScript
│   └── bm_airwallex/              # Business Manager UI
├── cartridges/                    # Compiled output (git-ignored)
├── metadata/site_import/          # Site import metadata
├── __mocks__/                     # SFCC module mocks for testing
├── __tests__/                     # Test files
├── packages/bm-web/               # Business Manager React app
└── package.json
```

### Commands

| Command                    | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `npm run build`            | Compile TypeScript and build BM UI               |
| `npm test`                 | Run Jest tests                                   |
| `npm run lint`             | Run ESLint                                       |
| `npm run lint:fix`         | Run ESLint with auto-fix                         |
| `npm run uploadCartridge`  | Upload all cartridges to SFCC realm           |

---

## License

MIT
