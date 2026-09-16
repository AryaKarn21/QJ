// Single source of truth for every currency a job posting can be priced
// in — same convention as data/countries.js: this file is the canonical
// list, GET /api/jobs/meta/currencies (jobController.js's getCurrencyList)
// serves it to the frontend's searchable currency selector, and
// employerController.js's deriveSalaryString uses SYMBOL_BY_CODE below to
// render the legacy `job.salary` string with a real symbol instead of just
// the bare code. `currency` on the Job model stays a free-text string
// (not a schema enum) so an employer is never blocked from saving a code
// this list hasn't caught up to yet — this list only drives the picker's
// options and the default it suggests.
const CURRENCIES = [
  { code: 'NPR', symbol: 'रु', name: 'Nepalese Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

const SYMBOL_BY_CODE = CURRENCIES.reduce((map, c) => {
  map[c.code] = c.symbol;
  return map;
}, {});

// Best-effort default currency per country, used only to pre-select a
// sensible value on the job-posting form when the employer picks a
// country — never enforced, and always overridable. Deliberately not
// exhaustive; a country missing here just means no auto-suggestion.
const CURRENCY_BY_COUNTRY = {
  Nepal: 'NPR',
  India: 'INR',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Australia: 'AUD',
  Canada: 'CAD',
  'United Arab Emirates': 'AED',
  Japan: 'JPY',
  Singapore: 'SGD',
  'New Zealand': 'NZD',
  Switzerland: 'CHF',
  China: 'CNY',
  Germany: 'EUR', France: 'EUR', Italy: 'EUR', Spain: 'EUR', Netherlands: 'EUR',
  Ireland: 'EUR', Portugal: 'EUR', Austria: 'EUR', Belgium: 'EUR', Finland: 'EUR',
  Greece: 'EUR', Luxembourg: 'EUR', Malta: 'EUR', Cyprus: 'EUR', Slovakia: 'EUR',
  Slovenia: 'EUR', Estonia: 'EUR', Latvia: 'EUR', Lithuania: 'EUR',
  'Hong Kong': 'HKD',
  'Saudi Arabia': 'SAR',
  Qatar: 'QAR',
  Kuwait: 'KWD',
  Bahrain: 'BHD',
  Oman: 'OMR',
  Malaysia: 'MYR',
  Thailand: 'THB',
  Philippines: 'PHP',
  Indonesia: 'IDR',
  Vietnam: 'VND',
  'Korea, South': 'KRW',
  Pakistan: 'PKR',
  Bangladesh: 'BDT',
  'Sri Lanka': 'LKR',
  'South Africa': 'ZAR',
  Egypt: 'EGP',
  Nigeria: 'NGN',
  Kenya: 'KES',
  Mexico: 'MXN',
  Brazil: 'BRL',
  Russia: 'RUB',
  Sweden: 'SEK',
  Norway: 'NOK',
  Denmark: 'DKK',
  Poland: 'PLN',
  Turkey: 'TRY',
};

module.exports = { CURRENCIES, SYMBOL_BY_CODE, CURRENCY_BY_COUNTRY };
