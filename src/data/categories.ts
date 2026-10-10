// Project categories, in the order the filters show them.
export const CATEGORIES = ['Digital design', 'Embedded', 'Software', 'Mechanical'] as const;
export type Category = (typeof CATEGORIES)[number];
