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
};

export const SUPPORTED_COUNTRIES_LIST = Object.keys(LOCATION_DATABASE);

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
