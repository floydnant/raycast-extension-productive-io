export const isToday = (someDate: Date) => {
  const today = new Date();
  return someDate.getDate() === today.getDate() && someDate.getMonth() === today.getMonth();
};
export const isYesterday = (someDate: Date) => {
  const today = new Date();
  const yesterday = new Date(today.setDate(today.getDate() - 1));
  return someDate.getDate() === yesterday.getDate() && someDate.getMonth() === yesterday.getMonth();
};

export const isCurrentWeek = (someDate: Date) => {
  const today = new Date();
  const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  const lastDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

  return someDate >= firstDayOfWeek && someDate <= lastDayOfWeek;
};

export const isWithinLast7Days = (someDate: Date) => {
  const today = new Date();
  const last7Days = new Date(today.setDate(today.getDate() - 8));

  return someDate >= last7Days;
};

export const stripHtml = (html: string) => {
  const plain = html
    .replace(/<br>/gi, "\n")
    .replace(/<p.*>/gi, "\n")
    .replace(/<a.*href="(.*?)".*>(.*?)<\/a>/gi, " $1 ")
    .replace(/<(?:.|\s)*?>/g, "")
    .replace(/&nbsp;+/g, " ")
    .replace(/&amp;+/g, "&")
    .replace(/(\s)+/g, " ");

  return plain;
};

export const formatDuration = (durationMins: number) => {
  const hours = Math.floor(durationMins / 60);
  const minutes = durationMins % 60;
  if (hours === 0) return `${minutes}m`;

  return `${hours}h ${minutes}m`;
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
/** to millis i.e. `<unit> * <factor> = milliseconds` */
const conversionFactorMap = {
  year: 24 * 60 * 60 * 1000 * 365,
  month: (24 * 60 * 60 * 1000 * 365) / 12,
  week: 24 * 60 * 60 * 1000 * 7,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
} satisfies Partial<Record<Intl.RelativeTimeFormatUnit, number>>;
const conversionFactorEntries = Object.entries(conversionFactorMap);

export const formatDateRelative = (date: Date, referenceDate: Date = new Date()): string => {
  const difference = date.valueOf() - referenceDate.valueOf();

  // Get the unit that is the most significant
  // i.e. the first unit where the difference is greater than the conversion factor to millis
  // or second if the difference is less than a second
  const [unit, conversionFactor] = conversionFactorEntries.find(([, conversionFactor]) => {
    return Math.abs(difference) > conversionFactor;
  }) || ["second", 1000];

  // The difference in the unit we previously selected
  const roundedDifference = Math.round(difference / conversionFactor);

  return relativeTimeFormatter.format(roundedDifference, unit as Intl.RelativeTimeFormatUnit);
};
