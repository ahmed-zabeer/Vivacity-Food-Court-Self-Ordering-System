import fs from 'fs';
import path from 'path';

const menuDataPath = './server/menuData.js';
let content = fs.readFileSync(menuDataPath, 'utf8');

// 1. Update fusion-cafe in stallsData
const oldFusionCafe = `  {
    id: "fusion-cafe",
    slug: "fusion-cafe",
    name: "Coffee Buzz Fusion Cafe",
    tagline: "CONTINENTAL, SEAFOOD, DRINKS & MOCKTAILS",
    badge: "Premier Partner • Stall 01",
    isFeatured: true,
    rating: 4.9,
    prepTime: "15-20 min",
    coverImage: "/assets/menu/fusion-platter-couple.jpg",
    avatar: "/assets/Stall%20logo/Fusion%20Cafe.png",
    logo: "/assets/Stall%20logo/Fusion%20Cafe.png",
    description: "CONTINENTAL, SEAFOOD, DRINKS & MOCKTAILS",
    categories: [
      "STEAK",
      "SEAFOOD",
      "PIZZA",
      "COMBO MEAL",
      "CHEF SPECIAL",
      "STARTERS",
      "PASTA & NOODLES",
      "SOUP",
      "SALAD",
      "IMPROVED PLATTER",
      "BOBA DRINK",
      "ICE CRUSHED",
      "HEALTHY DRINKS",
      "SHAKE",
      "SPECIAL DRINKS",
      "COFFEE"
    ]
  },`;

const newFusionCafe = `  {
    id: "fusion-cafe",
    slug: "fusion-cafe",
    name: "Coffee Buzz Fusion Cafe",
    tagline: "CONTINENTAL & SEAFOOD",
    badge: "Premier Partner • Stall 01",
    isFeatured: true,
    rating: 4.9,
    prepTime: "15-20 min",
    coverImage: "/assets/menu/fusion-platter-couple.jpg",
    avatar: "/assets/Stall%20logo/Fusion%20Cafe.png",
    logo: "/assets/Stall%20logo/Fusion%20Cafe.png",
    description: "CONTINENTAL & SEAFOOD",
    categories: [
      "STEAK",
      "SEAFOOD",
      "PIZZA",
      "COMBO MEAL",
      "CHEF SPECIAL",
      "STARTERS",
      "PASTA & NOODLES",
      "SOUP",
      "SALAD",
      "IMPROVED PLATTER"
    ]
  },`;

if (!content.includes(oldFusionCafe)) {
  console.error("Could not find exact oldFusionCafe block!");
  process.exit(1);
}
content = content.replace(oldFusionCafe, newFusionCafe);

// 2. Add drinks-beverage stall before the closing bracket of stallsData
const stallsEnd = `  }
];`;

const drinksStallBlock = `  },
  {
    id: "drinks-beverage",
    slug: "drinks-beverage",
    name: "Drinks & Beverage",
    tagline: "SOFT DRINKS, SHAKES, COFFEE & BOBA TEA",
    badge: "Stall 07",
    isFeatured: false,
    rating: 4.9,
    prepTime: "3-8 min",
    coverImage: "/assets/menu/drink-blue-lagoon.jpg",
    avatar: "/assets/menu/drink-blue-lagoon.jpg",
    logo: null,
    description: "SOFT DRINKS, SHAKES, COFFEE & BOBA TEA",
    categories: [
      "SOFT DRINKS & WATER",
      "BOBA DRINK",
      "ICE CRUSHED",
      "HEALTHY DRINKS",
      "SHAKE",
      "SPECIAL DRINKS",
      "COFFEE"
    ]
  }
];`;

content = content.replace(stallsEnd, drinksStallBlock);

// 3. Update stallId for the 49 drink items from fusion-cafe to drinks-beverage
// We know these items have IDs starting with cb-bob-, cb-drk-, cb-hlt-, cb-shk-, cb-spc-, cb-cff-
const drinkPrefixes = ['cb-bob-', 'cb-drk-', 'cb-hlt-', 'cb-shk-', 'cb-spc-', 'cb-cff-'];
let transferCount = 0;

// Regular expression to match each menu item object with these IDs
// Format:
// {
//   "id": "cb-bob-1",
//   "stallId": "fusion-cafe",
for (const prefix of drinkPrefixes) {
  const regex = new RegExp(`("id":\\s*"${prefix}\\d+",\\s*"stallId":\\s*)"fusion-cafe"`, 'g');
  content = content.replace(regex, (match, p1) => {
    transferCount++;
    return `${p1}"drinks-beverage"`;
  });
}

console.log(`Transferred ${transferCount} drink items from fusion-cafe to drinks-beverage.`);

