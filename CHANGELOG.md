## [1.23.0] - 2026-09-23

### Changed
- Payment Intent creation now sends the storefront website origin, so card-network reports use the site where the shopper paid.

## [1.22.0] - 2026-08-28

### Fixed
- Corrected payment-method attribution for Apple Pay and Google Pay Express Checkout transactions.

## [1.21.0] - 2026-08-21

### Fixed
- Card checkout now validates pending payments, restores reusable sessions, and guides shoppers back to payment after stale, declined, or failed attempts
- Express Checkout buttons no longer appear on the final order review step

### Security
- Payment client secrets are no longer stored on order payment instruments

## [1.19.0] - 2026-08-05

### Changed
- Simplified Business Manager setup by removing the `app_storefront_base` requirement from its cartridge path
- Improved opt-in diagnostics by batching logs per execution and associating them with the correct merchant account

## [1.18.1] - 2026-07-15

### Added
- Optional Airwallex analytics setting in Business Manager to share sanitized diagnostic logs with Airwallex for troubleshooting

## [1.17.0] - 2026-07-07

### Added
- Support for the Airi payment method, with localized display names and Business Manager configuration

## [1.16.6] - 2026-06-16

### Fixed
- Windows build: the storefront client JavaScript now compiles on Windows, where the build previously failed to locate the client bundle files.

## [1.16.5] - 2026-06-15

### Fixed
- Windows setup: `npm install` no longer fails on npm 11, and the build and cartridge-upload scripts now run on Windows as well as macOS and Linux.

## [1.16.4] - 2026-05-18

### Changed
- Apple Pay and Google Pay express checkout buttons on the product page and mini-cart now render simultaneously instead of being limited to one surface at a time.

## [1.16.3] - 2026-05-12

### Changed
- Business Manager Simplified Chinese locale changed from `zh` to `zh-CN` (SFCC properties bundle is now `airwallex_zh_CN.properties`); removed the unused "English (US)" entry from the language picker

## [1.16.0] - 2026-04-28

### Changed
- Translation resources are now managed from JSON source files while preserving existing EN, JA, ZH and HE coverage

### Fixed
- Prevent duplicate express checkout buttons and duplicate SDK loads after PDP quantity or variation updates

## [1.15.1] - 2026-04-21

### Added
- Apple Pay and Google Pay express checkout on the Product Detail Page, letting shoppers pay directly from the PDP

### Fixed
- Prevent duplicate Airwallex SDK loading and ensure express checkout surfaces render in the correct order
