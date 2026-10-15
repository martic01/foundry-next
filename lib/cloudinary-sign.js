import { createHash } from 'node:crypto';

// Cloudinary signed-request signature: sort params by name, join as
// k=v with '&', append the API secret, SHA-1 hex. file / cloud_name /
// resource_type / api_key are never part of the signed string.
export function signCloudinaryParams(params, apiSecret) {
  const skip = new Set(['file', 'cloud_name', 'resource_type', 'api_key']);
  const toSign = Object.keys(params)
    .filter((k) => !skip.has(k) && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}
