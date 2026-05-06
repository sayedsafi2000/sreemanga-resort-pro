export const MENU_META = [
  {
    title: 'Set Menu · Breakfast',
    blurb: 'Light tea, leaf & local flavors—softening the morning start.',
  },
  {
    title: 'Set Menu · Lunch',
    blurb: 'Midday meal with hot rice, curry & some fresh greens.',
  },
  {
    title: 'Set Menu · Dinner',
    blurb: 'Slow eating in the evening light—fusion & saimony meat touch.',
  },
  {
    title: 'Starters & Sides',
    blurb: 'Shareable small plates, soup & tea-flights—light start before mains.',
  },
  {
    title: 'Mains · Main Course',
    blurb: 'Fish, meat or veg—hot rice, roti or naan with full plates.',
  },
  {
    title: 'Rice · Roti · Naan',
    blurb: 'Polao, basmati rice & tandoori bread—ordered to match the menu.',
  },
  {
    title: 'Desserts & Sweets',
    blurb: 'Sweet treats, mousse & seasonal fruits—a sweet bite after meal.',
  },
  {
    title: 'Tea · Coffee',
    blurb: 'Seven color tea to filtered coffee—Sreemangal flavor, in one cup.',
  },
  {
    title: 'Drinks',
    blurb: 'Lemon water, lassi & mineral—cold & fresh on the table.',
  },
];

export function sortCategories(list: string[]): string[] {
  const order = MENU_META.map((m) => m.title.split(' ')[0]);
  const remaining = list.filter((c) => !order.includes(c));
  const sorted = list.slice().sort((a, b) => {
    const ia = order.indexOf(a.split(' ')[0]);
    const ib = order.indexOf(b.split(' ')[0]);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return sorted;
}

export function getMenuCategoryMeta(category: string) {
  return MENU_META.find((m) => category.startsWith(m.title.split(' ')[0])) || null;
}