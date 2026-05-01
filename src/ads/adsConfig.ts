// Read from EXPO_PUBLIC_ADS_ENABLED. Defaults to enabled when unset/invalid
// so production builds without an env file keep showing ads.
const raw = process.env.EXPO_PUBLIC_ADS_ENABLED;
export const adsEnabled = raw === undefined ? true : raw.toLowerCase() !== 'false';
