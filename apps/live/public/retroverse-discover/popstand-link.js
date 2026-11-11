/* PopStand issue selection. Standalone to keep the supplied magazine unchanged. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RetroversePopStand = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  function issueForYear(year, identity = '') {
    if (!Number.isInteger(year) || year < 1950 || year > 2025) return null;
    const day = new Date(Date.UTC(year, 0, 1));
    day.setUTCDate(day.getUTCDate() + (7 - day.getUTCDay()) % 7);
    const weeks = [];
    while (day.getUTCFullYear() === year) {
      weeks.push(day.toISOString().slice(0, 10));
      day.setUTCDate(day.getUTCDate() + 7);
    }
    let hash = 2166136261;
    for (const char of String(identity)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return weeks[identity ? hash % weeks.length : 0];
  }
  function hrefForYear(year, identity = '') {
    const issue = issueForYear(year, identity);
    return issue ? '/popstand/index.html#/week/' + issue : null;
  }
  return Object.freeze({ issueForYear, hrefForYear });
});
