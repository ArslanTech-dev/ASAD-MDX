export function formatPairingCode(raw) {
  const clean = String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  if (clean.length > 8) return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  return clean;
}

export function isValidNumber(number) {
  return /^\d{10,15}$/.test(String(number).replace(/\D/g, ''));
}

export function normalizeNumber(number) {
  return String(number || '').replace(/\D/g, '');
}

export function isValidPairingCode(code) {
  const c = String(code || '').replace(/[^A-Za-z0-9]/g, '');
  return c.length === 8;
}
