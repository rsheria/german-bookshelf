export const countryCodeToEmoji = (countryCode: string): string => {
  if (!countryCode) return '';
  return countryCode
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
};
