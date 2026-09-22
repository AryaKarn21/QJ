// Hierarchical location dataset supporting cascading Country -> City -> Postal Code.

export interface CityData {
  name: string;
  postalCodes: string[];
}

export interface CountryLocationData {
  countryCode: string;
  countryName: string;
  cities: CityData[];
}

export const LOCATION_DATABASE: Record<string, CountryLocationData> = {
  Nepal: {
    countryCode: 'NP',
    countryName: 'Nepal',
    cities: [
      { name: 'Kathmandu', postalCodes: ['44600', '44601', '44602', '44606', '44610'] },
      { name: 'Lalitpur', postalCodes: ['44700', '44701', '44702'] },
      { name: 'Bhaktapur', postalCodes: ['44800', '44801'] },
      { name: 'Pokhara', postalCodes: ['33700', '33701', '33702', '33708'] },
      { name: 'Biratnagar', postalCodes: ['56613', '56614'] },
      { name: 'Birgunj', postalCodes: ['44300', '44301'] },
      { name: 'Bharatpur (Chitwan)', postalCodes: ['44200', '44204'] },
      { name: 'Butwal', postalCodes: ['32907', '32908'] },
      { name: 'Dharan', postalCodes: ['56700'] },
      { name: 'Hetauda', postalCodes: ['44107'] },
      { name: 'Nepalgunj', postalCodes: ['21900', '21901'] },
      { name: 'Dhangadhi', postalCodes: ['10900'] },
      { name: 'Bardiya', postalCodes: ['21800', '21801', '21804'] },
      { name: 'Janakpur', postalCodes: ['45600'] },
      { name: 'Itahari', postalCodes: ['56705'] },
    ],
  },
  Qatar: {
    countryCode: 'QA',
    countryName: 'Qatar',
    cities: [
      { name: 'Doha', postalCodes: ['00000', '97401', '97402', '97403', '97404', '97405'] },
      { name: 'Al Rayyan', postalCodes: ['97410', '97411', '97412'] },
      { name: 'Al Wakrah', postalCodes: ['97420', '97421'] },
      { name: 'Al Khor', postalCodes: ['97430', '97431'] },
      { name: 'Umm Salal', postalCodes: ['97440'] },
      { name: 'Al Daayen (Lusail)', postalCodes: ['97450', '97451'] },
      { name: 'Madinat ash Shamal', postalCodes: ['97460'] },
      { name: 'Al Shahaniya', postalCodes: ['97470'] },
      { name: 'Mesaieed', postalCodes: ['97480'] },
      { name: 'Ras Laffan', postalCodes: ['97490'] },
    ],
  },
  Romania: {
    countryCode: 'RO',
    countryName: 'Romania',
    cities: [
      { name: 'Bucharest (București)', postalCodes: ['010011', '010021', '020011', '030011', '040011', '050011', '060011'] },
      { name: 'Cluj-Napoca', postalCodes: ['400001', '400002', '400010', '400020'] },
      { name: 'Timișoara', postalCodes: ['300001', '300002', '300010'] },
      { name: 'Iași', postalCodes: ['700001', '700010', '700020'] },
      { name: 'Constanța', postalCodes: ['900001', '900010'] },
      { name: 'Craiova', postalCodes: ['200001', '200010'] },
      { name: 'Brașov', postalCodes: ['500001', '500010', '500020'] },
      { name: 'Galați', postalCodes: ['800001', '800010'] },
      { name: 'Ploiești', postalCodes: ['100001', '100010'] },
      { name: 'Oradea', postalCodes: ['410001', '410010'] },
      { name: 'Sibiu', postalCodes: ['550001', '550010'] },
      { name: 'Arad', postalCodes: ['310001', '310010'] },
    ],
  },
  'Bosnia and Herzegovina': {
    countryCode: 'BA',
    countryName: 'Bosnia and Herzegovina',
    cities: [
      { name: 'Sarajevo', postalCodes: ['71000', '71001', '71210'] },
      { name: 'Banja Luka', postalCodes: ['78000', '78101'] },
      { name: 'Tuzla', postalCodes: ['75000', '75001'] },
      { name: 'Zenica', postalCodes: ['72000', '72001'] },
      { name: 'Mostar', postalCodes: ['88000', '88104'] },
      { name: 'Bihać', postalCodes: ['77000'] },
      { name: 'Brčko', postalCodes: ['76100'] },
      { name: 'Bijeljina', postalCodes: ['76300'] },
      { name: 'Prijedor', postalCodes: ['79101'] },
      { name: 'Doboj', postalCodes: ['74000'] },
      { name: 'Trebinje', postalCodes: ['89101'] },
    ],
  },
  India: {
    countryCode: 'IN',
    countryName: 'India',
    cities: [
      { name: 'New Delhi', postalCodes: ['110001', '110002', '110011', '110020'] },
      { name: 'Mumbai', postalCodes: ['400001', '400002', '400050', '400070'] },
      { name: 'Bengaluru', postalCodes: ['560001', '560002', '560025', '560034'] },
      { name: 'Hyderabad', postalCodes: ['500001', '500002', '500034', '500081'] },
      { name: 'Chennai', postalCodes: ['600001', '600002', '600028'] },
      { name: 'Kolkata', postalCodes: ['700001', '700016', '700091'] },
      { name: 'Pune', postalCodes: ['411001', '411002', '411014'] },
      { name: 'Ahmedabad', postalCodes: ['380001', '380015'] },
      { name: 'Patna', postalCodes: ['800001', '800020'] },
      { name: 'Lucknow', postalCodes: ['226001', '226010'] },
    ],
  },
  'United Arab Emirates': {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    cities: [
      { name: 'Dubai', postalCodes: ['00000', '00001', '00002'] },
      { name: 'Abu Dhabi', postalCodes: ['00000', '00003'] },
      { name: 'Sharjah', postalCodes: ['00000', '00004'] },
      { name: 'Ajman', postalCodes: ['00000'] },
      { name: 'Ras Al Khaimah', postalCodes: ['00000'] },
      { name: 'Fujairah', postalCodes: ['00000'] },
      { name: 'Al Ain', postalCodes: ['00000'] },
    ],
  },
  'United Kingdom': {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    cities: [
      { name: 'London', postalCodes: ['EC1A 1BB', 'W1A 1AA', 'SW1A 1AA', 'E1 6AN'] },
      { name: 'Manchester', postalCodes: ['M1 1AE', 'M2 1FB', 'M3 3HF'] },
      { name: 'Birmingham', postalCodes: ['B1 1AA', 'B2 4QA'] },
      { name: 'Leeds', postalCodes: ['LS1 1BA', 'LS2 7EA'] },
      { name: 'Glasgow', postalCodes: ['G1 1XQ', 'G2 1DY'] },
      { name: 'Edinburgh', postalCodes: ['EH1 1YZ', 'EH2 2EQ'] },
    ],
  },
  Germany: {
    countryCode: 'DE',
    countryName: 'Germany',
    cities: [
      { name: 'Berlin', postalCodes: ['10115', '10117', '10178', '10435'] },
      { name: 'Munich', postalCodes: ['80331', '80333', '80802'] },
      { name: 'Frankfurt', postalCodes: ['60311', '60313', '60329'] },
      { name: 'Hamburg', postalCodes: ['20095', '20354', '20457'] },
      { name: 'Cologne', postalCodes: ['50667', '50672'] },
      { name: 'Stuttgart', postalCodes: ['70173', '70178'] },
    ],
  },
  Poland: {
    countryCode: 'PL',
    countryName: 'Poland',
    cities: [
      { name: 'Warsaw', postalCodes: ['00-001', '00-020', '00-950'] },
      { name: 'Kraków', postalCodes: ['30-001', '30-020'] },
      { name: 'Wrocław', postalCodes: ['50-001', '50-020'] },
      { name: 'Gdańsk', postalCodes: ['80-001', '80-020'] },
      { name: 'Poznań', postalCodes: ['60-001', '60-020'] },
    ],
  },
  Croatia: {
    countryCode: 'HR',
    countryName: 'Croatia',
    cities: [
      { name: 'Zagreb', postalCodes: ['10000', '10020'] },
      { name: 'Split', postalCodes: ['21000'] },
      { name: 'Rijeka', postalCodes: ['51000'] },
      { name: 'Osijek', postalCodes: ['31000'] },
      { name: 'Dubrovnik', postalCodes: ['20000'] },
    ],
  },
  Italy: {
    countryCode: 'IT',
    countryName: 'Italy',
    cities: [
      { name: 'Rome', postalCodes: ['00100', '00118', '00199'] },
      { name: 'Milan', postalCodes: ['20100', '20121', '20159'] },
      { name: 'Naples', postalCodes: ['80100', '80125'] },
      { name: 'Turin', postalCodes: ['10100', '10121'] },
      { name: 'Florence', postalCodes: ['50100', '50123'] },
    ],
  },
  France: {
    countryCode: 'FR',
    countryName: 'France',
    cities: [
      { name: 'Paris', postalCodes: ['75001', '75008', '75015'] },
      { name: 'Lyon', postalCodes: ['69001', '69003'] },
      { name: 'Marseille', postalCodes: ['13001', '13008'] },
      { name: 'Toulouse', postalCodes: ['31000', '31500'] },
    ],
  },
  Spain: {
    countryCode: 'ES',
    countryName: 'Spain',
    cities: [
      { name: 'Madrid', postalCodes: ['28001', '28013', '28045'] },
      { name: 'Barcelona', postalCodes: ['08001', '08007', '08028'] },
      { name: 'Valencia', postalCodes: ['46001', '46020'] },
      { name: 'Seville', postalCodes: ['41001', '41013'] },
    ],
  },
  Portugal: {
    countryCode: 'PT',
    countryName: 'Portugal',
    cities: [
      { name: 'Lisbon', postalCodes: ['1000-001', '1100-001'] },
      { name: 'Porto', postalCodes: ['4000-001', '4100-001'] },
      { name: 'Braga', postalCodes: ['4700-001'] },
    ],
  },
  Austria: {
    countryCode: 'AT',
    countryName: 'Austria',
    cities: [
      { name: 'Vienna', postalCodes: ['1010', '1020', '1100'] },
      { name: 'Salzburg', postalCodes: ['5020'] },
      { name: 'Innsbruck', postalCodes: ['6020'] },
      { name: 'Graz', postalCodes: ['8010'] },
    ],
  },
  Hungary: {
    countryCode: 'HU',
    countryName: 'Hungary',
    cities: [
      { name: 'Budapest', postalCodes: ['1011', '1051', '1111'] },
      { name: 'Debrecen', postalCodes: ['4024'] },
      { name: 'Szeged', postalCodes: ['6720'] },
    ],
  },
  'Czech Republic': {
    countryCode: 'CZ',
    countryName: 'Czech Republic',
    cities: [
      { name: 'Prague', postalCodes: ['110 00', '120 00', '150 00'] },
      { name: 'Brno', postalCodes: ['602 00'] },
      { name: 'Ostrava', postalCodes: ['702 00'] },
    ],
  },
  Slovakia: {
    countryCode: 'SK',
    countryName: 'Slovakia',
    cities: [
      { name: 'Bratislava', postalCodes: ['811 01', '821 01'] },
      { name: 'Košice', postalCodes: ['040 01'] },
    ],
  },
  Malta: {
    countryCode: 'MT',
    countryName: 'Malta',
    cities: [
      { name: 'Valletta', postalCodes: ['VLT 1115'] },
      { name: 'Birkirkara', postalCodes: ['BKR 1010'] },
      { name: 'Sliema', postalCodes: ['SLM 1540'] },
    ],
  },
  Cyprus: {
    countryCode: 'CY',
    countryName: 'Cyprus',
    cities: [
      { name: 'Nicosia', postalCodes: ['1010', '1060'] },
      { name: 'Limassol', postalCodes: ['3010', '3030'] },
      { name: 'Larnaca', postalCodes: ['6010'] },
    ],
  },
};

