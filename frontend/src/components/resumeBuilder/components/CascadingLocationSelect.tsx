import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import {
  ALL_WORLD_COUNTRIES,
  getCitiesForCountry,
  getPostalCodesForCity,
} from '../config/locationData';

interface LocationPatch {
  country: string;
  city: string;
  postalCode: string;
}

interface CascadingLocationSelectProps {
  country: string;
  city: string;
  postalCode: string;
  onLocationChange?: (patch: LocationPatch) => void;
  onCountryChange?: (country: string) => void;
  onCityChange?: (city: string) => void;
  onPostalCodeChange?: (postalCode: string) => void;
  fieldClass?: string;
  labelClass?: string;
}

export const CascadingLocationSelect: React.FC<CascadingLocationSelectProps> = ({
  country,
  city,
  postalCode,
  onLocationChange,
  onCountryChange,
  onCityChange,
  onPostalCodeChange,
  fieldClass = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white',
  labelClass = 'mb-1 block text-xs font-semibold text-slate-700',
}) => {
  // Searchable Country Dropdown State
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const countryContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        countryContainerRef.current &&
        !countryContainerRef.current.contains(e.target as Node)
      ) {
        setIsCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isCountryOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isCountryOpen]);

  const cities = getCitiesForCountry(country);
  const postalCodes = getPostalCodesForCity(country, city);

  // Filter countries by search query
  const filteredCountries = ALL_WORLD_COUNTRIES.filter((c) => {
    const q = countryQuery.toLowerCase().trim();
    if (!q) return true;
    return c.toLowerCase().includes(q);
  });

  // Atomic state dispatcher prevents race conditions
  const commitLocation = (patch: Partial<LocationPatch>) => {
    const next: LocationPatch = {
      country: patch.country !== undefined ? patch.country : country,
      city: patch.city !== undefined ? patch.city : city,
      postalCode: patch.postalCode !== undefined ? patch.postalCode : postalCode,
    };

    if (onLocationChange) {
      onLocationChange(next);
    } else {
      if (patch.country !== undefined && onCountryChange) onCountryChange(patch.country);
      if (patch.city !== undefined && onCityChange) onCityChange(patch.city);
      if (patch.postalCode !== undefined && onPostalCodeChange) onPostalCodeChange(patch.postalCode);
    }
  };

  const handleSelectCountry = (newCountry: string) => {
    commitLocation({ country: newCountry, city: '', postalCode: '' });
    setIsCountryOpen(false);
    setCountryQuery('');
  };

  const handleCityChange = (newCity: string) => {
    commitLocation({ city: newCity, postalCode: '' });
  };

  const handlePostalCodeChange = (newPostalCode: string) => {
    commitLocation({ postalCode: newPostalCode });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. SEARCHABLE COUNTRY DROPDOWN */}
      <div className="relative" ref={countryContainerRef}>
        <label className={labelClass}>
          Country <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setIsCountryOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs text-left transition ${
            isCountryOpen
              ? 'border-orange-500 ring-1 ring-orange-200'
              : country
              ? 'border-slate-200 text-slate-800 bg-white'
              : 'border-slate-200 text-slate-400 bg-white'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isCountryOpen}
        >
          <span className="truncate">{country || 'Select Country…'}</span>
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${isCountryOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isCountryOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input Box */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 bg-slate-50/70">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                placeholder="Type to search country…"
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCountries.length > 0) {
                      handleSelectCountry(filteredCountries[0]);
                    } else if (countryQuery.trim()) {
                      handleSelectCountry(countryQuery.trim());
                    }
                  }
                }}
              />
              {countryQuery && (
                <button
                  type="button"
                  onClick={() => setCountryQuery('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Countries List */}
            <ul className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50 text-xs">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = country.toLowerCase() === c.toLowerCase();
                  return (
                    <li key={c}>
                      <button
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-orange-50/60 transition ${
                          isSelected ? 'bg-orange-50 font-bold text-orange-900' : 'text-slate-700'
                        }`}
                      >
                        <span>{c}</span>
                        {isSelected && <Check size={14} className="text-orange-600" />}
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="p-2">
                  <div className="text-center py-2 text-slate-400 text-xs">
                    No matching country found
                  </div>
                  {countryQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSelectCountry(countryQuery.trim())}
                      className="w-full text-center text-xs font-semibold text-orange-600 hover:underline py-1"
                    >
                      Use &quot;{countryQuery.trim()}&quot; as Country
                    </button>
                  )}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* 2. CITY DROPDOWN OR INPUT (Cascading from Country) */}
      <div>
        <label className={labelClass}>
          City <span className="text-red-500">*</span>
        </label>
        {cities.length > 0 ? (
          <div className="relative">
            <select
              className={`${fieldClass} appearance-none pr-8 cursor-pointer`}
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={!country}
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
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        ) : (
          <input
            type="text"
            className={fieldClass}
            placeholder={!country ? 'Select Country first…' : 'Enter city name…'}
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={!country}
          />
        )}
      </div>

      {/* 3. POSTAL CODE DROPDOWN OR INPUT (Cascading from City) */}
      <div>
        <label className={labelClass}>
          Postal Code <span className="text-red-500">*</span>
        </label>
        {postalCodes.length > 0 ? (
          <div className="relative">
            <select
              className={`${fieldClass} appearance-none pr-8 cursor-pointer`}
              value={postalCode}
              onChange={(e) => handlePostalCodeChange(e.target.value)}
              disabled={!city}
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
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        ) : (
          <input
            type="text"
            className={fieldClass}
            placeholder={!city ? 'Select City first…' : 'Enter postal code…'}
            value={postalCode}
            onChange={(e) => handlePostalCodeChange(e.target.value)}
            disabled={!city}
          />
        )}
      </div>
    </div>
  );
};
