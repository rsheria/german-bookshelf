import axios from 'axios';

/**
 * Fetch the country code (ISO alpha-2) for a given IP address.
 * Uses ipwho.is free API.
 */
export const getCountryCode = async (ip: string): Promise<string> => {
  try {
    // Fetch country code from ipwho.is (CORS-friendly)
    const { data } = await axios.get(`https://ipwho.is/${ip}`);
    // ipwho.is returns { success: boolean, country: string, country_code: string, ... }
    return data.country_code || '';
  } catch (err) {
    console.error('Error fetching country code for IP', ip, err);
    return '';
  }
};
