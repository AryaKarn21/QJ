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
  // 1. Country State
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const countryContainerRef = useRef<HTMLDivElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  // 2. City State
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const citySearchRef = useRef<HTMLInputElement>(null);

  // 3. Postal Code State
  const [isPostalCodeOpen, setIsPostalCodeOpen] = useState(false);
  const [postalCodeQuery, setPostalCodeQuery] = useState('');
  const [isCustomPostalCode, setIsCustomPostalCode] = useState(false);
  const postalCodeContainerRef = useRef<HTMLDivElement>(null);
  const postalCodeSearchRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (countryContainerRef.current && !countryContainerRef.current.contains(target)) {
        setIsCountryOpen(false);
      }
      if (cityContainerRef.current && !cityContainerRef.current.contains(target)) {
        setIsCityOpen(false);
      }
      if (postalCodeContainerRef.current && !postalCodeContainerRef.current.contains(target)) {
        setIsPostalCodeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus search inputs when respective dropdown opens
  useEffect(() => {
    if (isCountryOpen) {
      setTimeout(() => countrySearchRef.current?.focus(), 50);
    }
  }, [isCountryOpen]);

  useEffect(() => {
    if (isCityOpen) {
      setTimeout(() => citySearchRef.current?.focus(), 50);
    }
  }, [isCityOpen]);

  useEffect(() => {
    if (isPostalCodeOpen) {
      setTimeout(() => postalCodeSearchRef.current?.focus(), 50);
    }
  }, [isPostalCodeOpen]);

  const cities = getCitiesForCountry(country);
  const postalCodes = getPostalCodesForCity(country, city);

  // Filter countries by search query
  const filteredCountries = ALL_WORLD_COUNTRIES.filter((c) => {
    const q = countryQuery.toLowerCase().trim();
    if (!q) return true;
    return c.toLowerCase().includes(q);
  });

  // Filter cities by search query
  const filteredCities = cities.filter((c) => {
    const q = cityQuery.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q);
  });

  // Filter postal codes by search query
  const filteredPostalCodes = postalCodes.filter((pc) => {
    const q = postalCodeQuery.toLowerCase().trim();
    if (!q) return true;
    return pc.toLowerCase().includes(q);
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
    setIsCustomCity(false);
    setIsCustomPostalCode(false);
    commitLocation({ country: newCountry, city: '', postalCode: '' });
    setIsCountryOpen(false);
    setCountryQuery('');
  };

  const handleSelectCity = (newCity: string) => {
    if (newCity === 'Other') {
      setIsCustomCity(true);
      commitLocation({ city: 'Other', postalCode: '' });
    } else {
      setIsCustomCity(false);
      commitLocation({ city: newCity, postalCode: '' });
    }
    setIsCityOpen(false);
    setCityQuery('');
  };

  const handleSelectPostalCode = (newPostalCode: string) => {
    if (newPostalCode === 'Other') {
      setIsCustomPostalCode(true);
      commitLocation({ postalCode: 'Other' });
    } else {
      setIsCustomPostalCode(false);
      commitLocation({ postalCode: newPostalCode });
    }
    setIsPostalCodeOpen(false);
    setPostalCodeQuery('');
  };

  const isCityInList = cities.some((c) => c.name.toLowerCase() === (city || '').toLowerCase());
  const showCityCustomInput = isCustomCity || Boolean(city && (!isCityInList || city === 'Other'));

  const isPostalCodeInList = postalCodes.some((pc) => pc.toLowerCase() === (postalCode || '').toLowerCase());
  const showPostalCodeCustomInput =
    isCustomPostalCode || Boolean(postalCode && (!isPostalCodeInList || postalCode === 'Other'));

  const isCustomCountry = Boolean(country && (!ALL_WORLD_COUNTRIES.includes(country) || country === 'Other'));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. SEARCHABLE COUNTRY DROPDOWN */}
      <div className={`relative ${isCountryOpen ? 'z-40' : 'z-10'}`} ref={countryContainerRef}>
        <label className={labelClass}>
          Country <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setIsCountryOpen((prev) => !prev);
            setIsCityOpen(false);
            setIsPostalCodeOpen(false);
          }}
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
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input Box */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 bg-slate-50/70">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                ref={countrySearchRef}
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
              <li className="p-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCountryOpen(false);
                    setCountryQuery('');
                    handleSelectCountry('Other');
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded font-semibold transition"
                >
                  + Other (Enter custom country)
                </button>
              </li>
            </ul>
          </div>
        )}

        {isCustomCountry && (
          <input
            type="text"
            className={`${fieldClass} mt-2`}
            placeholder="Enter custom country name…"
            value={country === 'Other' ? '' : country}
            onChange={(e) => commitLocation({ country: e.target.value || 'Other', city: '', postalCode: '' })}
          />
        )}
      </div>

      {/* 2. SEARCHABLE CITY DROPDOWN (Cascading from Country) */}
      <div className={`relative ${isCityOpen ? 'z-40' : 'z-10'}`} ref={cityContainerRef}>
        <label className={labelClass}>
          City <span className="text-red-500">*</span>
        </label>
        {cities.length > 0 ? (
          <div className="space-y-1.5">
            <button
              type="button"
              disabled={!country}
              onClick={() => {
                if (country) {
                  setIsCityOpen((prev) => !prev);
                  setIsCountryOpen(false);
                  setIsPostalCodeOpen(false);
                }
              }}
              className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs text-left transition ${
                !country
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : isCityOpen
                  ? 'border-orange-500 ring-1 ring-orange-200 bg-white'
                  : city
                  ? 'border-slate-200 text-slate-800 bg-white'
                  : 'border-slate-200 text-slate-400 bg-white'
              }`}
              aria-haspopup="listbox"
              aria-expanded={isCityOpen}
            >
              <span className="truncate">
                {!country
                  ? 'Select Country first…'
                  : isCityInList
                  ? cities.find((c) => c.name.toLowerCase() === (city || '').toLowerCase())?.name
                  : showCityCustomInput
                  ? city === 'Other'
                    ? 'Other (Enter custom city)'
                    : city
                  : 'Select City…'}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${isCityOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* City Dropdown Menu */}
            {isCityOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* Search Bar */}
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 bg-slate-50/70">
                  <Search size={13} className="text-slate-400 shrink-0" />
                  <input
                    ref={citySearchRef}
                    type="text"
                    className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    placeholder="Search city…"
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredCities.length > 0) {
                          handleSelectCity(filteredCities[0].name);
                        } else if (cityQuery.trim()) {
                          handleSelectCity(cityQuery.trim());
                        }
                      }
                    }}
                  />
                  {cityQuery && (
                    <button
                      type="button"
                      onClick={() => setCityQuery('')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Cities Scrollable List */}
                <ul className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50 text-xs">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((cty) => {
                      const isSelected = (city || '').toLowerCase() === cty.name.toLowerCase();
                      return (
                        <li key={cty.name}>
                          <button
                            type="button"
                            onClick={() => handleSelectCity(cty.name)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-orange-50/60 transition ${
                              isSelected ? 'bg-orange-50 font-bold text-orange-900' : 'text-slate-700'
                            }`}
                          >
                            <span>{cty.name}</span>
                            {isSelected && <Check size={14} className="text-orange-600" />}
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <li className="p-2">
                      <div className="text-center py-2 text-slate-400 text-xs">
                        No matching city found
                      </div>
                      {cityQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => handleSelectCity(cityQuery.trim())}
                          className="w-full text-center text-xs font-semibold text-orange-600 hover:underline py-1"
                        >
                          Use &quot;{cityQuery.trim()}&quot; as City
                        </button>
                      )}
                    </li>
                  )}

                  {/* Explicit Other Option */}
                  <li className="p-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleSelectCity('Other')}
                      className="w-full text-left px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded font-semibold transition"
                    >
                      + Other (Enter custom city)
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* Custom City Text Input */}
            {showCityCustomInput && (
              <input
                type="text"
                className={fieldClass}
                placeholder="Enter custom city name…"
                value={city === 'Other' ? '' : city}
                onChange={(e) => commitLocation({ city: e.target.value || 'Other', postalCode: '' })}
                autoFocus
              />
            )}
          </div>
        ) : (
          <input
            type="text"
            className={fieldClass}
            placeholder={!country ? 'Select Country first…' : 'Enter city name…'}
            value={city}
            onChange={(e) => commitLocation({ city: e.target.value, postalCode: '' })}
            disabled={!country}
          />
        )}
      </div>

      {/* 3. SEARCHABLE POSTAL CODE DROPDOWN (Cascading from City) */}
      <div className={`relative ${isPostalCodeOpen ? 'z-40' : 'z-10'}`} ref={postalCodeContainerRef}>
        <label className={labelClass}>
          Postal Code <span className="text-red-500">*</span>
        </label>
        {postalCodes.length > 0 ? (
          <div className="space-y-1.5">
            <button
              type="button"
              disabled={!city}
              onClick={() => {
                if (city) {
                  setIsPostalCodeOpen((prev) => !prev);
                  setIsCountryOpen(false);
                  setIsCityOpen(false);
                }
              }}
              className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs text-left transition ${
                !city
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : isPostalCodeOpen
                  ? 'border-orange-500 ring-1 ring-orange-200 bg-white'
                  : postalCode
                  ? 'border-slate-200 text-slate-800 bg-white'
                  : 'border-slate-200 text-slate-400 bg-white'
              }`}
              aria-haspopup="listbox"
              aria-expanded={isPostalCodeOpen}
            >
              <span className="truncate">
                {!city
                  ? 'Select City first…'
                  : isPostalCodeInList
                  ? postalCodes.find((pc) => pc.toLowerCase() === (postalCode || '').toLowerCase())
                  : showPostalCodeCustomInput
                  ? postalCode === 'Other'
                    ? 'Other (Enter custom postal code)'
                    : postalCode
                  : 'Select Postal Code…'}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${isPostalCodeOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Postal Code Dropdown Menu */}
            {isPostalCodeOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* Search Bar (if more than 5 codes) */}
                {postalCodes.length > 5 && (
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 bg-slate-50/70">
                    <Search size={13} className="text-slate-400 shrink-0" />
                    <input
                      ref={postalCodeSearchRef}
                      type="text"
                      className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                      placeholder="Search postal code…"
                      value={postalCodeQuery}
                      onChange={(e) => setPostalCodeQuery(e.target.value)}
                    />
                    {postalCodeQuery && (
                      <button
                        type="button"
                        onClick={() => setPostalCodeQuery('')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Postal Codes Scrollable List */}
                <ul className="max-h-48 overflow-y-auto py-1 divide-y divide-slate-50 text-xs">
                  {filteredPostalCodes.length > 0 ? (
                    filteredPostalCodes.map((pc) => {
                      const isSelected = (postalCode || '').toLowerCase() === pc.toLowerCase();
                      return (
                        <li key={pc}>
                          <button
                            type="button"
                            onClick={() => handleSelectPostalCode(pc)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-orange-50/60 transition ${
                              isSelected ? 'bg-orange-50 font-bold text-orange-900' : 'text-slate-700'
                            }`}
                          >
                            <span>{pc}</span>
                            {isSelected && <Check size={14} className="text-orange-600" />}
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <li className="p-2">
                      <div className="text-center py-2 text-slate-400 text-xs">
                        No matching postal code found
                      </div>
                    </li>
                  )}

                  {/* Explicit Other Option */}
                  <li className="p-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleSelectPostalCode('Other')}
                      className="w-full text-left px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded font-semibold transition"
                    >
                      + Other (Enter custom postal code)
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* Custom Postal Code Text Input */}
            {showPostalCodeCustomInput && (
              <input
                type="text"
                className={fieldClass}
                placeholder="Enter custom postal code…"
                value={postalCode === 'Other' ? '' : postalCode}
                onChange={(e) => commitLocation({ postalCode: e.target.value || 'Other' })}
                autoFocus
              />
            )}
          </div>
        ) : (
          <input
            type="text"
            className={fieldClass}
            placeholder={!city ? 'Select City first…' : 'Enter postal code…'}
            value={postalCode}
            onChange={(e) => commitLocation({ postalCode: e.target.value })}
            disabled={!city}
          />
        )}
      </div>
    </div>
  );
};
