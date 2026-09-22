import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, MapPin, X } from 'lucide-react';

interface PlaceOfBirthSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

// All 77 Districts of Nepal
export const NEPAL_DISTRICTS = [
  'Achham', 'Arghakhanchi', 'Baglung', 'Baitadi', 'Bajhang', 'Bajura',
  'Banke', 'Bardiya', 'Bhaktapur', 'Bhojpur', 'Chitwan', 'Dadeldhura',
  'Dailekh', 'Dang', 'Darchula', 'Dhading', 'Dhankuta', 'Dhanusha',
  'Dolakha', 'Dolpa', 'Doti', 'Gorkha', 'Gulmi', 'Humla',
  'Ilam', 'Jajarkot', 'Jhapa', 'Jumla', 'Kailali', 'Kalikot',
  'Kanchanpur', 'Kapilvastu', 'Kaski', 'Kathmandu', 'Kavrepalanchok', 'Khotang',
  'Lalitpur', 'Lamjung', 'Mahottari', 'Makwanpur', 'Manang', 'Morang',
  'Mugu', 'Mustang', 'Myagdi', 'Nawalpur (Nawalparasi East)', 'Parasi (Nawalparasi West)',
  'Nuwakot', 'Okhaldhunga', 'Palpa', 'Panchthar', 'Parbat', 'Parsa',
  'Pyuthan', 'Ramechhap', 'Rasuwa', 'Rautahat', 'Rolpa', 'Rukum East',
  'Rukum West', 'Rupandehi', 'Salyan', 'Sankhuwasabha', 'Saptari', 'Sarlahi',
  'Sindhuli', 'Sindhupalchok', 'Siraha', 'Solukhumbu', 'Sunsari', 'Surkhet',
  'Syangja', 'Tanahun', 'Taplejung', 'Terhathum', 'Udayapur',
];

// Major Cities of Nepal
export const NEPAL_CITIES = [
  'Kathmandu, Nepal',
  'Pokhara, Nepal',
  'Lalitpur, Nepal',
  'Bhaktapur, Nepal',
  'Biratnagar, Nepal',
  'Birgunj, Nepal',
  'Bharatpur (Chitwan), Nepal',
  'Butwal, Nepal',
  'Dharan, Nepal',
  'Hetauda, Nepal',
  'Nepalgunj, Nepal',
  'Dhangadhi, Nepal',
  'Bardiya, Nepal',
  'Janakpur, Nepal',
  'Itahari, Nepal',
];

// International Cities (European & Middle East destinations / expat birthplaces)
export const INTERNATIONAL_CITIES = [
  'Bucharest, Romania',
  'Cluj-Napoca, Romania',
  'Timișoara, Romania',
  'Iași, Romania',
  'Brașov, Romania',
  'Constanța, Romania',
  'Sarajevo, Bosnia and Herzegovina',
  'Banja Luka, Bosnia and Herzegovina',
  'Mostar, Bosnia and Herzegovina',
  'Tuzla, Bosnia and Herzegovina',
  'Doha, Qatar',
  'Al Rayyan, Qatar',
  'Al Wakrah, Qatar',
  'Dubai, UAE',
  'Abu Dhabi, UAE',
  'New Delhi, India',
  'Mumbai, India',
  'Kolkata, India',
  'Patna, India',
  'Lucknow, India',
];

// Curated frequent picks
export const FREQUENT_PICKS = [
  'Bardiya, Nepal',
  'Kathmandu, Nepal',
  'Pokhara, Nepal',
  'Chitwan, Nepal',
  'Jhapa, Nepal',
  'Morang, Nepal',
  'Rupandehi, Nepal',
  'Lalitpur, Nepal',
  'Bhaktapur, Nepal',
  'Sunsari, Nepal',
  'Banke, Nepal',
  'Kailali, Nepal',
  'Bucharest, Romania',
  'Sarajevo, Bosnia',
  'Doha, Qatar',
];

