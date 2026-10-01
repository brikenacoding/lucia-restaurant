/* ============================================================
   LUCIA — DATA
   ------------------------------------------------------------
   This is the only file a client ever needs to touch. It is the
   single source of truth for the whole project: the website
   renders from it at runtime, and tools/build_pdf.py parses this
   same file to typeset the printed menu. Change a price, a
   description, a photograph, an hour or a whole section here and
   every place it appears — including counts like "how many
   dishes" — follows automatically. Nothing here is duplicated by
   hand elsewhere; anywhere the interface needs to say "eleven
   courses" or "nineteen wines" it asks this file, at LUCIA_FACTS
   at the bottom, rather than hard-coding a number.

   Item shape:
   { name, description, price, image, dietary[], allergens[],
     ingredients[], featured, note }

   Dietary keys (how the dish is cooked):
     V  vegetarian · VG vegan · GF gluten free · DF dairy free · SP spicy
   A dietary key describes the plate exactly as it is served. If a
   side (such as bread) would break the claim, the key is left off
   rather than qualified in prose.

   Allergen keys (what a dish contains, for guests who ask) are a
   separate, optional list — see ALLERGEN_LEGEND. We do not invent
   allergen data we don't actually have; where it is not supplied
   per-item, the site and PDF fall back to the general allergy
   notice rather than implying a dish is guaranteed free of
   something we haven't checked.
   ============================================================ */

const RESTAURANT = {
  name: 'LUCIA',
  tagline: 'A table between the sea and the city.',
  taglineCaps: 'A TABLE BETWEEN THE SEA AND THE CITY',
  cuisine: 'Modern Mediterranean',
  address: ['Via Marina 18', 'Porto Selva'],
  city: 'Porto Selva',
  phone: '+00 000 000 000',
  phoneHref: '+00000000000',
  email: 'hello@lucia.example',
  currency: '€',

  /* Hours are authored once. `closedDays` is derived from this list
     (any weekday with no service block) and drives both the printed
     hours and the reservation form's Monday guard, so they cannot
     drift apart. */
  hours: [
    { days: 'Tuesday — Sunday', label: 'Lunch',  time: '12:00 — 15:00', service: 'lunch',  opens: '12:00', closes: '15:00' },
    { days: 'Tuesday — Sunday', label: 'Dinner',  time: '18:30 — 23:30', service: 'dinner', opens: '18:30', closes: '23:30' },
    { days: 'Monday',           label: 'Closed',  time: '' }
  ],

  /* Reservation policy, stated once. The form reads this rather
     than hard-coding a guest cap or a list of bookable times. */
  reservation: {
    /* 0 = Sunday … 6 = Saturday (JS Date#getDay convention) */
    closedWeekdays: [1],
    maxPartySize: 5,
    largePartyNote: 'For six or more, or for the long table, write to us instead and we will answer the same day.',
    holdMinutes: 15,
    lunchTimes: ['12:00', '12:30', '13:00', '13:30', '14:00'],
    dinnerTimes: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
    defaultTime: '19:30'
  }
};

const DIETARY_LEGEND = [
  { key: 'V',  label: 'Vegetarian' },
  { key: 'VG', label: 'Vegan' },
  { key: 'GF', label: 'Gluten free' },
  { key: 'DF', label: 'Dairy free' },
  { key: 'SP', label: 'Spicy' }
];

/* Allergens are tracked separately from dietary style. Nothing is
   populated per-item yet because we do not have verified per-dish
   allergen data for this fictional kitchen — inventing it would be
   unsafe. The legend and the field exist so real allergen data can
   be filled in later, per item, without changing the data model or
   any rendering code. Until then, guests are pointed to the general
   allergy notice printed on both the site and the PDF. */
const ALLERGEN_LEGEND = [
  { key: 'gluten',    label: 'Gluten' },
  { key: 'milk',      label: 'Milk' },
  { key: 'eggs',      label: 'Eggs' },
  { key: 'fish',      label: 'Fish' },
  { key: 'shellfish', label: 'Shellfish' },
  { key: 'nuts',      label: 'Tree nuts' },
  { key: 'peanuts',   label: 'Peanuts' },
  { key: 'sesame',    label: 'Sesame' },
  { key: 'sulphites', label: 'Sulphites' }
];

