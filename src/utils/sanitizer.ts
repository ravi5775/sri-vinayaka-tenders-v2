const entityMap: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

export const sanitize = (text: string | null | undefined): string => {
  if (text === null || typeof text === 'undefined') {
    return '';
  }
  return String(text).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
};

export const sanitizeForFilename = (text: string | null | undefined): string => {
  if (text === null || typeof text === 'undefined') {
    return 'download';
  }
  return String(text)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '');
};
