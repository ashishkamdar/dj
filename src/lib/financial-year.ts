export interface FYRange {
  start: string; // "YYYY-MM-DD"
  end: string; // "YYYY-MM-DD"
  label: string; // "2025-26"
}

/**
 * Get the current financial year (April to March).
 */
export function getCurrentFY(): FYRange {
  return getFYFromDate(new Date());
}

/**
 * Get the financial year for a given date.
 */
export function getFYFromDate(date: Date): FYRange {
  const month = date.getMonth(); // 0-indexed (0 = Jan)
  const year = date.getFullYear();

  // FY starts in April (month index 3)
  // If Jan-Mar, the FY started in the previous calendar year
  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  const label = `${fyStartYear}-${String(fyEndYear).slice(-2)}`;

  return {
    start: `${fyStartYear}-04-01`,
    end: `${fyEndYear}-03-31`,
    label,
  };
}

/**
 * Parse a FY label like "2025-26" into an FYRange.
 */
export function getFYRange(fyLabel: string): FYRange {
  const [startYearStr, endSuffix] = fyLabel.split("-");
  const startYear = parseInt(startYearStr, 10);
  const endYear = parseInt(startYearStr.slice(0, 2) + endSuffix, 10);

  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
    label: fyLabel,
  };
}