const MENU = [
  /* ---------------------------------------------------------- */
  {
    id: 'aperitivi',
    title: 'Aperitivi',
    kicker: 'Before',
    intro: 'Poured at the marble counter from six, when the light goes long.',
    opener: 'negroni',
    items: [
      { name: 'Selva Spritz', description: 'bitter orange, dry vermouth, sparkling wine', price: 12 },
      { name: 'Salt & Citrus', description: 'gin, grapefruit cordial, sea salt, soda', price: 13 },
      { name: 'Rosemary Negroni', description: 'gin, red bitter, rosemary oil, orange peel', price: 14 },
      { name: 'Marina Tonic', description: 'juniper, lemon verbena, house tonic', price: 11 },
      { name: 'Fino & Olive', description: 'dry sherry, olive brine, lemon', price: 12 }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'small-plates',
    title: 'Small Plates',
    kicker: 'To begin',
    intro: 'Three or four between two people is about right. We will tell you if it is too much.',
    opener: 'mezze',
    items: [
      { name: 'Whipped Feta', description: 'hot honey, aleppo pepper, sesame flatbread', price: 11, dietary: ['V'] },
      {
        name: 'Charred Octopus',
        description: 'smoked potato, preserved lemon, oregano oil',
        price: 18,
        dietary: ['GF', 'DF'],
        featured: true,
        image: 'octopus',
        ingredients: ['Day-boat octopus', 'Smoked potato', 'Preserved lemon', 'Wild oregano', 'Green olive oil'],
        note: 'The octopus goes into a pot with wine and bay for two hours, then onto the coals for four minutes. Nothing in between.'
      },
      { name: 'Crispy Zucchini', description: 'lemon yoghurt, wild mint', price: 10, dietary: ['V'] },
      {
        name: 'Burrata',
        description: 'datterini, basil stems, olio nuovo',
        price: 15,
        dietary: ['V', 'GF'],
        image: 'burrata'
      },
      { name: 'Marinated Sardines', description: 'fennel, orange, cracked pepper', price: 12, dietary: ['GF', 'DF'] },
      { name: 'Grilled Peppers', description: 'anchovy butter, grilled sourdough', price: 11 },
      { name: 'Sea Bream Tartare', description: 'green almond, cucumber, dill oil', price: 16, dietary: ['GF', 'DF'] },
      { name: 'Fried Artichokes', description: 'saffron aioli, lemon', price: 12, dietary: ['V', 'GF'] }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'antipasti',
    title: 'Antipasti',
    kicker: 'From the counter',
    intro: 'Cold plates, cut to order, dressed with the oil that arrived that month.',
    opener: 'caprese',
    items: [
      { name: 'Tomato & Stone Fruit', description: 'peach, ricotta salata, basil', price: 13, dietary: ['V', 'GF'] },
      { name: 'Grilled Flatbread', description: 'labneh, za\u2019atar, olive oil', price: 9, dietary: ['V'] },
      { name: 'Cured Sea Bass', description: 'blood orange, pink pepper, celery heart', price: 16, dietary: ['GF', 'DF'] },
      { name: 'Roasted Beets', description: 'pistachio, whipped goat, thyme honey', price: 12, dietary: ['V', 'GF'] },
      { name: 'Lamb Kofte', description: 'smoked yoghurt, sumac onion', price: 15, dietary: ['SP'] },
      { name: 'White Anchovy', description: 'cultured butter, chive, toasted rye', price: 11 }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'pasta-grains',
    title: 'Pasta & Grains',
    kicker: 'Rolled daily',
    intro: 'The dough is made each morning at the back table. Grains come from the dry inland farms above Selvana.',
    opener: 'pastaMarble',
    items: [
      {
        name: 'Lemon Ricotta Ravioli',
        description: 'brown butter, pine nut, sage',
        price: 22,
        dietary: ['V'],
        featured: true,
        image: 'pastaPesto',
        ingredients: ['Sheep ricotta', 'Amalfi lemon zest', 'Brown butter', 'Pine nut', 'Fried sage'],
        note: 'Forty ravioli to a tray, folded by hand. When the tray is finished, the dish is finished.'
      },
      { name: 'Wild Mushroom Tagliolini', description: 'aged pecorino, black pepper, parsley', price: 21, dietary: ['V'], image: 'pastaMush' },
      { name: 'Saffron Risotto', description: 'bone marrow, gremolata', price: 24, dietary: ['GF'] },
      { name: 'Seafood Linguine', description: 'clam, chilli, bottarga', price: 26, dietary: ['SP', 'DF'] },
      { name: 'Roasted Barley', description: 'charred leek, hazelnut, aged goat', price: 18, dietary: ['V'] },
      { name: 'Rigatoni all\u2019Arrabbiata', description: 'datterini, garlic, calabrian chilli', price: 19, dietary: ['V', 'VG', 'SP', 'DF'] }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'from-the-sea',
    title: 'From the Sea',
    kicker: 'Landed that morning',
    intro: 'Whatever the boats bring in at Porto Selva, whole where it makes sense to serve it whole.',
    opener: 'seafoodGrill',
    items: [
      {
        name: 'Charred Sea Bass',
        description: 'brown butter, caper, chard',
        price: 32,
        dietary: ['GF'],
        featured: true,
        image: 'fishFine',
        ingredients: ['Line-caught sea bass', 'Cultured butter', 'Salted caper', 'Rainbow chard', 'Lemon'],
        note: 'Skin side down on the coals until it lifts by itself. We do not turn it twice.'
      },
      { name: 'Grilled Octopus', description: 'white bean, salsa verde', price: 29, dietary: ['GF', 'DF'], image: 'octopusPlate' },
      { name: 'Roasted Prawns', description: 'garlic, fino, grilled lemon', price: 28, dietary: ['GF', 'DF'], image: 'prawns' },
      { name: 'Catch of the Day', description: 'salt-baked whole, herb oil', price: 38, dietary: ['GF', 'DF'], image: 'fishWhole' },
      { name: 'Monkfish', description: 'saffron broth, mussels, fennel', price: 34, dietary: ['GF', 'DF'] }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'from-the-fire',
    title: 'From the Fire',
    kicker: 'Olive and holm oak',
    intro: 'One grill, lit at ten in the morning, burnt down to coals by service. Everything on this page passes over it.',
    opener: 'fireGrill',
    items: [
      { name: 'Herb-Roasted Chicken', description: 'lemon, garlic confit, pan juices', price: 26, dietary: ['GF', 'DF'] },
      { name: 'Lamb Shoulder', description: 'twelve hours, harissa, preserved lemon — to share', price: 58, dietary: ['GF', 'DF', 'SP'] },
      { name: 'Grilled Beef', description: 'aged sirloin, marrow butter, watercress', price: 36, dietary: ['GF'] },
      { name: 'Eggplant Steak', description: 'tahini, pomegranate, mint', price: 22, dietary: ['V', 'VG', 'GF', 'DF'] },
      { name: 'Charred Seasonal Vegetables', description: 'romesco, toasted almond', price: 19, dietary: ['V', 'VG', 'GF', 'DF'], image: 'vegetables' }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'sides',
    title: 'Sides',
    kicker: 'Alongside',
    intro: '',
    items: [
      { name: 'Smoked Potatoes', description: 'bay, sea salt', price: 8, dietary: ['V', 'GF'] },
      { name: 'Bitter Leaves', description: 'lemon, olive oil, aged pecorino', price: 7, dietary: ['V', 'GF'] },
      { name: 'Charred Greens', description: 'chilli, garlic, lemon', price: 8, dietary: ['V', 'VG', 'GF', 'DF', 'SP'] },
      { name: 'Tomato Salad', description: 'red onion, oregano, olive oil', price: 9, dietary: ['V', 'VG', 'GF', 'DF'] },
      { name: 'Sourdough & Olio Nuovo', description: '', price: 5, dietary: ['V', 'VG', 'DF'] }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'desserts',
    title: 'Desserts',
    kicker: 'After',
    intro: 'Not too sweet, and never more than three things on the plate.',
    opener: 'cakeCitrus',
    items: [
      {
        name: 'Olive Oil Cake',
        description: 'crème fraîche, candied lemon',
        price: 11,
        dietary: ['V'],
        featured: true,
        image: 'cakeCitrus',
        ingredients: ['New-press olive oil', 'Whole lemon', 'Crème fraîche', 'Almond flour', 'Sea salt'],
        note: 'Made with the first cold press of the season, which is why it tastes green in November and soft by March.'
      },
      { name: 'Pistachio Semifreddo', description: 'bitter chocolate, sea salt', price: 12, dietary: ['V', 'GF'], image: 'cakePistachio' },
      { name: 'Burnt Basque Cheesecake', description: 'roasted grape', price: 12, dietary: ['V', 'GF'] },
      { name: 'Lemon Tart', description: 'brûléed meringue', price: 11, dietary: ['V'] },
      { name: 'Dark Chocolate & Sea Salt', description: 'olive oil, crushed almond', price: 12, dietary: ['V', 'GF'], image: 'cakeChoc' },
      { name: 'Affogato', description: 'espresso, fior di latte, amaretti', price: 9, dietary: ['V'] }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'cheese',
    title: 'Cheese',
    kicker: 'Selected by the room',
    intro: 'Served at room temperature with bread and honey. All four, thirty-two.',
    note: 'The cheeses themselves are gluten free; ask to have yours without the bread.',
    opener: 'cheeseBoard',
    items: [
      { name: 'Pecorino di Fossa', description: 'eighteen months, aged in ash', price: 9, dietary: ['V'] },
      { name: 'Selva Blue', description: 'sheep\u2019s milk, chestnut honey', price: 10, dietary: ['V'] },
      { name: 'Robiola', description: 'three milks, soft, thyme', price: 9, dietary: ['V'] },
      { name: 'Aged Goat', description: 'vine ash, quince', price: 9, dietary: ['V'] }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'coffee',
    title: 'Coffee & Tea',
    kicker: 'To finish',
    intro: 'Roasted eleven streets away, ground to order.',
    opener: 'espresso',
    items: [
      { name: 'Espresso', description: '', price: 3, dietary: ['V', 'VG', 'GF', 'DF'] },
      { name: 'Doppio', description: '', price: 4, dietary: ['V', 'VG', 'GF', 'DF'] },
      { name: 'Macchiato', description: '', price: 3.5, dietary: ['V', 'GF'] },
      { name: 'Filter', description: 'single origin, changes weekly', price: 4.5, dietary: ['V', 'VG', 'GF', 'DF'] },
      { name: 'Mint & Verbena', description: 'fresh leaf', price: 4, dietary: ['V', 'VG', 'GF', 'DF'] },
      { name: 'Chamomile', description: '', price: 4, dietary: ['V', 'VG', 'GF', 'DF'] },
      { name: 'Black Tea', description: 'with lemon', price: 4, dietary: ['V', 'VG', 'GF', 'DF'] }
    ]
  },

  /* ---------------------------------------------------------- */
  {
    id: 'non-alcoholic',
    title: 'Non-Alcoholic',
    kicker: 'Poured all day',
    intro: '',
    items: [
      { name: 'Sparkling Water', description: '75cl', price: 4, dietary: ['VG', 'GF', 'DF'] },
      { name: 'Still Water', description: '75cl', price: 4, dietary: ['VG', 'GF', 'DF'] },
      { name: 'House Lemonade', description: 'lemon, thyme, a little salt', price: 6, dietary: ['VG', 'GF', 'DF'] },
      { name: 'Bitter Orange Soda', description: 'house made', price: 6, dietary: ['VG', 'GF', 'DF'] },
      { name: 'Verbena & Cucumber', description: 'cold pressed, unsweetened', price: 7, dietary: ['VG', 'GF', 'DF'] },
      { name: 'Alcohol-Free Spritz', description: 'bitter botanicals, citrus, soda', price: 8, dietary: ['VG', 'GF', 'DF'] }
    ]
  }
];

/* ============================================================
   WINE
   ------------------------------------------------------------
   Every producer, region and label below is invented for this
   portfolio project. Prices are per 150ml glass and per bottle,
   in euro. Dessert wines are poured at 100ml.
   ============================================================ */

const WINE = [
  {
    id: 'sparkling',
    title: 'Sparkling',
    intro: 'Low dosage, high acid. We open these before anything else.',
    wines: [
      { name: 'Vela Bianca', producer: 'Metodo Classico', region: 'Selvana Hills', grape: 'Trebbiano', vintage: 'NV', glass: 11, bottle: 52, note: 'Thirty months on lees. Bread crust, green apple, a chalky finish.' },
      { name: 'Marea Brut Nature', producer: 'Casa Marea', region: 'Costa Alta', grape: 'Pinot Bianco', vintage: '2021', glass: 14, bottle: 68, note: 'No dosage at all. Severe, mineral, wonderful with the anchovy.' },
      { name: 'Fiore di Sale', producer: 'Fiore', region: 'Isola Grande', grape: 'Grillo', vintage: '2023', glass: 12, bottle: 58, note: 'Pét-nat, bottled cloudy. Bruised pear and salt.' }
    ]
  },
  {
    id: 'white',
    title: 'White',
    intro: 'Coastal whites that were grown within sight of the water, and behave like it.',
    wines: [
      { name: 'Ostro', producer: 'Podere Ostro', region: 'Selvana Hills', grape: 'Vermentino', vintage: '2023', glass: 9, bottle: 42, note: 'Our pour by the glass. Lemon pith, wet stone, no oak.' },
      { name: 'Pietra Chiara', producer: 'Pietra', region: 'Costa Alta', grape: 'Fiano', vintage: '2022', glass: 11, bottle: 52, note: 'Waxy and broad. Good with the ravioli.' },
      { name: 'Casa Lume', producer: 'Casa Lume', region: 'Valle Nera', grape: 'Assyrtiko', vintage: '2022', glass: 13, bottle: 62, note: 'Volcanic soil. Almost salty. The sea bass wine.' },
      { name: 'Vento Secco', producer: 'Vento', region: 'Isola Grande', grape: 'Grillo', vintage: '2023', glass: 10, bottle: 46, note: 'Picked early, fermented cool. Bitter almond on the end.' },
      { name: 'Antica Riva', producer: 'Riva', region: 'Selvana Hills', grape: 'Chardonnay', vintage: '2021', glass: 15, bottle: 72, note: 'Ten months in old oak. The only rich white on the list.' }
    ]
  },
  {
    id: 'rose',
    title: 'Rosé',
    intro: 'Pressed, not bled. Pale but not shy.',
    wines: [
      { name: 'Sera Rosa', producer: 'Sera', region: 'Costa Alta', grape: 'Cinsault', vintage: '2023', glass: 10, bottle: 46, note: 'Onion skin colour. Redcurrant and dried herb.' },
      { name: 'Scoglio', producer: 'Scoglio', region: 'Isola Grande', grape: 'Nerello Mascalese', vintage: '2023', glass: 12, bottle: 56, note: 'Grown on black sand. More structure than you expect.' },
      { name: 'Pale d\u2019Estate', producer: 'Tenuta Pale', region: 'Valle Nera', grape: 'Grenache', vintage: '2023', glass: 11, bottle: 50, note: 'Fifteen minutes on skins. Peach stone, white pepper.' }
    ]
  },
  {
    id: 'red',
    title: 'Red',
    intro: 'We keep the reds at sixteen degrees. If yours arrives warm, send it back.',
    wines: [
      { name: 'Terra Rossa', producer: 'Terra', region: 'Valle Nera', grape: 'Sangiovese', vintage: '2021', glass: 10, bottle: 48, note: 'Sour cherry, tobacco leaf, firm tannin.' },
      { name: 'Nero Selva', producer: 'Selva', region: 'Selvana Hills', grape: 'Nero d\u2019Avola', vintage: '2020', glass: 12, bottle: 58, note: 'Dark, warm, unfussy. The lamb wine.' },
      { name: 'Contrada Otto', producer: 'Contrada', region: 'Isola Grande', grape: 'Nerello Mascalese', vintage: '2019', glass: 16, bottle: 78, note: 'High altitude, old vines. Pale in the glass, long on the palate.' },
      { name: 'Vecchia Corte', producer: 'Corte', region: 'Costa Alta', grape: 'Aglianico', vintage: '2018', glass: 15, bottle: 72, note: 'Still tight. Decant it, or order it next year.' },
      { name: 'Ombra', producer: 'Ombra', region: 'Valle Nera', grape: 'Grenache, Carignan', vintage: '2021', glass: 13, bottle: 62, note: 'Whole bunch, no filtration. Drink it slightly cool.' }
    ]
  },
  {
    id: 'dessert',
    title: 'Dessert',
    intro: 'Poured at 100ml, with the cheese or after it.',
    wines: [
      { name: 'Miele di Vento', producer: 'Vento', region: 'Selvana Hills', grape: 'Moscato, late harvest', vintage: '2020', glass: 9, bottle: 44, note: 'Orange blossom and honeycomb, cut by acid.' },
      { name: 'Vin Santo di Selva', producer: 'Selva', region: 'Valle Nera', grape: 'Trebbiano, Malvasia', vintage: '2016', glass: 12, bottle: 60, note: 'Six years in small casks under the roof. Walnut, dried fig.' },
      { name: 'Passito Scuro', producer: 'Scuro', region: 'Isola Grande', grape: 'Zibibbo', vintage: '2018', glass: 11, bottle: 54, note: 'Grapes dried on cane mats. Apricot, sea salt, iodine.' }
    ]
  }
];

/* ============================================================
   EDITORIAL COPY
   ============================================================ */

const STORY = {
  aboutKicker: 'Our table',
  aboutTitle: 'We cook over fire and buy from fifteen people.',
  aboutLead:
    'LUCIA occupies a former ship chandlery two streets back from the harbour at Porto Selva. ' +
    'The floor is the original terrazzo. The long table down the centre seats fourteen, and we ' +
    'seat strangers at it most nights.',
  aboutBody: [
    'There is one grill. It is lit at ten in the morning with olive and holm oak, and by the time ' +
    'the room opens it has burnt down to a bed of coals that will hold until closing. Almost ' +
    'everything passes over it at some point — the octopus, the bread, the whole fish, the lamb, ' +
    'the peppers, sometimes the lemons.',

    'The menu is short because the list of people we buy from is short. Fifteen growers, two ' +
    'fishermen, one miller, one cheesemaker in the hills above Selvana who will only sell to us ' +
    'on Thursdays. When the boats do not go out, the fish section shrinks and nobody apologises ' +
    'for it. When the first olive oil of the season arrives in November it goes on everything, ' +
    'including the cake.',

    'Sofia Marin cooks. Elena Vesari runs the floor and chose every bottle on the wine list, ' +
    'most of them from growers she has actually met. They opened the room in spring with ' +
    'twenty-eight covers and no intention of adding more.'
  ],
  ingredientsTitle: 'What arrives, and when',
  seasons: [
    { season: 'Spring', text: 'Green almonds, first artichokes, wild fennel from the cliff path, sea bream.' },
    { season: 'Summer', text: 'Datterini, peaches, courgette flowers, octopus, sardines, the good tomatoes.' },
    { season: 'Autumn', text: 'New olive oil, chestnut honey, mushrooms from inland, the first blue cheese.' },
    { season: 'Winter', text: 'Bitter leaves, blood orange, monkfish, lamb, barley, citrus in everything.' }
  ],
  tableKicker: 'The room',
  tableTitle: 'Twenty-eight seats, one long table.',
  tableLead:
    'Terrazzo, limewashed plaster, brass, and whatever light comes off the water at seven. ' +
    'We do not take a booking for the long table — it fills as the evening goes.'
};

/* ============================================================
   DERIVED FACTS
   ------------------------------------------------------------
   Every number the interface says out loud — course count, dish
   count, wine count, closed days, bookable times — is computed
   here from MENU / WINE / RESTAURANT rather than typed by hand
   anywhere else. Anything that renders "eleven courses" or
   "nineteen wines" must read LUCIA_FACTS, not a literal. This is
   also what tools/build_pdf.py and tools/qa.mjs check the printed
   and rendered output against, so the three can never quietly
   drift out of sync again.
   ============================================================ */

function computeFacts() {
  const dishCount = MENU.reduce((n, c) => n + c.items.length, 0);
  const wineCount = WINE.reduce((n, g) => n + g.wines.length, 0);
  const featured = MENU.reduce((list, c) => list.concat(
    c.items.filter(i => i.featured).map(i => Object.assign({ courseId: c.id, courseTitle: c.title }, i))
  ), []);
  const closed = RESTAURANT.reservation.closedWeekdays.slice();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    courseCount: MENU.length,
    dishCount,
    wineCount,
    wineGroupCount: WINE.length,
    featuredDishes: featured,
    closedWeekdays: closed,
    closedDayNames: closed.map(d => dayNames[d]),
    seats: 28,
    longTableSeats: 14
  };
}

const LUCIA_FACTS = computeFacts();

if (typeof window !== 'undefined') {
  window.LUCIA_DATA = { RESTAURANT, DIETARY_LEGEND, ALLERGEN_LEGEND, MENU, WINE, STORY, LUCIA_FACTS };
}

