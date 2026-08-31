// Brazilian national holidays, including Easter-derived movable dates, for business-day/SLA math.
// Dates are computed in UTC and returned as "YYYY-MM-DD" to avoid timezone drift.

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

// Meeus/Jones/Butcher Gregorian Easter algorithm.
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

// National holidays only (state/municipal are out of scope for the CIDEQ SLA calc).
export function getBrHolidays(year: number): string[] {
  const easter = easterSunday(year);
  const fixed = [
    `${year}-01-01`, // Confraternização Universal
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia do Trabalho
    `${year}-09-07`, // Independência
    `${year}-10-12`, // Nossa Senhora Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamação da República
    `${year}-11-20`, // Consciência Negra (nacional desde 2024)
    `${year}-12-25`, // Natal
  ];
  const movable = [
    toIso(addDaysUtc(easter, -48)), // Carnaval (segunda)
    toIso(addDaysUtc(easter, -47)), // Carnaval (terça)
    toIso(addDaysUtc(easter, -2)), // Sexta-feira Santa
    toIso(addDaysUtc(easter, 60)), // Corpus Christi
  ];
  return [...fixed, ...movable];
}

export function getBrHolidaySet(fromYear: number, toYear: number): Set<string> {
  const set = new Set<string>();
  for (let y = fromYear; y <= toYear; y++) {
    for (const iso of getBrHolidays(y)) {
      set.add(iso);
    }
  }
  return set;
}