// 4. Add the 4 new drinks to menuItemsData
const newDrinksItems = `  },
  {
    "id": "db-coke",
    "stallId": "drinks-beverage",
    "category": "SOFT DRINKS & WATER",
    "parentCategory": "REGULAR DRINK",
    "subCategory": "Soft Drinks & Water",
    "name": "Fountain Coke (250ml Glass)",
    "price": 50,
    "description": "Refreshing chilled fountain Coca-Cola served with ice (250ml glass)",
    "image": "/assets/menu/drink-fountain-coke.jpg",
    "isVeg": true,
    "isPopular": true,
    "spicyLevel": 0,
    "prepTime": "2-3 min",
    "isAvailable": true
  },
  {
    "id": "db-sprite",
    "stallId": "drinks-beverage",
    "category": "SOFT DRINKS & WATER",
    "parentCategory": "REGULAR DRINK",
    "subCategory": "Soft Drinks & Water",
    "name": "Sprite",
    "price": 50,
    "description": "Crisp, refreshing lemon-lime flavored carbonated beverage",
    "image": "/assets/menu/drink-sprite-bottle.jpg",
    "isVeg": true,
    "isPopular": true,
    "spicyLevel": 0,
    "prepTime": "2-3 min",
    "isAvailable": true
  },
  {
    "id": "db-fanta",
    "stallId": "drinks-beverage",
    "category": "SOFT DRINKS & WATER",
    "parentCategory": "REGULAR DRINK",
    "subCategory": "Soft Drinks & Water",
    "name": "Fanta",
    "price": 50,
    "description": "Bright, bubbly and fruity orange flavored carbonated beverage",
    "image": "/assets/menu/drink-fanta-bottle.jpg",
    "isVeg": true,
    "isPopular": false,
    "spicyLevel": 0,
    "prepTime": "2-3 min",
    "isAvailable": true
  },
  {
    "id": "db-water",
    "stallId": "drinks-beverage",
    "category": "SOFT DRINKS & WATER",
    "parentCategory": "REGULAR DRINK",
    "subCategory": "Soft Drinks & Water",
    "name": "Water (500ml Bottle)",
    "price": 20,
    "description": "Pure, clean mineral drinking water (500ml bottle)",
    "image": "/assets/menu/drink-water-bottle.jpg",
    "isVeg": true,
    "isPopular": false,
    "spicyLevel": 0,
    "prepTime": "1 min",
    "isAvailable": true
  }`;

// Find the end of cb-cff-6 item
const cbCff6End = `"id": "cb-cff-6",
    "stallId": "drinks-beverage",
    "category": "COFFEE",
    "parentCategory": "REGULAR DRINK",
    "subCategory": "Coffee / Hot & Cold",
    "name": "Fusion Hot Coffee (Espresso)",
    "price": 160,
    "description": "Freshly pulled rich Italian espresso hot coffee with silky crema.",
    "addOns": [
      {
        "id": "extra-pearl",
        "name": "Extra Pearl",
        "price": 50
      }
    ],
    "image": "/assets/menu/drink-espresso.jpg",
    "isAvailable": true
  }`;

if (!content.includes(cbCff6End)) {
  console.error("Could not find exact cb-cff-6 end block!");
  process.exit(1);
}
content = content.replace(cbCff6End, cbCff6End + newDrinksItems);

// 5. Add usr-12 to usersData
const oldUsers = `  { id: "usr-9", name: "Burger Bar Lead", email: "burgerbar@vivacity.local", role: "STALL MANAGER", stallId: "burger-bar" },
  { id: "usr-10", name: "Head Kitchen Chef", email: "kitchen@vivacity.local", role: "KITCHEN STAFF", stallId: null },`;

const newUsers = `  { id: "usr-9", name: "Burger Bar Lead", email: "burgerbar@vivacity.local", role: "STALL MANAGER", stallId: "burger-bar" },
  { id: "usr-12", name: "Drinks & Beverage Lead", email: "drinks@vivacity.local", role: "STALL MANAGER", stallId: "drinks-beverage" },
  { id: "usr-10", name: "Head Kitchen Chef", email: "kitchen@vivacity.local", role: "KITCHEN STAFF", stallId: null },`;

if (!content.includes(oldUsers)) {
  console.error("Could not find exact oldUsers block!");
  process.exit(1);
}
content = content.replace(oldUsers, newUsers);

// 6. Add overrides to menuImageOverrides
const oldOverrides = `  "bb-cmb-6": "/assets/menu/burger-bar-crispy-chicken.jpg"
};`;

const newOverrides = `  "bb-cmb-6": "/assets/menu/burger-bar-crispy-chicken.jpg",
  "db-coke": "/assets/menu/drink-fountain-coke.jpg",
  "db-sprite": "/assets/menu/drink-sprite-bottle.jpg",
  "db-fanta": "/assets/menu/drink-fanta-bottle.jpg",
  "db-water": "/assets/menu/drink-water-bottle.jpg"
};`;

if (!content.includes(oldOverrides)) {
  console.error("Could not find exact oldOverrides block!");
  process.exit(1);
}
content = content.replace(oldOverrides, newOverrides);

fs.writeFileSync(menuDataPath, content, 'utf8');
console.log('Successfully updated server/menuData.js');
