import React from 'react';
import {
  SUPPORTED_COUNTRIES_LIST,
  getCitiesForCountry,
  getPostalCodesForCity,
} from '../config/locationData';

interface CascadingLocationSelectProps {
  country: string;
  city: string;
  postalCode: string;
  onCountryChange: (country: string) => void;
  onCityChange: (city: string) => void;
  onPostalCodeChange: (postalCode: string) => void;
  fieldClass?: string;
  labelClass?: string;
}

export const CascadingLocationSelect: React.FC<CascadingLocationSelectProps> = ({
  country,
  city,
  postalCode,
  onCountryChange,
  onCityChange,
  onPostalCodeChange,
  fieldClass = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white',
  labelClass = 'mb-1 block text-xs font-semibold text-slate-700',
}) => {
  const cities = getCitiesForCountry(country);
  const postalCodes = getPostalCodesForCity(country, city);

  const handleCountryChange = (newCountry: string) => {
    onCountryChange(newCountry);
    // Automatic cascading reset
    onCityChange('');
    onPostalCodeChange('');
  };

  const handleCityChange = (newCity: string) => {
    onCityChange(newCity);
    // Automatic cascading reset
    onPostalCodeChange('');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. Country Dropdown */}
      <div>
        <label className={labelClass}>
          Country <span className="text-red-500">*</span>
        </label>
        <select
          className={fieldClass}
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          required
        >
          <option value="">Select Country…</option>
          {SUPPORTED_COUNTRIES_LIST.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* 2. City Dropdown (Cascading from Country) */}
      <div>
        <label className={labelClass}>
          City <span className="text-red-500">*</span>
        </label>
        <select
          className={fieldClass}
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          disabled={!country}
          required
        >
          <option value="">
            {!country ? 'Select Country first…' : 'Select City…'}
          </option>
          {cities.map((cty) => (
            <option key={cty.name} value={cty.name}>
              {cty.name}
            </option>
          ))}
          {/* Custom option if user's city is unlisted */}
          {city && !cities.some((c) => c.name === city) && (
            <option value={city}>{city}</option>
          )}
        </select>
      </div>

      {/* 3. Postal Code Dropdown (Cascading from Country + City) */}
      <div>
        <label className={labelClass}>
          Postal Code <span className="text-red-500">*</span>
        </label>
        <select
          className={fieldClass}
          value={postalCode}
          onChange={(e) => onPostalCodeChange(e.target.value)}
          disabled={!city}
          required
        >
          <option value="">
            {!city ? 'Select City first…' : 'Select Postal Code…'}
          </option>
          {postalCodes.map((pc) => (
            <option key={pc} value={pc}>
              {pc}
            </option>
          ))}
          {/* Custom option if postal code is unlisted */}
          {postalCode && !postalCodes.includes(postalCode) && (
            <option value={postalCode}>{postalCode}</option>
          )}
        </select>
      </div>
    </div>
  );
};
