const EU = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE';
const OTHER =
  'AD AE AF AG AL AM AO AR AU AZ BA BB BD BF BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV ' +
  'DJ DM DO DZ EC EG ER ET FJ FM GA GB GD GE GH GM GN GQ GT GW GY HK HN HT ID IL IN IQ IR IS JM JO JP KE KG KH KI KM ' +
  'KN KP KR KW KZ LA LB LC LI LK LR LS LY MA MC MD ME MG MH MK ML MM MN MR MU MV MW MX MY MZ NA NE NG NI NO NP NR NZ ' +
  'OM PA PE PG PH PK PS PW PY QA RS RU RW SA SB SC SD SG SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT ' +
  'TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW';

const displayNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

const toName = (code: string) => (code === 'XK' ? 'Kosovo' : (displayNames?.of(code) ?? code));
const sorted = (codes: string) =>
  codes
    .split(' ')
    .map(toName)
    .sort((a, b) => a.localeCompare(b));

export interface CountryOption {
  name: string;
  group: 'eu' | 'other';
}

/** EU countries first (alphabetical), then all others. Stored by English name. */
export const COUNTRIES: CountryOption[] = [
  ...sorted(EU).map((name) => ({ name, group: 'eu' as const })),
  ...sorted(OTHER).map((name) => ({ name, group: 'other' as const })),
];

export const DEFAULT_COUNTRY = 'Bulgaria';
