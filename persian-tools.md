@persian-tools/persian-tools
4.0.4 • Public • Published a year ago

PersianTools logo
🇮🇷 Persian Tools

A modern, library-agnostic TypeScript utility for Persian language features.

CI/CD codecov npm version npm downloads bundle size GitHub license PRs Welcome CodeFactor GitHub contributors
✨ Features

Persian Tools provides 27+ utilities for Persian language processing:
🔢 Numbers & Text

    Number Conversion: Persian words ↔ numbers with fuzzy matching
    Digit Conversion: Persian ↔ Arabic ↔ English digits
    Comma Formatting: Add/remove thousands separators
    Ordinal Numbers: Convert to/from ordinal forms

🏛️ Validation & Verification

    National ID: Validate & generate Iranian national codes (کد ملی)
    Legal ID: Validate Iranian legal entity IDs (شناسه حقوقی)
    Phone Numbers: Validate & extract operator info
    Bank Cards: Validate & identify bank names
    IBAN/Sheba: Validate Iranian bank account numbers

🌍 Geographic & Location

    Place Lookup: Find city/province by national ID
    Capital Cities: Get province capitals
    Coordinates: Find province from GPS coordinates
    Vehicle Plates: Parse Iranian license plates

💰 Financial & Utilities

    Bill Calculator: Parse Iranian utility bills
    Bank Detection: Identify banks from card numbers
    IBAN Tools: Complete Iranian banking support

📝 Text Processing

    Persian Validation: Detect pure Persian text
    Character Cleanup: Remove Arabic chars from Persian
    URL Fixing: Decode Persian URLs
    Half-Space: Fix Persian typography
    Time Utilities: Persian time-ago & remaining time
    Slugify: Generate URL-safe slugs from Persian text
    Text Analysis: Comprehensive Persian text analysis

🚀 Quick Start
📦 Installation

# npm
npm install @persian-tools/persian-tools

# yarn  
yarn add @persian-tools/persian-tools

# pnpm
pnpm add @persian-tools/persian-tools

💻 Usage

ES Modules (Recommended)

import { numberToWords, digitsEnToFa, verifyIranianNationalId } from '@persian-tools/persian-tools';

numberToWords(1234); // "یک هزار و دویست و سی و چهار"
digitsEnToFa("123"); // "۱۲۳"
verifyIranianNationalId("0499370899"); // true

CommonJS

const { numberToWords } = require('@persian-tools/persian-tools');

Browser CDN

<script src="https://cdn.jsdelivr.net/npm/@persian-tools/persian-tools/build/persian-tools.umd.js"></script>
<script>
  console.log(PersianTools.numberToWords(1234));
</script>

📖 API Reference
🔢 Number Conversion
numberToWords - Convert numbers to Persian words

wordsToNumber - Convert Persian words to numbers

🏛️ Validation
National ID Validation - Validate Iranian national codes

National ID Generation - Generate valid Iranian national codes

Phone Number Validation - Iranian mobile numbers

💰 Banking & Finance
Bank Card Validation - Validate and identify Iranian bank cards

IBAN/Sheba Validation - Iranian bank account validation

📝 Text Processing
Persian Text Validation - Validate and clean Persian text

Digit Conversion - Convert between number systems

🌍 Geographic & Utilities
Vehicle Plates - Parse Iranian license plates

Time Utilities - Persian time formatting

Slugify - Generate URL-safe slugs from Persian text

Text Analysis - Comprehensive Persian text analysis

🏗️ Development
Prerequisites

    Node.js ≥ 14
    pnpm ≥ 9 (recommended package manager)

Setup

git clone https://github.com/persian-tools/persian-tools.git
cd persian-tools
pnpm install

Scripts

pnpm build        # Build the library
pnpm test         # Run tests
pnpm test:watch   # Watch mode testing
pnpm lint         # Lint code
pnpm lint:fix     # Fix linting issues

Architecture

    TypeScript: Full type safety with strict mode
    Build: Unbuild (dual ESM/CJS output)
    Testing: Vitest with comprehensive coverage
    Quality: ESLint + Prettier + Husky hooks

🌟 Who's Using Persian Tools?
Pooleno
Pooleno Exchange 	Bank Maskan
Bank Maskan PWA 	MyDong
MyDong 	Melkba
Melkba

Using Persian Tools in your project? Add it here!
🤝 Contributing

We welcome contributions! Please see our Contributing Guide for details.
Quick Contribution Steps:

    Fork & Clone the repository
    Create a feature branch: git checkout -b my-feature
    Make your changes with tests
    Run pnpm test and pnpm lint
    Commit with conventional commits
    Submit a pull request

👨‍💻 Contributors

Thanks to these amazing people (emoji key):

Ali Torki
🚇 ⚠️ 💻 	
mssoheil
⚠️ 💻 	
Mohsen
⚠️ 💻 	
Hesam pourghazian
💻 	
Amir Hossien Qasemi Moqaddam
💻 	
SeyyedKhandon
💻 	
msdDaliriyan
💻 ⚠️

Mahdi
💻 ⚠️ 📖 	
PS-PARSA
⚠️ 💻 🤔 	
Amirhossein Douzandeh Zenoozi
💻 ⚠️ 🤔 	
M0rteza-M
💻 ⚠️ 	
mediv0
💻 ⚠️ 🤔 	
Poorshad Shaddel
💻 ⚠️ 🤔 	
Seyed Masih Sajadi
💻 ⚠️

Mohammad Ghonchesefidi
💻 ⚠️ 	
Saeed Hasani Borzadaran
💻 ⚠️ 	
Ali Madihi
💻 	
Amir
📖 	
Kaveh Karami
💻 	
Mehdi Shah abbasian
📖

amirali yavari
💻 	
Taha Namdar
💻 	
Alireza Sariri
💻 	
Sajad Sohrabi
💻 	
Pouriya Babaali
💻 	
Mohammad norouzi
💻 	
Mohamad Amin Mirzaei
💻

Moein Moeinnia
💻 	
Mostafa Ahangarha
💻

This project follows the all-contributors specification.
📄 License

MIT License - see LICENSE for details.

Made with ❤️ by the Persian developer community

⭐ Star us on GitHub • 🐦 Share on Twitter
Readme
Keywords

    persian tools
    number to persian words
    persian words to number
    Arabic numbers to Persian
    Arabic numbers to English
    English numbers to Persian
    Persian numbers to English
    verify iranian national id
    verify iranian card-number
    Persian zero-width non-joiner
    Persian zero-width joiner
    Persian half-space
    Persian digits convertor