export const PlaceOfBirthSelect: React.FC<PlaceOfBirthSelectProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Select or type Place of Birth (e.g. Bardiya, Nepal)',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    setSearchQuery(newVal);
    if (!isOpen) setIsOpen(true);
  };

  const clearInput = () => {
    onChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const q = searchQuery.toLowerCase().trim();

  // Filtered lists based on current query
  const filteredFrequent = FREQUENT_PICKS.filter((item) =>
    !q ? true : item.toLowerCase().includes(q)
  );

  const filteredDistricts = NEPAL_DISTRICTS.filter((district) =>
    !q ? true : district.toLowerCase().includes(q)
  );

  const filteredCities = NEPAL_CITIES.filter((city) =>
    !q ? true : city.toLowerCase().includes(q)
  );

  const filteredInternational = INTERNATIONAL_CITIES.filter((city) =>
    !q ? true : city.toLowerCase().includes(q)
  );

  const hasAnyResults =
    filteredFrequent.length > 0 ||
    filteredDistricts.length > 0 ||
    filteredCities.length > 0 ||
    filteredInternational.length > 0;

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <div className="absolute left-2.5 text-slate-400 pointer-events-none">
          <MapPin size={14} />
        </div>
        <input
          ref={inputRef}
          type="text"
          required={required}
          className="w-full rounded-lg border border-slate-200 pl-8 pr-16 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white transition"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setSearchQuery(value);
            setIsOpen(true);
          }}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={clearInput}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
              title="Clear"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
            title="Browse places of birth"
            tabIndex={-1}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-150 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
          {/* Custom entry button if typed something */}
          {value.trim() && (
            <div className="p-1">
              <button
                type="button"
                onClick={() => handleSelect(value.trim())}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-lg bg-orange-50/80 text-orange-700 font-semibold hover:bg-orange-100 transition"
              >
                <Check size={12} className="shrink-0" />
                <span>Use custom: &quot;{value.trim()}&quot;</span>
              </button>
            </div>
          )}

          {/* Frequent / Popular picks */}
          {filteredFrequent.length > 0 && (
            <div className="p-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Popular / Frequent
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                {filteredFrequent.map((item) => (
                  <button
                    key={`freq-${item}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-left rounded-md hover:bg-orange-50 hover:text-orange-700 transition ${
                      value.toLowerCase() === item.toLowerCase()
                        ? 'bg-orange-50 font-bold text-orange-600'
                        : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {value.toLowerCase() === item.toLowerCase() && (
                      <Check size={12} className="text-orange-500 shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Nepal Districts */}
          {filteredDistricts.length > 0 && (
            <div className="p-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nepal Districts (77 Districts)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5 max-h-40 overflow-y-auto">
                {filteredDistricts.map((district) => {
                  const valCandidate = `${district}, Nepal`;
                  const isSelected =
                    value.toLowerCase() === district.toLowerCase() ||
                    value.toLowerCase() === valCandidate.toLowerCase();
                  return (
                    <button
                      key={`dist-${district}`}
                      type="button"
                      onClick={() => handleSelect(valCandidate)}
                      className={`flex items-center justify-between px-2.5 py-1.5 text-left rounded-md hover:bg-orange-50 hover:text-orange-700 transition text-[11.5px] ${
                        isSelected ? 'bg-orange-50 font-bold text-orange-600' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{district}</span>
                      {isSelected && <Check size={11} className="text-orange-500 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nepal Cities */}
          {filteredCities.length > 0 && (
            <div className="p-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nepal Cities
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                {filteredCities.map((city) => (
                  <button
                    key={`city-${city}`}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-left rounded-md hover:bg-orange-50 hover:text-orange-700 transition ${
                      value.toLowerCase() === city.toLowerCase()
                        ? 'bg-orange-50 font-bold text-orange-600'
                        : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{city}</span>
                    {value.toLowerCase() === city.toLowerCase() && (
                      <Check size={12} className="text-orange-500 shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* International Cities */}
          {filteredInternational.length > 0 && (
            <div className="p-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                International Cities (Europe / Gulf / India)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                {filteredInternational.map((city) => (
                  <button
                    key={`intl-${city}`}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-left rounded-md hover:bg-orange-50 hover:text-orange-700 transition ${
                      value.toLowerCase() === city.toLowerCase()
                        ? 'bg-orange-50 font-bold text-orange-600'
                        : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{city}</span>
                    {value.toLowerCase() === city.toLowerCase() && (
                      <Check size={12} className="text-orange-500 shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasAnyResults && (
            <div className="p-3 text-center text-slate-400 text-xs">
              No matching location found. You can type any custom city or district above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
