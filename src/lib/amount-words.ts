const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigitWords(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? " " + ones[o] : "");
}

function threeDigitWords(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const remainder = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(ones[h] + " Hundred");
  if (remainder > 0) parts.push(twoDigitWords(remainder));
  return parts.join(" ");
}

/**
 * Convert a number to Indian English words.
 * Uses Indian numbering: Crore, Lakh, Thousand, Hundred.
 *
 * Example: 491600 -> "Four Lakh Ninety One Thousand Six Hundred Rupees Only"
 * Example: 1234.50 -> "One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only"
 */
export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";

  const isNegative = amount < 0;
  amount = Math.abs(amount);

  // Split into rupees and paise
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const rupeesWords = integerToWords(rupees);
  const paiseWords = paise > 0 ? twoDigitWords(paise) : "";

  const parts: string[] = [];
  if (isNegative) parts.push("Minus");

  if (rupees > 0) {
    parts.push(rupeesWords + " Rupees");
  }

  if (paise > 0) {
    if (rupees > 0) parts.push("and");
    parts.push(paiseWords + " Paise");
  }

  if (rupees === 0 && paise === 0) {
    parts.push("Zero Rupees");
  }

  parts.push("Only");
  return parts.join(" ");
}

function integerToWords(n: number): string {
  if (n === 0) return "";

  // Indian numbering: Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred (10^2)
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;

  const parts: string[] = [];

  if (crore > 0) parts.push(twoDigitWords(crore) + " Crore");
  if (lakh > 0) parts.push(twoDigitWords(lakh) + " Lakh");
  if (thousand > 0) parts.push(twoDigitWords(thousand) + " Thousand");
  if (n > 0) parts.push(threeDigitWords(n));

  return parts.join(" ");
}