// Comprehensive list of countries for the searchable Country dropdown
export const ALL_WORLD_COUNTRIES: string[] = [
  'Nepal',
  'Romania',
  'Bosnia and Herzegovina',
  'Qatar',
  'India',
  'United Arab Emirates',
  'Poland',
  'Croatia',
  'Germany',
  'United Kingdom',
  'Italy',
  'France',
  'Spain',
  'Portugal',
  'Austria',
  'Hungary',
  'Czech Republic',
  'Slovakia',
  'Malta',
  'Cyprus',
  'Afghanistan',
  'Albania',
  'Algeria',
  'Argentina',
  'Armenia',
  'Australia',
  'Azerbaijan',
  'Bahrain',
  'Bangladesh',
  'Belgium',
  'Bhutan',
  'Brazil',
  'Bulgaria',
  'Canada',
  'China',
  'Colombia',
  'Denmark',
  'Egypt',
  'Estonia',
  'Finland',
  'Georgia',
  'Ghana',
  'Greece',
  'Iceland',
  'Indonesia',
  'Ireland',
  'Israel',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kuwait',
  'Latvia',
  'Lebanon',
  'Lithuania',
  'Luxembourg',
  'Malaysia',
  'Maldives',
  'Mexico',
  'Moldova',
  'Montenegro',
  'Morocco',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Philippines',
  'Saudi Arabia',
  'Serbia',
  'Singapore',
  'Slovenia',
  'South Africa',
  'South Korea',
  'Sri Lanka',
  'Sweden',
  'Switzerland',
  'Thailand',
  'Tunisia',
  'Turkey',
  'Ukraine',
  'United States',
  'Vietnam',
];

export const SUPPORTED_COUNTRIES_LIST = ALL_WORLD_COUNTRIES;

export const getCitiesForCountry = (country: string): CityData[] => {
  if (!country) return [];
  const normalized = Object.keys(LOCATION_DATABASE).find(
    (k) => k.toLowerCase() === country.toLowerCase().trim()
  );
  return normalized ? LOCATION_DATABASE[normalized].cities : [];
};

export const getPostalCodesForCity = (country: string, cityName: string): string[] => {
  const cities = getCitiesForCountry(country);
  const matchedCity = cities.find(
    (c) => c.name.toLowerCase() === cityName.toLowerCase().trim()
  );
  return matchedCity ? matchedCity.postalCodes : [];
};
