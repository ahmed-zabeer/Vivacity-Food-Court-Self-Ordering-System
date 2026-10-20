// Comprehensive official menu data for Vivacity Food Court
// Contains 100% of all stalls, categories, items, prices, variants, add-ons and descriptions

export const stallsData = [
  {
    id: "fusion-cafe",
    slug: "fusion-cafe",
    name: "Coffee Buzz Fusion Cafe",
    tagline: "Premier Fusion Steakhouse & Artisanal Cafe",
    badge: "Premier Partner • Stall 01",
    isFeatured: true,
    rating: 4.9,
    prepTime: "15-20 min",
    coverImage: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80",
    avatar: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80",
    description: "Signature sizzlers, dry-aged cuts, brick-oven pizzas, hand-crafted boba teas and gourmet fusion platters.",
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
  },
  {
    id: "top-town",
    slug: "top-town",
    name: "Top Town",
    tagline: "Pan-Asian Wok, Biriyani & Crispy Dosas",
    badge: "Stall 02",
    isFeatured: false,
    rating: 4.8,
    prepTime: "12-18 min",
    coverImage: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&q=80",
    avatar: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80",
    description: "Authentic Hyderabadi Dum Biriyani, South Indian crisp dosas, Chinese chowmein and sizzlers.",
    categories: [
      "CHOWMEIN",
      "COMBO PLATTERS",
      "SOUP",
      "SNACKS",
      "DOSA",
      "BIRIYANI",
      "CHAATS",
      "NAN RUTI",
      "DRINKS",
      "COUPLE PLATTERS",
      "FRIED RICE",
      "SIZZLING",
      "GRAVY",
      "APPETIZER",
      "SET MENU",
      "RICE BOWL"
    ]
  },
  {
    id: "momo-buzz",
    slug: "momo-buzz",
    name: "Momo Buzz",
    tagline: "Himalayan Steamed, Pan-Fried Momos & Street Bites",
    badge: "Stall 03",
    isFeatured: false,
    rating: 4.9,
    prepTime: "10-15 min",
    coverImage: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=1200&q=80",
    avatar: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80",
    description: "Juicy handcrafted momos in spicy chilli oils, cheese explosion dumplings, and crispy fuchka bowls.",
    categories: [
      "MOMO",
      "MOMOCOLA",
      "COMBO & OTHERS",
      "FUCHKA BUZZ"
    ]
  },
  {
    id: "waffle-city",
    slug: "waffle-city",
    name: "Waffle City",
    tagline: "Belgian Waffles, Gelato & Sweet Indulgence",
    badge: "Stall 04",
    isFeatured: false,
    rating: 4.9,
    prepTime: "8-12 min",
    coverImage: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=1200&q=80",
    avatar: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
    description: "Crispy golden Liege and Brussels waffles drenched in Belgian chocolate, Oreo crunch and berries.",
    categories: [
      "WAFFLE",
      "ADD ONS"
    ]
  },
  {
    id: "live-station",
    slug: "live-station",
    name: "Live Station",
    tagline: "Live Charcoal Grill, Tandoor & Mughlai Platters",
    badge: "Stall 05",
    isFeatured: false,
    rating: 4.8,
    prepTime: "20-25 min",
    coverImage: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    avatar: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
    description: "Flame-grilled seekh kababs, reshmi boti, tandoori whole fish and feast-grade family platters.",
    categories: [
      "BBQ & KABAB",
      "PLATTERS"
    ]
  },
  {
    id: "burger-bar",
    slug: "burger-bar",
    name: "Burger Bar",
    tagline: "Artisan Smash Burgers, Loaded Fries & Crispy Wings",
    badge: "Stall 06",
    isFeatured: false,
    rating: 4.8,
    prepTime: "12-15 min",
    coverImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80",
    avatar: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80",
    description: "Brioche-bun double smash beef patties, melted gouda, spicy naga crisps and loaded meat boxes.",
    categories: [
      "BURGER",
      "SANDWICH",
      "MEAT BOX",
      "CRISPY CHICKEN",
      "WRAP ROLL",
      "FRENCH FRIES",
      "ADD ONS",
      "COMBO"
    ]
  }
];

export const menuItemsData = [
  // ==========================================
  // STALL 1: COFFEE BUZZ FUSION CAFE
  // ==========================================
  {
      "id": "cb-stk-1",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Regular Steak",
      "name": "T Bone Steak (300+6M)",
      "price": 1450,
      "description": "Fried Rice, T Bone Steak, Vegetables, Smashed Potato, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "20 min"
  },

  {
      "id": "cb-stk-2",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Regular Steak",
      "name": "Tenderloin Steak (250+6M)",
      "price": 995,
      "description": "Fried Rice, Tenderloin Steak, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",
      "isAvailable": true,
      "prepTime": "18 min"
  },

  {
      "id": "cb-stk-3",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Regular Steak",
      "name": "Sirloin Steak (300+6M)",
      "price": 1195,
      "description": "Fried Rice, Sirloin Steak, Vegetables, Grilled Potato, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=600&q=80",
      "isAvailable": true,
      "prepTime": "20 min"
  },

  {
      "id": "cb-stk-4",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Premium Steak",
      "name": "Texas Meat (Fusion Special)",
      "price": 1780,
      "description": "Fried Rice, Beef Steak, Peri Peri Chicken, French Fries, Vegetables, Hot Wings 4x, Coleslaw Salad 2x & Fusion Special Sauce.",
      "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
      "isAvailable": true,
      "prepTime": "22 min"
  },

  {
      "id": "cb-stk-5",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Premium Steak",
      "name": "Texas Prime (Fusion Special)",
      "price": 1999,
      "description": "Fried Rice 2x, Garlic Mushroom, Chicken Tender, Fish Fry (Dori) 2x, Beef Steak, Hot Wings 4x, French Fries, Coleslaw Salad 2x & Fusion Special Sauce.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "25 min"
  },

  {
      "id": "cb-stk-6",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Premium Steak",
      "name": "Mix Meat Luxury (Fusion Special)",
      "price": 3750,
      "description": "Fried Rice, Beef Steak, Ground Beef, French Fries, Garlic Mushroom, Chicken Tender, Hot Wings 4x, Potato Masala Wedges, Fried Sausages, Coleslaw Salad 2x & Fusion Special Sauce.",
      "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
      "isAvailable": true,
      "prepTime": "25 min"
  },

  {
      "id": "cb-stk-c1",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Steak Combo",
      "name": "Steak Combo 1",
      "price": 699,
      "description": "Mini Nachos, Fusion Special Soup (2x), Fried Chicken (4pcs), Fresh Lemon Soda (2x)",
      "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-stk-c2",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Steak Combo",
      "name": "Steak Combo 2",
      "price": 599,
      "description": "Mixed Chowmein, Potato Masala Wedges, Chicken Wings (2pcs), Fried Chicken (2pcs), Fresh Lemon Soda (2x)",
      "image": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-stk-c3",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Steak Combo",
      "name": "Steak Combo 3",
      "price": 599,
      "description": "Oven Baked Pasta (2x), French Fries, Chicken Nuggets (4x), Fresh Lemon Soda (2x)",
      "image": "https://images.unsplash.com/photo-1621996346565-e3d5d6281788?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-stk-c4",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Steak Combo",
      "name": "Steak Combo 4",
      "price": 499,
      "description": "Chicken Stripe Slices, Coleslaw Salad, Potato Masala Wedges, Fresh Lemon Soda (2x)",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-stk-c5",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Steak Combo",
      "name": "Steak Combo 5",
      "price": 699,
      "description": "Chicken Satay 4x, Fish Finger 4x, French Fries, Grilled Calamari, Prawn Tempura 4x, Homemade Sauce & Fresh Lemon Soda (2x)",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-stk-c6",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Steak Combo",
      "name": "Steak Combo 6",
      "price": 599,
      "description": "Fried Prawn, Garlic Mushroom, French Fries, Buffalo Wings 4x, Chicken Cheese Ball 5pcs, Fresh Lemon Soda (2x)",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-platter-couple",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Premium Mixed Platters",
      "name": "Couple Platter",
      "price": 1000,
      "description": "Fried Rice 2x, BBQ Chicken 2x, Vegetables, Thai Soup 2x, Hot Wings 6x, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-platter-fm",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Premium Mixed Platters",
      "name": "Fish & Meat",
      "price": 950,
      "description": "Fried Rice 2x, BBQ Chicken, Dori Fish 2x, French Fries, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-platter-cc",
      "stallId": "fusion-cafe",
      "category": "STEAK",
      "parentCategory": "STEAK",
      "subCategory": "Premium Mixed Platters",
      "name": "Chicken Carnival",
      "price": 750,
      "description": "Fried Rice 2x, Chicken Tender, Chicken Satay 4x, Vegetables, French Fries, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-1",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Grilled Dori Fish",
      "price": 480,
      "description": "Fried Rice, Grilled Dori Fish (Imported), Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-2",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Cream Dori Fish",
      "price": 560,
      "description": "Fried Rice, Creamy Dori Fish (Imported), Fried Calamari, Coleslaw Salad, Vegetables & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-3",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Grilled Lobster",
      "price": 499,
      "description": "Fried Rice, Grilled Lobster, Onion Ring, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-4",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "BBQ Grilled Crab",
      "price": 499,
      "description": "Fried Rice, BBQ Grilled Crab, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-5",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Grilled Rupchada (200+ Gram)",
      "price": 550,
      "description": "Fried Rice, Grilled Rupchada, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-6",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Red Snapper (400+ Gram)",
      "price": 199,
      "unit": "per 100 gm",
      "isWeightBased": true,
      "minWeight": 400,
      "stepWeight": 100,
      "description": "Fried Rice, Grilled Red Snapper, Vegetables, Roasted Potato, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-7",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Fish Fillet",
      "price": 460,
      "description": "Fried Rice, Oven Baked Dori Fish (Imported), Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-8",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Fish & Chips (New York)",
      "price": 460,
      "description": "Deep Fried Dori Fish (Imported), French Fries & Lemon Slice.",
      "image": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-9",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "All Fried Seafood",
      "price": 1180,
      "description": "Fried Rice, Fried Dori Fish (Imported), Potato Masala Wedges, Fried Calamari, Fried Crab, Fried Tempura & Fusion Special Sauce.",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-10",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "All Grilled Seafood",
      "price": 1280,
      "description": "Fried Rice, Grilled Dori Fish (Imported), Potato Masala Wedges, Grilled Calamari, Grilled Crab, Grilled Tempura, Vegetables & Fusion Special Sauce.",
      "image": "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-11",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Fried & Grilled Mix",
      "price": 1250,
      "description": "Fried Rice, Grilled King Prawn, Fried Calamari, Vegetables, Grilled Dori Fish (Imported), Fried Crab, Grilled Potato & Fusion Special Sauce.",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sea-12",
      "stallId": "fusion-cafe",
      "category": "SEAFOOD",
      "parentCategory": "SEAFOOD",
      "name": "Surf & Turf",
      "price": 1150,
      "description": "Fried Rice, Dori Fish (Imported), Grilled Prawn, Grilled Chicken, Chicken Wings, Potato Masala Wedges & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-1",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Tandori Pizza",
      "price": 580,
      "description": "Fresh Mozzarella, Special Sauce, Onion, Tandori Chicken, Green Chili, Tomato & Oregano.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 580
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 680
          }
      ],
      "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-2",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Mexican Hot Pizza",
      "price": 570,
      "description": "Fresh Mozzarella, Special Sauce, Mexican Chicken, Tomato & Capsicum.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 570
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 660
          }
      ],
      "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-3",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Pizza Barcelona",
      "price": 580,
      "description": "Fresh Mozzarella, Special Sauce, Chicken, Sweet Corn, Mushroom & Capsicum.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 580
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 680
          }
      ],
      "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-4",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Chick BBQ Pizza",
      "price": 550,
      "description": "Fresh Mozzarella, BBQ Sauce, BBQ Chicken, Onion, Tomato & Capsicum.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 550
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 650
          }
      ],
      "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-5",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Sausage Carnival",
      "price": 550,
      "description": "Fresh Mozzarella, Special Sauce, Chicken, Mushroom, Sausage, Tomato & Capsicum.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 550
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 650
          }
      ],
      "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-6",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Beef Lover's Pizza",
      "price": 599,
      "description": "Fresh Mozzarella, Special Sauce, Beef, Onion, Tomato & Capsicum.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 599
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 699
          }
      ],
      "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-7",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Pizza Margarita",
      "price": 580,
      "description": "Fresh Mozzarella, Special Sauce, Basil Leaves & Olive.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 580
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 680
          }
      ],
      "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-8",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Four Season Pizza",
      "price": 630,
      "description": "Fresh Mozzarella, Special Sauce, Chicken, Beef, Mushroom, Capsicum & Olives.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 630
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 750
          }
      ],
      "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-9",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Chick Pepperoni Pizza",
      "price": 699,
      "description": "Fresh Mozzarella, Special Sauce, Chicken, Pepperoni, Tomato & Capsicum.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 699
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 799
          }
      ],
      "image": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-10",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Mix Sea Food Pizza",
      "price": 699,
      "description": "Fresh Mozzarella, Special Sauce, Prawn, Squids, Tuna Fish, Dori Fish, Tomato & Capsicum.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 699
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 799
          }
      ],
      "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-piz-11",
      "stallId": "fusion-cafe",
      "category": "PIZZA",
      "parentCategory": "PIZZA",
      "name": "Fusion Special Comilla Pizza",
      "price": 799,
      "description": "Fresh Mozzarella, Special Sauce, Chicken, Mushroom, Jalapeno & Basil Leaves.",
      "hasVariants": true,
      "variants": [
          {
              "id": "m",
              "name": "Medium (M)",
              "price": 799
          },
          {
              "id": "l",
              "name": "Large (L)",
              "price": 899
          }
      ],
      "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cmb-1",
      "stallId": "fusion-cafe",
      "category": "COMBO MEAL",
      "parentCategory": "COMBO MEAL",
      "name": "Combo 1",
      "price": 799,
      "description": "Mini Nachos, Fusion Special Soup x2, Fried Chicken (4pcs) & Fresh Lemonade x2",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cmb-2",
      "stallId": "fusion-cafe",
      "category": "COMBO MEAL",
      "parentCategory": "COMBO MEAL",
      "name": "Combo 2",
      "price": 699,
      "description": "Mixed Chowmein, Chicken Wings (2pcs), Fried Chicken (2pcs), Potato Masala Wedges & Fresh Lemonade x2",
      "image": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cmb-3",
      "stallId": "fusion-cafe",
      "category": "COMBO MEAL",
      "parentCategory": "COMBO MEAL",
      "name": "Combo 3",
      "price": 699,
      "description": "Oven Baked Pasta (2x), French Fries, Chicken Nuggets (4pcs) & Fresh Lemonade x2",
      "image": "https://images.unsplash.com/photo-1621996346565-e3d5d6281788?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cmb-4",
      "stallId": "fusion-cafe",
      "category": "COMBO MEAL",
      "parentCategory": "COMBO MEAL",
      "name": "Combo 4",
      "price": 599,
      "description": "Chicken Stripes Slice, Coleslaw Salad, Potato Masala Wedges, Fresh Lemonade x2",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-chef-1",
      "stallId": "fusion-cafe",
      "category": "CHEF SPECIAL",
      "parentCategory": "CHEF SPECIAL",
      "name": "Fish Fantasy (Seafood)",
      "price": 1250,
      "description": "Served with Fried Rice, Sauteed Vegetables, Fried Squid, Grilled Crab, Grilled Dori Fish, Grilled Prawn, Grilled Potato & Special Sauce.",
      "image": "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-chef-2",
      "stallId": "fusion-cafe",
      "category": "CHEF SPECIAL",
      "parentCategory": "CHEF SPECIAL",
      "name": "Grilled Lovers",
      "price": 780,
      "description": "Served with Fried Rice, Chicken Steak, Roasted Chicken, Grilled Wings, Grilled Potato, Sauteed Vegetables & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-chef-3",
      "stallId": "fusion-cafe",
      "category": "CHEF SPECIAL",
      "parentCategory": "CHEF SPECIAL",
      "name": "Steak Lover's",
      "price": 1799,
      "description": "Served with Fried Rice, Fish Steak (Dori), Chicken Steak, Beef Steak, Mashed Potato, Sauteed Vegetables & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-chef-4",
      "stallId": "fusion-cafe",
      "category": "CHEF SPECIAL",
      "parentCategory": "CHEF SPECIAL",
      "name": "Fried Lover's",
      "price": 780,
      "description": "Served with Fried Rice, Fried Dori Fish (2pcs), Prawn Tempura (2pcs), Fried Chicken (2pcs), Fried Chicken Wings (2pcs), Potato Masala Wedges (4pcs) & Chef Special Sauce.",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-chef-5",
      "stallId": "fusion-cafe",
      "category": "CHEF SPECIAL",
      "parentCategory": "CHEF SPECIAL",
      "name": "4 Ways Chicken (1:2)",
      "price": 1250,
      "description": "Served with Fried Rice, Four types of Chicken, Sauteed Vegetables, Potato Masala Wedges, Coleslaw Salad & Fusion Special Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-chef-6",
      "stallId": "fusion-cafe",
      "category": "CHEF SPECIAL",
      "parentCategory": "CHEF SPECIAL",
      "name": "6 Ways Chicken (1:3)",
      "price": 1750,
      "description": "Served with Fried Rice, Chicken Steak, BBQ Chicken, Arabian Chicken, Chicken Drumstick, Chicken Wings, Fried Chicken, Sauteed Vegetables, Potato Masala Wedges, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-1",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Special Nachos",
      "price": 260,
      "description": "Crispy tortilla chips topped with melted cheddar cheese sauce, salsa and sour cream.",
      "image": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-2",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Special Naga Nachos",
      "price": 280,
      "description": "Fiery hot nachos topped with naga infused cheese sauce and spicy salsa.",
      "image": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-3",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Mexican Tacos (2 pcs)",
      "price": 200,
      "description": "Crisp taco shells stuffed with shredded seasoned chicken, lettuce, tomato and salsa (2 pcs).",
      "image": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-4",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Mexican Tacos (3 pcs)",
      "price": 280,
      "description": "Crisp taco shells stuffed with shredded seasoned chicken, lettuce, tomato and salsa (3 pcs).",
      "image": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-5",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Wings Hot / Buffalo (6 pcs)",
      "price": 250,
      "description": "Crispy glazed chicken wings (6 pcs) served in choice of Hot Chili or Tangy Buffalo sauce.",
      "hasVariants": true,
      "variants": [
          {
              "id": "hot",
              "name": "Hot Wings (6 pcs)",
              "price": 250
          },
          {
              "id": "buffalo",
              "name": "Buffalo Wings (6 pcs)",
              "price": 250
          }
      ],
      "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-6",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Fish & Chips (1:1)",
      "price": 360,
      "description": "Crispy golden fried dori fish fillet served with salted french fries and tartar dip.",
      "image": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-7",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Fried Calamari",
      "price": 399,
      "description": "Golden fried crumbed calamari rings served with homemade dipping sauce.",
      "image": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-8",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Grilled Calamari",
      "price": 399,
      "description": "Flame grilled calamari rings infused with garlic butter and herbs.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-9",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "French Fries",
      "price": 160,
      "description": "Classic deep-fried salted crispy potato french fries.",
      "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-10",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Prawn Tempura (5 pcs)",
      "price": 390,
      "description": "Light and crisp tempura battered jumbo prawns served with dipping sauce (5 pcs).",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-11",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Chicken Cheese Ball (6 pcs)",
      "price": 350,
      "description": "Golden crumb-fried chicken balls filled with molten cheese (6 pcs).",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-12",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Fried Wonton (6 pcs)",
      "price": 180,
      "description": "Crispy wontons stuffed with minced spiced chicken filling (6 pcs).",
      "image": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-13",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Prawn / Chicken On Toast (4 pcs)",
      "price": 350,
      "description": "Crispy sesame toast topped with savory minced prawn or chicken spread (4 pcs).",
      "hasVariants": true,
      "variants": [
          {
              "id": "prawn",
              "name": "Prawn On Toast (4 pcs)",
              "price": 350
          },
          {
              "id": "chicken",
              "name": "Chicken On Toast (4 pcs)",
              "price": 350
          }
      ],
      "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-14",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Potato Masala Wedges with Fried Chicken (2 pcs)",
      "price": 220,
      "description": "Spiced crispy potato wedges served alongside golden fried chicken (2 pcs).",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-15",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Thai Fried Chicken (6 pcs)",
      "price": 320,
      "description": "Authentic Thai herb marinated crispy fried chicken pieces (6 pcs).",
      "image": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-16",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Chicken Nuggets with Fries (6 pcs)",
      "price": 280,
      "description": "Tender breaded chicken nuggets served with salted french fries (6 pcs).",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-17",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Garlic Mushroom",
      "price": 320,
      "description": "Fresh button mushrooms tossed in aromatic garlic butter and garden herbs.",
      "image": "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-18",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Fish Finger (6 pcs)",
      "price": 320,
      "description": "Golden crumbed fish fingers served with homemade tartar sauce (6 pcs).",
      "image": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-reg-st-19",
      "stallId": "fusion-cafe",
      "category": "STARTERS",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Starter",
      "name": "Naga Drumsticks (2 pcs)",
      "price": 280,
      "description": "Spicy and fiery naga chili glazed crispy chicken drumsticks (2 pcs).",
      "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-1",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Chicken Spicy Pasta",
      "price": 300,
      "description": "Pasta tossed with chicken, chili flakes, capsicum and spicy tomato herb sauce.",
      "image": "https://images.unsplash.com/photo-1621996346565-e3d5d6281788?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-2",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Sweet Cream Pasta (Pan Baked)",
      "price": 300,
      "description": "Creamy white sauce pan-baked pasta tossed with tender chicken and garlic.",
      "image": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-3",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Oven Baked Pasta (Red)",
      "price": 380,
      "description": "Classic red sauce pasta with chicken, layered with mozzarella cheese and oven-baked.",
      "image": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-4",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Oven Baked Hot & Spicy Pasta",
      "price": 380,
      "description": "Fiery spiced chicken pasta blanketed with molten golden oven-baked mozzarella cheese.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-5",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Seafood Hakka Noodles",
      "price": 350,
      "description": "Wok-tossed Hakka noodles with fresh prawns, calamari and crisp garden vegetables.",
      "image": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-6",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Prawn Special Chowmein",
      "price": 370,
      "description": "Stir-fried noodles loaded with plump prawns, egg ribbons and seasonal greens.",
      "image": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-7",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Seafood Pasta",
      "price": 350,
      "description": "Tender pasta tossed with mixed ocean seafood in savory herb-infused sauce.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-8",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Special Mixed Chowmein",
      "price": 300,
      "description": "Signature wok-tossed chowmein with chicken, prawns, egg and fresh vegetables.",
      "image": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-pas-9",
      "stallId": "fusion-cafe",
      "category": "PASTA & NOODLES",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Pasta & Noodles",
      "name": "Sweet Cream Pasta (Oven Baked)",
      "price": 380,
      "description": "Velvety sweet cream white sauce pasta topped with a generous layer of baked mozzarella.",
      "image": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sop-1",
      "stallId": "fusion-cafe",
      "category": "SOUP",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Soup",
      "name": "Thai Soup (Thick)",
      "price": 200,
      "description": "Traditional aromatic thick Thai soup with chicken, prawns, lemongrass and chili.",
      "hasVariants": true,
      "variants": [
          {
              "id": "1-1",
              "name": "1:1 Single",
              "price": 200
          },
          {
              "id": "1-2",
              "name": "1:2 Double",
              "price": 350
          }
      ],
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sop-2",
      "stallId": "fusion-cafe",
      "category": "SOUP",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Soup",
      "name": "Cream of Mushroom Soup",
      "price": 220,
      "description": "Velvety and rich soup made from fresh sautéed button mushrooms and cream.",
      "hasVariants": true,
      "variants": [
          {
              "id": "1-1",
              "name": "1:1 Single",
              "price": 220
          },
          {
              "id": "1-2",
              "name": "1:2 Double",
              "price": 380
          }
      ],
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sop-3",
      "stallId": "fusion-cafe",
      "category": "SOUP",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Soup",
      "name": "Seafood Clear Soup",
      "price": 270,
      "description": "Light and fragrant clear seafood broth with calamari, prawns, ginger and fresh coriander.",
      "hasVariants": true,
      "variants": [
          {
              "id": "1-1",
              "name": "1:1 Single",
              "price": 270
          },
          {
              "id": "1-2",
              "name": "1:2 Double",
              "price": 520
          }
      ],
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sop-4",
      "stallId": "fusion-cafe",
      "category": "SOUP",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Soup",
      "name": "Hot & Sour Veg / Corn Soup",
      "price": 180,
      "description": "Tangy and spicy Chinese hot & sour soup with sweet corn and diced garden vegetables.",
      "hasVariants": true,
      "variants": [
          {
              "id": "1-1",
              "name": "1:1 Single",
              "price": 180
          },
          {
              "id": "1-2",
              "name": "1:2 Double",
              "price": 330
          }
      ],
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sop-5",
      "stallId": "fusion-cafe",
      "category": "SOUP",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Soup",
      "name": "Tom Yum Soup",
      "price": 250,
      "description": "Fiery and sour Thai soup with galangal, lemongrass, lime leaves, chicken and prawns.",
      "hasVariants": true,
      "variants": [
          {
              "id": "1-1",
              "name": "1:1 Single",
              "price": 250
          },
          {
              "id": "1-2",
              "name": "1:2 Double",
              "price": 480
          }
      ],
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sop-6",
      "stallId": "fusion-cafe",
      "category": "SOUP",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Soup",
      "name": "Chicken Noodles Soup",
      "price": 320,
      "description": "Hearty, comforting chicken soup loaded with tender shredded chicken and soft noodles.",
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sal-1",
      "stallId": "fusion-cafe",
      "category": "SALAD",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Salad",
      "name": "Grilled Chicken Salad",
      "price": 360,
      "description": "Tender strips of grilled herb chicken breast served over crisp lettuce, cucumbers and house dressing.",
      "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sal-2",
      "stallId": "fusion-cafe",
      "category": "SALAD",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Salad",
      "name": "Special Seafood Salad",
      "price": 420,
      "description": "Fresh steamed prawns and calamari rings tossed with crunchy greens and zesty dressing.",
      "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sal-3",
      "stallId": "fusion-cafe",
      "category": "SALAD",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Salad",
      "name": "Chicken Cashewnut Salad",
      "price": 380,
      "description": "Crispy fried chicken, roasted cashewnuts, bell peppers, tomatoes and sweet-chili dressing.",
      "hasVariants": true,
      "variants": [
          {
              "id": "1-1",
              "name": "1:1 Single",
              "price": 380
          },
          {
              "id": "1-2",
              "name": "1:2 Double",
              "price": 550
          }
      ],
      "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-sal-4",
      "stallId": "fusion-cafe",
      "category": "SALAD",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Salad",
      "name": "Peanut & Corn Salad",
      "price": 300,
      "description": "Tender sweet corn and roasted crunchy peanuts tossed with lime juice, cilantro and mild spices.",
      "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-1",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "BBQ Chicken",
      "price": 360,
      "description": "Fried Rice, BBQ Chicken, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-2",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Mexican Chicken",
      "price": 360,
      "description": "Fried Rice, Mexican Chicken, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-3",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Peri Peri Chicken",
      "price": 390,
      "description": "Fried Rice, Peri Peri Chicken, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-4",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Tandoori Chicken",
      "price": 350,
      "description": "Fried Rice, Tandoori Chicken, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-5",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Masala Chicken",
      "price": 360,
      "description": "Fried Rice, Masala Chicken, Chicken Wings (2pcs), Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-6",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Garlic Chicken",
      "price": 360,
      "description": "Fried Rice, Garlic Chicken, Chicken Wings (2pcs), Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-7",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Thousands Chicken",
      "price": 390,
      "description": "Fried Rice, Thousands Chicken, Vegetables, Fried Prawn & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-8",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Chicken Steak",
      "price": 390,
      "description": "Fried Rice, Chicken Steak, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-9",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "King Prawn",
      "price": 490,
      "description": "Fried Rice, Grilled Prawn, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-10",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Kids Meal",
      "price": 370,
      "description": "Fried Rice, Crispy Chicken, Vegetables, Fried Sausage, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-11",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Smart Meal",
      "price": 360,
      "description": "Fried Rice, Buffalo Chicken, Chicken Satay, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-12",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Roasted Garlic Chicken",
      "price": 390,
      "description": "Fried Rice, Roasted Garlic Chicken, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-13",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Mongolian Beef",
      "price": 399,
      "description": "Fried Rice, Mongolian Beef, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-14",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Beef Oyster",
      "price": 399,
      "description": "Fried Rice, Star Fried Beef, Grilled Sausage, Poached Egg, & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-imp-15",
      "stallId": "fusion-cafe",
      "category": "IMPROVED PLATTER",
      "parentCategory": "REGULAR FOOD",
      "subCategory": "Improved Platter",
      "name": "Cheese Chicken",
      "price": 380,
      "description": "Fried Rice, Melted Cheese Chicken, Vegetables, Coleslaw Salad & Homemade Sauce.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-1",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Boba Milk Tea",
      "name": "Cold Milk Tea Regular",
      "price": 160,
      "description": "Smooth chilled brewed milk tea served cold.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1558857563-b37cf52b2f67?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-2",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Boba Milk Tea",
      "name": "Boba Pearl Milk Tea",
      "price": 190,
      "description": "Classic rich milk tea with chewy brown sugar tapioca pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1558857563-b37cf52b2f67?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-3",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Boba Milk Tea",
      "name": "Boba Pearl Chocolate Fantasy",
      "price": 220,
      "description": "Decadent chocolate milk tea loaded with signature boba pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1558857563-b37cf52b2f67?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-4",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Smoothie",
      "name": "Cocoa Smoothie",
      "price": 170,
      "description": "Blended cocoa smoothie chilled to perfection.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-5",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Smoothie",
      "name": "Cocoa Pearl Smoothie",
      "price": 200,
      "description": "Rich blended cocoa smoothie served with chewy tapioca pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-6",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Smoothie",
      "name": "Strawberry Pearl Smoothie",
      "price": 200,
      "description": "Sweet and refreshing strawberry smoothie with tapioca pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-7",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Smoothie",
      "name": "Mango Pearl Smoothie",
      "price": 220,
      "description": "Luscious ripe mango smoothie served with brown sugar boba pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-8",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "QQ Jelly",
      "name": "Boba Milk Tea QQ",
      "price": 240,
      "description": "Signature milk tea packed with chewy boba pearls and QQ jelly.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1558857563-b37cf52b2f67?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-9",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "QQ Jelly",
      "name": "Mango Pearl QQ",
      "price": 240,
      "description": "Mango milk tea paired with both chewy boba and bouncy QQ jelly.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-10",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Shake (Boba)",
      "name": "Chocolate Pearl Shake",
      "price": 220,
      "description": "Creamy blended chocolate shake served with chewy boba pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-11",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Shake (Boba)",
      "name": "Strawberry Pearl Shake",
      "price": 220,
      "description": "Fresh strawberry milkshake with brown sugar boba pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-12",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Shake (Boba)",
      "name": "Vanilla Pearl Shake",
      "price": 200,
      "description": "Velvety vanilla milkshake served with tapioca pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-13",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Shake (Boba)",
      "name": "Mango Pearl Shake",
      "price": 200,
      "description": "Real mango milkshake infused with chewy boba pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-14",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Shake (Boba)",
      "name": "Banana Pearl Shake",
      "price": 180,
      "description": "Smooth banana shake paired with delicious boba pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-15",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Shake (Boba)",
      "name": "Coconut Pearl Milk Shake",
      "price": 220,
      "description": "Tropical coconut milkshake with chewy tapioca pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1558857563-b37cf52b2f67?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-16",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "subCategory": "Shake (Boba)",
      "name": "Oreo Shake",
      "price": 220,
      "description": "Crushed Oreo cookies blended with milk and boba pearls.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-bob-17",
      "stallId": "fusion-cafe",
      "category": "BOBA DRINK",
      "parentCategory": "BOBA DRINK",
      "name": "Extra Pearl",
      "price": 50,
      "description": "Extra scoop of brown sugar chewy tapioca boba pearls.",
      "image": "https://images.unsplash.com/photo-1558857563-b37cf52b2f67?w=600&q=80",
      "isAvailable": true,
      "isAddOn": true
  },

  {
      "id": "cb-drk-1",
      "stallId": "fusion-cafe",
      "category": "ICE CRUSHED",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Ice Crushed",
      "name": "Fresh Lemonade",
      "price": 100,
      "description": "Chilled crushed ice lemonade with freshly squeezed lemon juice.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-drk-2",
      "stallId": "fusion-cafe",
      "category": "ICE CRUSHED",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Ice Crushed",
      "name": "Ginger Lemonade",
      "price": 130,
      "description": "Zesty crushed ice lemonade infused with fresh spicy ginger.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-drk-3",
      "stallId": "fusion-cafe",
      "category": "ICE CRUSHED",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Ice Crushed",
      "name": "Refreshing Coconut",
      "price": 140,
      "description": "Hydrating and crisp crushed ice coconut drink.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-drk-4",
      "stallId": "fusion-cafe",
      "category": "ICE CRUSHED",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Ice Crushed",
      "name": "Mint Lemonade",
      "price": 140,
      "description": "Icy refreshing lemonade muddled with fresh garden mint.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-drk-5",
      "stallId": "fusion-cafe",
      "category": "ICE CRUSHED",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Ice Crushed",
      "name": "Pineapple Lemon Mint",
      "price": 150,
      "description": "Tropical crushed ice cooler with tangy pineapple, lemon and mint.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-drk-6",
      "stallId": "fusion-cafe",
      "category": "ICE CRUSHED",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Ice Crushed",
      "name": "Orange / Citrus Cooler",
      "price": 180,
      "description": "Vibrant crushed ice citrus blend with fresh orange.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-drk-7",
      "stallId": "fusion-cafe",
      "category": "ICE CRUSHED",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Ice Crushed",
      "name": "Lime Cooler",
      "price": 160,
      "description": "Tangy crushed ice cooler with fresh kaffir and Persian lime.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-drk-8",
      "stallId": "fusion-cafe",
      "category": "ICE CRUSHED",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Ice Crushed",
      "name": "Mint Mojito",
      "price": 150,
      "description": "Classic Virgin mojito with crushed ice, fresh lime, mint and sparkling soda.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-hlt-1",
      "stallId": "fusion-cafe",
      "category": "HEALTHY DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Healthy Drinks",
      "name": "Dragon Seduction",
      "price": 190,
      "description": "Vibrant fresh red dragon fruit juice loaded with antioxidants.",
      "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-hlt-2",
      "stallId": "fusion-cafe",
      "category": "HEALTHY DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Healthy Drinks",
      "name": "Chilied Ginger",
      "price": 180,
      "description": "Invigorating ginger and lemon health booster with a hint of chili.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-hlt-3",
      "stallId": "fusion-cafe",
      "category": "HEALTHY DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Healthy Drinks",
      "name": "Fresh Orange Juice",
      "price": 199,
      "description": "100% freshly pressed sweet orange juice.",
      "image": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-hlt-4",
      "stallId": "fusion-cafe",
      "category": "HEALTHY DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Healthy Drinks",
      "name": "Fresh Watermelon Juice",
      "price": 170,
      "description": "Pure refreshing chilled watermelon juice.",
      "image": "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-hlt-5",
      "stallId": "fusion-cafe",
      "category": "HEALTHY DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Healthy Drinks",
      "name": "Pineapple Paradise",
      "price": 170,
      "description": "Sweet and tangy tropical fresh pineapple juice.",
      "image": "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-hlt-6",
      "stallId": "fusion-cafe",
      "category": "HEALTHY DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Healthy Drinks",
      "name": "Papaya Seduction",
      "price": 150,
      "description": "Nutritious fresh ripe papaya juice chilled and blended.",
      "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-shk-1",
      "stallId": "fusion-cafe",
      "category": "SHAKE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Shake",
      "name": "Fusion Chocolate Shake",
      "price": 180,
      "description": "Rich and creamy gourmet chocolate milkshake.",
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-shk-2",
      "stallId": "fusion-cafe",
      "category": "SHAKE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Shake",
      "name": "Strawberry Shake",
      "price": 180,
      "description": "Sweet classic strawberry milkshake with creamy topping.",
      "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-shk-3",
      "stallId": "fusion-cafe",
      "category": "SHAKE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Shake",
      "name": "Vanilla Milk Shake",
      "price": 180,
      "description": "Smooth and sweet Madagascar vanilla milkshake.",
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-shk-4",
      "stallId": "fusion-cafe",
      "category": "SHAKE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Shake",
      "name": "Mango Shake",
      "price": 180,
      "description": "Luscious ripe mango shake blended with fresh milk.",
      "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-shk-5",
      "stallId": "fusion-cafe",
      "category": "SHAKE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Shake",
      "name": "Wild Banana Shake",
      "price": 150,
      "description": "Creamy tropical wild banana shake.",
      "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-shk-6",
      "stallId": "fusion-cafe",
      "category": "SHAKE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Shake",
      "name": "Papaya Shake",
      "price": 180,
      "description": "Nutritious ripe papaya blended with rich milk and cream.",
      "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-shk-7",
      "stallId": "fusion-cafe",
      "category": "SHAKE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Shake",
      "name": "Coconut Milk Shake",
      "price": 160,
      "description": "Rich tropical coconut milkshake.",
      "image": "https://images.unsplash.com/photo-1558857563-b37cf52b2f67?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-shk-8",
      "stallId": "fusion-cafe",
      "category": "SHAKE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Shake",
      "name": "Oreo Shake",
      "price": 190,
      "description": "Thick crushed Oreo cookie milkshake with vanilla ice cream.",
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-spc-1",
      "stallId": "fusion-cafe",
      "category": "SPECIAL DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Special Drinks",
      "name": "Dry Fruit Fantasy",
      "price": 220,
      "description": "Royal energizing blend of almonds, cashews, raisins and rich milk.",
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-spc-2",
      "stallId": "fusion-cafe",
      "category": "SPECIAL DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Special Drinks",
      "name": "Blue Lagoon (Blue Legon)",
      "price": 190,
      "description": "Electric blue citrus mocktail with fresh lime and soda.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-spc-3",
      "stallId": "fusion-cafe",
      "category": "SPECIAL DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Special Drinks",
      "name": "Water Melon Mojito",
      "price": 150,
      "description": "Fresh muddled watermelon with crushed mint, lime and sparkling soda.",
      "image": "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-spc-4",
      "stallId": "fusion-cafe",
      "category": "SPECIAL DRINKS",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Special Drinks",
      "name": "Green Mango Merry",
      "price": 150,
      "description": "Traditional Bangladeshi raw green mango cooler with roasted cumin and black salt.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cff-1",
      "stallId": "fusion-cafe",
      "category": "COFFEE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Coffee / Hot & Cold",
      "name": "Fusion Regular Cold Coffee",
      "price": 150,
      "description": "Chilled bold brewed espresso blended with creamy milk and ice.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cff-2",
      "stallId": "fusion-cafe",
      "category": "COFFEE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Coffee / Hot & Cold",
      "name": "Chocolate Cold Coffee",
      "price": 170,
      "description": "Rich mocha cold coffee with velvety chocolate drizzle.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cff-3",
      "stallId": "fusion-cafe",
      "category": "COFFEE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Coffee / Hot & Cold",
      "name": "Peanut Cold Coffee",
      "price": 180,
      "description": "Unique nutty cold coffee with real peanut butter infusion.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cff-4",
      "stallId": "fusion-cafe",
      "category": "COFFEE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Coffee / Hot & Cold",
      "name": "Kitkat Cold Coffee",
      "price": 200,
      "description": "Thick cold coffee blended with crispy crunchy KitKat bars.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cff-5",
      "stallId": "fusion-cafe",
      "category": "COFFEE",
      "parentCategory": "REGULAR DRINK",
      "subCategory": "Coffee / Hot & Cold",
      "name": "Fusion Special Cold Coffee",
      "price": 220,
      "description": "Cafe signature cold coffee topped with vanilla ice cream and chocolate swirl.",
      "addOns": [
          {
              "id": "extra-pearl",
              "name": "Extra Pearl",
              "price": 50
          }
      ],
      "image": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80",
      "isAvailable": true
  },

  {
      "id": "cb-cff-6",
      "stallId": "fusion-cafe",
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
      "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80",
      "isAvailable": true
  },

  // ==========================================
  // STALL 2: TOP TOWN
  // ==========================================
  {
      "id": "tt-chw-1",
      "stallId": "top-town",
      "category": "CHOWMEIN",
      "parentCategory": "CHOWMEIN",
      "subCategory": "Chowmein",
      "name": "Chicken Chowmein",
      "price": 300,
      "description": "Wok-tossed noodles with tender shredded chicken, crisp cabbage, carrots, capsicum, and savory soy-sesame glaze.",
      "image": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-chw-2",
      "stallId": "top-town",
      "category": "CHOWMEIN",
      "parentCategory": "CHOWMEIN",
      "subCategory": "Chowmein",
      "name": "House Special Chowmein",
      "price": 350,
      "description": "Chef's signature stir-fried noodles loaded with chicken, juicy prawns, egg ribbons, and fresh garden vegetables in special wok sauce.",
      "image": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-cmb-1",
      "stallId": "top-town",
      "category": "COMBO PLATTERS",
      "parentCategory": "COMBO PLATTERS",
      "subCategory": "Combo Platters (1:3)",
      "name": "Combo 1",
      "price": 950,
      "description": "Fried Rice, Chicken Sizzling, Chinese Vegetables, Thai Fried Chicken (6Pcs)",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "18 min"
  },

  {
      "id": "tt-cmb-2",
      "stallId": "top-town",
      "category": "COMBO PLATTERS",
      "parentCategory": "COMBO PLATTERS",
      "subCategory": "Combo Platters (1:3)",
      "name": "Combo 2",
      "price": 1050,
      "description": "Fried Rice, Beef Sizzling, Chinese Vegetables, Thai Fried Chicken (6Pcs)",
      "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
      "isAvailable": true,
      "prepTime": "18 min"
  },

  {
      "id": "tt-sop-1",
      "stallId": "top-town",
      "category": "SOUP",
      "parentCategory": "SOUP",
      "name": "Chicken Corn Soup",
      "price": 180,
      "description": "Silky and comforting Chinese-style broth with sweet golden corn, shredded chicken, and tender egg drops.",
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-sop-2",
      "stallId": "top-town",
      "category": "SOUP",
      "parentCategory": "SOUP",
      "name": "Thai Soup Chick / Clear",
      "price": 200,
      "description": "Fragrant clear Thai broth infused with tender chicken, galangal, lemongrass, kaffir lime leaves, and fresh herbs.",
      "hasVariants": true,
      "variants": [
          {
              "id": "chick",
              "name": "Chicken / Thick",
              "price": 200
          },
          {
              "id": "clear",
              "name": "Clear Broth",
              "price": 200
          }
      ],
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-sop-3",
      "stallId": "top-town",
      "category": "SOUP",
      "parentCategory": "SOUP",
      "name": "Cream Of Mushroom",
      "price": 220,
      "description": "Rich, velvety European cream soup made with sautéed fresh button mushrooms, garlic, and fresh herbs.",
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-sop-4",
      "stallId": "top-town",
      "category": "SOUP",
      "parentCategory": "SOUP",
      "name": "Hot & Sour",
      "price": 200,
      "description": "Zesty and spicy classic soup with shredded chicken, mushrooms, bamboo shoots, and cracked black pepper.",
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-snk-1",
      "stallId": "top-town",
      "category": "SNACKS",
      "parentCategory": "SNACKS",
      "subCategory": "Snacks",
      "name": "Chola Bhatora",
      "price": 180,
      "description": "Puffy golden deep-fried fermented bhatura served with spicy, aromatic Punjabi chickpea curry, pickled onions, and green chilies.",
      "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-snk-2",
      "stallId": "top-town",
      "category": "SNACKS",
      "parentCategory": "SNACKS",
      "subCategory": "Snacks",
      "name": "Chicken Chola Bhatora",
      "price": 250,
      "description": "Crispy puffed bhatura bread served with rich chicken keema infused spicy chole curry and fresh salad.",
      "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-snk-3",
      "stallId": "top-town",
      "category": "SNACKS",
      "parentCategory": "SNACKS",
      "subCategory": "Snacks",
      "name": "Chicken Wrapped Roll",
      "price": 180,
      "description": "Warm flaky paratha rolled around smoky tandoori spiced chicken cubes, sautéed onions, capsicum, and tangy house sauce.",
      "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-snk-4",
      "stallId": "top-town",
      "category": "SNACKS",
      "parentCategory": "SNACKS",
      "subCategory": "Snacks",
      "name": "Luchi",
      "price": 50,
      "description": "Traditional Bengali deep-fried puffed bread made of fine maida flour, light, fluffy, and golden.",
      "image": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&q=80",
      "isAvailable": true,
      "prepTime": "8 min"
  },

  {
      "id": "tt-dos-1",
      "stallId": "top-town",
      "category": "DOSA",
      "parentCategory": "DOSA",
      "subCategory": "Dosa",
      "name": "Plain Dosa",
      "price": 180,
      "description": "Crispy golden South Indian fermented crepe served with spicy sambar and fresh coconut chutney.",
      "addOns": [
          {
              "id": "cheese",
              "name": "Cheese",
              "price": 30
          },
          {
              "id": "butter",
              "name": "Butter",
              "price": 30
          }
      ],
      "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-dos-2",
      "stallId": "top-town",
      "category": "DOSA",
      "parentCategory": "DOSA",
      "subCategory": "Dosa",
      "name": "Masala Dosa",
      "price": 200,
      "description": "Crispy golden crepe stuffed with savory turmeric-tempered spiced potato masala, mustard seeds, and curry leaves.",
      "addOns": [
          {
              "id": "cheese",
              "name": "Cheese",
              "price": 30
          },
          {
              "id": "butter",
              "name": "Butter",
              "price": 30
          }
      ],
      "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-dos-3",
      "stallId": "top-town",
      "category": "DOSA",
      "parentCategory": "DOSA",
      "subCategory": "Dosa",
      "name": "Butter Masala Dosa",
      "price": 220,
      "description": "Crisp dosa generously basted in pure butter and filled with fragrant spiced potato masala.",
      "addOns": [
          {
              "id": "cheese",
              "name": "Cheese",
              "price": 30
          },
          {
              "id": "butter",
              "name": "Butter",
              "price": 30
          }
      ],
      "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-dos-4",
      "stallId": "top-town",
      "category": "DOSA",
      "parentCategory": "DOSA",
      "subCategory": "Dosa",
      "name": "Cheese Masala Dosa",
      "price": 220,
      "description": "Crispy dosa loaded with melted mozzarella cheese and hearty spiced potato filling.",
      "addOns": [
          {
              "id": "cheese",
              "name": "Cheese",
              "price": 30
          },
          {
              "id": "butter",
              "name": "Butter",
              "price": 30
          }
      ],
      "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-dos-5",
      "stallId": "top-town",
      "category": "DOSA",
      "parentCategory": "DOSA",
      "subCategory": "Dosa",
      "name": "Chicken Masala Dosa",
      "price": 240,
      "description": "South Indian crisp dosa stuffed with savory shredded chicken masala, herbs, and mild chili.",
      "addOns": [
          {
              "id": "cheese",
              "name": "Cheese",
              "price": 30
          },
          {
              "id": "butter",
              "name": "Butter",
              "price": 30
          }
      ],
      "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-dos-6",
      "stallId": "top-town",
      "category": "DOSA",
      "parentCategory": "DOSA",
      "subCategory": "Dosa",
      "name": "DosaWala Special Dosa",
      "price": 280,
      "description": "Chef's grand fusion dosa loaded with melted cheese, butter, spiced chicken, and potato masala.",
      "addOns": [
          {
              "id": "cheese",
              "name": "Cheese",
              "price": 30
          },
          {
              "id": "butter",
              "name": "Butter",
              "price": 30
          }
      ],
      "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-bir-1",
      "stallId": "top-town",
      "category": "BIRIYANI",
      "parentCategory": "BIRIYANI",
      "name": "Hyderabadi Chicken Biriyani",
      "price": 250,
      "description": "Fragrant long-grain basmati rice slow-cooked in dum style with marinated chicken, saffron, mint, fried onions, and whole spices.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-bir-2",
      "stallId": "top-town",
      "category": "BIRIYANI",
      "parentCategory": "BIRIYANI",
      "name": "Hyderabadi Mutton Biriyani",
      "price": 280,
      "description": "Authentic dum biriyani featuring tender fall-off-the-bone mutton chunks layered with spiced basmati rice and aromatic ghee.",
      "image": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-cht-1",
      "stallId": "top-town",
      "category": "CHAATS",
      "parentCategory": "CHAATS",
      "name": "Regular Fuchka",
      "price": 100,
      "description": "Crisp hollow puris stuffed with mashed spiced yellow peas, potatoes, green chilies, and served with tangy tamarind water.",
      "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80",
      "isAvailable": true,
      "prepTime": "8 min"
  },

  {
      "id": "tt-cht-2",
      "stallId": "top-town",
      "category": "CHAATS",
      "parentCategory": "CHAATS",
      "name": "Dahi Fuchka",
      "price": 120,
      "description": "Crunchy hollow puris filled with spiced potato and chickpea mix, smothered in sweetened whipped yogurt, tamarind chutney, and sev.",
      "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80",
      "isAvailable": true,
      "prepTime": "8 min"
  },

  {
      "id": "tt-cht-3",
      "stallId": "top-town",
      "category": "CHAATS",
      "parentCategory": "CHAATS",
      "name": "Papri Chaat",
      "price": 100,
      "description": "Crisp fried dough wafers topped with boiled potatoes, chickpeas, chilled yogurt, sweet tamarind chutney, and spicy green chutney.",
      "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80",
      "isAvailable": true,
      "prepTime": "8 min"
  },

  {
      "id": "tt-cht-4",
      "stallId": "top-town",
      "category": "CHAATS",
      "parentCategory": "CHAATS",
      "name": "Raj Kachori",
      "price": 150,
      "description": "The king of chaats — giant crispy golden kachori shell packed with bhallas, boiled sprouts, potatoes, sweet yogurt, chutneys, and pomegranate seeds.",
      "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-nan-1",
      "stallId": "top-town",
      "category": "NAN RUTI",
      "parentCategory": "NAN RUTI",
      "name": "Plain Nan",
      "price": 50,
      "description": "Traditional soft and pillowy leavened flatbread freshly baked against the clay walls of a tandoor.",
      "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&q=80",
      "isAvailable": true,
      "prepTime": "6 min"
  },

  {
      "id": "tt-nan-2",
      "stallId": "top-town",
      "category": "NAN RUTI",
      "parentCategory": "NAN RUTI",
      "name": "Butter Nan",
      "price": 70,
      "description": "Tandoor-baked fluffy nan generously brushed with melted salted butter.",
      "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&q=80",
      "isAvailable": true,
      "prepTime": "6 min"
  },

  {
      "id": "tt-nan-3",
      "stallId": "top-town",
      "category": "NAN RUTI",
      "parentCategory": "NAN RUTI",
      "name": "Garlic Nan",
      "price": 80,
      "description": "Fragrant tandoor-baked nan infused with minced roasted garlic, butter, and fresh coriander.",
      "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&q=80",
      "isAvailable": true,
      "prepTime": "8 min"
  },

  {
      "id": "tt-drk-1",
      "stallId": "top-town",
      "category": "DRINKS",
      "parentCategory": "DRINKS",
      "name": "Sweet Lassi",
      "price": 120,
      "description": "Traditional thick whipped yogurt beverage sweetened to perfection and topped with malai cream.",
      "hasVariants": true,
      "variants": [
          {
              "id": "reg",
              "name": "Regular",
              "price": 120
          },
          {
              "id": "lrg",
              "name": "Large",
              "price": 180
          }
      ],
      "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80",
      "isAvailable": true,
      "prepTime": "5 min"
  },

  {
      "id": "tt-drk-2",
      "stallId": "top-town",
      "category": "DRINKS",
      "parentCategory": "DRINKS",
      "name": "Salted Lassi",
      "price": 100,
      "description": "Refreshing savory yogurt drink seasoned with roasted cumin powder, black salt, and mint.",
      "hasVariants": true,
      "variants": [
          {
              "id": "reg",
              "name": "Regular",
              "price": 100
          },
          {
              "id": "lrg",
              "name": "Large",
              "price": 160
          }
      ],
      "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80",
      "isAvailable": true,
      "prepTime": "5 min"
  },

  {
      "id": "tt-drk-3",
      "stallId": "top-town",
      "category": "DRINKS",
      "parentCategory": "DRINKS",
      "name": "Jeera Pani",
      "price": 80,
      "description": "Icy digestive cooler infused with roasted cumin, tangy tamarind, mint, lemon, and Himalayan pink salt.",
      "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
      "isAvailable": true,
      "prepTime": "4 min"
  },

  {
      "id": "tt-cpl-1",
      "stallId": "top-town",
      "category": "COUPLE PLATTERS",
      "parentCategory": "COUPLE PLATTERS",
      "name": "Couple 1",
      "price": 799,
      "description": "Thai Soup (2 Person), Fried Chicken (4 Pcs), Wonthon (4 Pcs), Potato Masala Wedges (10 Pcs)",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "18 min"
  },

  {
      "id": "tt-cpl-2",
      "stallId": "top-town",
      "category": "COUPLE PLATTERS",
      "parentCategory": "COUPLE PLATTERS",
      "name": "Couple 2",
      "price": 750,
      "description": "Fried Rice (2 Person), Chicken Chilli, Fried Chicken (4 Pcs), Chinese Vegetable",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true,
      "prepTime": "18 min"
  },

  {
      "id": "tt-frc-1",
      "stallId": "top-town",
      "category": "FRIED RICE",
      "parentCategory": "FRIED RICE",
      "name": "Vegetables Fried Rice",
      "price": 200,
      "description": "Wok-tossed fragrant basmati rice with finely diced carrots, sweet corn, green peas, spring onions, and toasted sesame oil (1:3 sharing).",
      "image": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-frc-2",
      "stallId": "top-town",
      "category": "FRIED RICE",
      "parentCategory": "FRIED RICE",
      "name": "Chicken Fried Rice",
      "price": 260,
      "description": "Classic Chinese wok-fried rice with seasoned chicken bits, scrambled egg ribbons, and crisp scallions (1:3 sharing).",
      "image": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-frc-3",
      "stallId": "top-town",
      "category": "FRIED RICE",
      "parentCategory": "FRIED RICE",
      "name": "Prawn Fried Rice",
      "price": 300,
      "description": "Aromatic fried rice loaded with succulent sautéed prawns, eggs, and garden vegetables (1:3 sharing).",
      "image": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-frc-4",
      "stallId": "top-town",
      "category": "FRIED RICE",
      "parentCategory": "FRIED RICE",
      "name": "Special Fried Rice",
      "price": 360,
      "description": "Chef's ultimate wok-fried rice featuring a rich combination of chicken, prawns, egg ribbons, and secret seasonings (1:3 sharing).",
      "image": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-frc-5",
      "stallId": "top-town",
      "category": "FRIED RICE",
      "parentCategory": "FRIED RICE",
      "name": "1 Person Rice",
      "price": 120,
      "description": "Single serving of steaming wok-tossed egg and vegetable fried rice.",
      "image": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
      "isAvailable": true,
      "prepTime": "8 min"
  },

  {
      "id": "tt-siz-1",
      "stallId": "top-town",
      "category": "SIZZLING",
      "parentCategory": "SIZZLING",
      "name": "Chicken Sizzling",
      "price": 360,
      "description": "Tender chicken fillets tossed with bell peppers and onions, served piping hot on a flaming cast-iron platter.",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-siz-2",
      "stallId": "top-town",
      "category": "SIZZLING",
      "parentCategory": "SIZZLING",
      "name": "Prawn Sizzling",
      "price": 390,
      "description": "Plump ocean prawns cooked in a zesty garlic-chili sauce, served on a smoking hot iron sizzler.",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-siz-3",
      "stallId": "top-town",
      "category": "SIZZLING",
      "parentCategory": "SIZZLING",
      "name": "Seafood Sizzling",
      "price": 450,
      "description": "Grand ocean medley of prawns, calamari, and fish fillets tossed in aromatic spices on a smoking sizzler platter.",
      "image": "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=600&q=80",
      "isAvailable": true,
      "prepTime": "18 min"
  },

  {
      "id": "tt-siz-4",
      "stallId": "top-town",
      "category": "SIZZLING",
      "parentCategory": "SIZZLING",
      "name": "Beef Sizzling",
      "price": 450,
      "description": "Succulent marinated beef strips sautéed with ginger, garlic, and onions, brought flaming to your table.",
      "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
      "isAvailable": true,
      "prepTime": "18 min"
  },

  {
      "id": "tt-siz-5",
      "stallId": "top-town",
      "category": "SIZZLING",
      "parentCategory": "SIZZLING",
      "name": "Masala Crab Sizzling",
      "price": 420,
      "description": "Whole fresh sea crab tossed in a fiery masala chili glaze and served sizzling hot.",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true,
      "prepTime": "20 min"
  },

  {
      "id": "tt-siz-6",
      "stallId": "top-town",
      "category": "SIZZLING",
      "parentCategory": "SIZZLING",
      "name": "Shrimp Thermidor",
      "price": 520,
      "description": "Jumbo king prawns cooked in rich French-inspired cheese, cream, mustard, and herb sauce, served bubbling.",
      "image": "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=600&q=80",
      "isAvailable": true,
      "prepTime": "20 min"
  },

  {
      "id": "tt-siz-7",
      "stallId": "top-town",
      "category": "SIZZLING",
      "parentCategory": "SIZZLING",
      "name": "Deep Fried BBQ Coral (Whole Fish)",
      "price": 199,
      "unit": "per 100 gm",
      "isWeightBased": true,
      "minWeight": 500,
      "stepWeight": 100,
      "description": "Fresh whole coral fish deep-fried to a crunchy finish and glazed with smoky barbecue sauce. Price per 100g (minimum 500g).",
      "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
      "isAvailable": true,
      "prepTime": "22 min"
  },

  {
      "id": "tt-siz-8",
      "stallId": "top-town",
      "category": "SIZZLING",
      "parentCategory": "SIZZLING",
      "name": "Steam Coral (Whole Fish)",
      "price": 199,
      "unit": "per 100 gm",
      "isWeightBased": true,
      "minWeight": 500,
      "stepWeight": 100,
      "description": "Fresh whole coral fish gently steamed with ginger, scallions, light soy, and sesame oil. Price per 100g (minimum 500g).",
      "image": "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&q=80",
      "isAvailable": true,
      "prepTime": "22 min"
  },

  {
      "id": "tt-grv-1",
      "stallId": "top-town",
      "category": "GRAVY",
      "parentCategory": "GRAVY",
      "name": "Masala Chicken",
      "price": 360,
      "description": "Tender chicken cooked in rich and fragrant spiced onion-tomato curry reduction.",
      "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-grv-2",
      "stallId": "top-town",
      "category": "GRAVY",
      "parentCategory": "GRAVY",
      "name": "Manchurian Chicken",
      "price": 360,
      "description": "Crispy fried chicken meatballs simmered in a luscious dark Indo-Chinese ginger, garlic, and soy gravy.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-grv-3",
      "stallId": "top-town",
      "category": "GRAVY",
      "parentCategory": "GRAVY",
      "name": "Red Chili Onion",
      "price": 360,
      "description": "Spicy chicken stir-fry with diced red chilies, caramelized onions, and sweet-spicy thick sauce.",
      "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-grv-4",
      "stallId": "top-town",
      "category": "GRAVY",
      "parentCategory": "GRAVY",
      "name": "Prawn Chili Onion",
      "price": 420,
      "description": "Juicy prawns simmered with green chilies, spring onions, and savory dark soy sauce gravy.",
      "image": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-grv-5",
      "stallId": "top-town",
      "category": "GRAVY",
      "parentCategory": "GRAVY",
      "name": "Garlic Prawn",
      "price": 420,
      "description": "Plump prawns sautéed in abundant aromatic minced garlic, butter, and mild savory gravy.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-grv-6",
      "stallId": "top-town",
      "category": "GRAVY",
      "parentCategory": "GRAVY",
      "name": "Beef Chili Onion",
      "price": 430,
      "description": "Thinly sliced beef tossed with hot green chilies, white onions, and rich spicy brown sauce.",
      "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-grv-7",
      "stallId": "top-town",
      "category": "GRAVY",
      "parentCategory": "GRAVY",
      "name": "Beef With Ginger",
      "price": 440,
      "description": "Tender beef stir-fried with julienned fresh ginger, garlic, and savory Chinese oyster sauce.",
      "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-app-1",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Thai Fried Chicken (6pcs)",
      "price": 300,
      "description": "Crispy battered chicken drumettes and wings marinated in Thai fish sauce, garlic, and white pepper (6 pcs).",
      "image": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-app-2",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Chicken Basket With Fries",
      "price": 280,
      "description": "Crunchy golden chicken tenders served in a basket with salted crispy potato french fries and garlic dip.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-app-3",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Chicken Wonthon (6pcs)",
      "price": 180,
      "description": "Deep-fried golden wontons filled with spiced minced chicken, served with sweet-chili dipping sauce (6 pcs).",
      "image": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-app-4",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "French Fries",
      "price": 150,
      "description": "Hot and crispy salted golden potato fries served with tomato ketchup.",
      "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80",
      "isAvailable": true,
      "prepTime": "8 min"
  },

  {
      "id": "tt-app-5",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Garlic Mushroom",
      "price": 300,
      "description": "Whole button mushrooms pan-sautéed in rich garlic butter, chili flakes, and fresh parsley.",
      "image": "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-app-6",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Masala Wedges",
      "price": 150,
      "description": "Thick-cut potato wedges tossed in spicy chaat masala and herbs, fried to crunchy perfection.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-app-7",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "BBQ Drumsticks",
      "price": 450,
      "description": "Flame-grilled chicken drumsticks basted in thick smoky sweet-tangy barbecue sauce.",
      "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-app-8",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Naga Wings",
      "price": 240,
      "description": "Fiery crispy chicken wings tossed in authentic scorching Bangladeshi Naga Morich chili glaze.",
      "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-app-9",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Prawn Fry",
      "price": 380,
      "description": "Golden crispy crumb-coated jumbo prawns served with zesty homemade tartar sauce.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-app-10",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Chicken Lolipop",
      "price": 350,
      "description": "Frenched chicken winglets coated in spicy Indo-Chinese batter and deep-fried crisp.",
      "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-app-11",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Fish Finger",
      "price": 350,
      "description": "Tender white fish fillets cut into batons, seasoned with lemon and herbs, breaded and fried golden.",
      "image": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-app-12",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Naga Drums",
      "price": 270,
      "description": "Crispy chicken drumsticks tossed in fiery Naga chili paste with roasted cumin.",
      "image": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      "isAvailable": true,
      "prepTime": "14 min"
  },

  {
      "id": "tt-app-13",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Chrispy Fried Chicken",
      "price": 320,
      "description": "Double-crunch battered southern style fried chicken seasoned with secret herbs and spices.",
      "image": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-app-14",
      "stallId": "top-town",
      "category": "APPETIZER",
      "parentCategory": "APPETIZER",
      "name": "Chicken Popos",
      "price": 200,
      "description": "Bite-sized seasoned chicken popcorn nuggets fried golden and served with spiced mayo.",
      "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
      "isAvailable": true,
      "prepTime": "10 min"
  },

  {
      "id": "tt-set-1",
      "stallId": "top-town",
      "category": "SET MENU",
      "parentCategory": "SET MENU",
      "name": "Set Menu 1",
      "price": 340,
      "description": "Crispy Chicken 2pcs, Mix Vegetables, Egg Fried Rice & Salad",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-set-2",
      "stallId": "top-town",
      "category": "SET MENU",
      "parentCategory": "SET MENU",
      "name": "Set Menu 2",
      "price": 320,
      "description": "Thai Fried Chicken 2pcs, Mix Vegetables, Egg Fried Rice & Salad",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-set-3",
      "stallId": "top-town",
      "category": "SET MENU",
      "parentCategory": "SET MENU",
      "name": "Set Menu 3",
      "price": 380,
      "description": "Chicken Chili Onion, Chicken Lolipop 2pcs, Mix Vegetables, Egg Fried Rice & Salad",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-set-4",
      "stallId": "top-town",
      "category": "SET MENU",
      "parentCategory": "SET MENU",
      "name": "Set Menu 4",
      "price": 350,
      "description": "Chicken Munsurian, Mix Vegetables, Egg Fried Rice & Salad",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-set-5",
      "stallId": "top-town",
      "category": "SET MENU",
      "parentCategory": "SET MENU",
      "name": "Set Menu 5",
      "price": 380,
      "description": "Chicken Munsurian, BBQ Lolipop 2pcs, Mix Vegetables, Egg Fried Rice & Salad",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-set-6",
      "stallId": "top-town",
      "category": "SET MENU",
      "parentCategory": "SET MENU",
      "name": "Set Menu 6",
      "price": 420,
      "description": "Beef Ginger Mushroom, Chicken Fry 1pcs, Mix Vegetables, Egg Fried Rice & Salad",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "16 min"
  },

  {
      "id": "tt-set-7",
      "stallId": "top-town",
      "category": "SET MENU",
      "parentCategory": "SET MENU",
      "name": "Set Menu 7",
      "price": 380,
      "description": "Beef Ginger Mushroom, Mix Vegetables, Egg Fried Rice & Salad",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      "isAvailable": true,
      "prepTime": "15 min"
  },

  {
      "id": "tt-rb-1",
      "stallId": "top-town",
      "category": "RICE BOWL",
      "parentCategory": "RICE BOWL",
      "name": "Chili Chicken Rice Bowl",
      "price": 299,
      "description": "Steaming bowl of fragrant egg fried rice topped with spicy stir-fried chili chicken and crispy greens.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-rb-2",
      "stallId": "top-town",
      "category": "RICE BOWL",
      "parentCategory": "RICE BOWL",
      "name": "Chicken Sizzling Rice Bowl",
      "price": 299,
      "description": "Fried rice bowl crowned with sizzling caramelized chicken, capsicum, and savory pan reduction.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-rb-3",
      "stallId": "top-town",
      "category": "RICE BOWL",
      "parentCategory": "RICE BOWL",
      "name": "BBQ Chicken Rice Bowl",
      "price": 299,
      "description": "Steamed jasmine and egg rice topped with smoky sweet BBQ chicken strips and fresh coleslaw.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-rb-4",
      "stallId": "top-town",
      "category": "RICE BOWL",
      "parentCategory": "RICE BOWL",
      "name": "Chicken Strip Rice Bowl",
      "price": 299,
      "description": "Egg fried rice bowl topped with golden crispy chicken fillet strips and creamy garlic sauce.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  {
      "id": "tt-rb-5",
      "stallId": "top-town",
      "category": "RICE BOWL",
      "parentCategory": "RICE BOWL",
      "name": "Masala Chicken Rice Bowl",
      "price": 299,
      "description": "Fluffy fried rice served with richly spiced masala chicken gravy and sautéed onion garnish.",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
      "isAvailable": true,
      "prepTime": "12 min"
  },

  // ==========================================
  // STALL 3: MOMO BUZZ
  // ==========================================
  // MOMO
  { id: "mb-mom-1", stallId: "momo-buzz", category: "MOMO", name: "Chicken Momo", price: 150, isAvailable: true },
  { id: "mb-mom-2", stallId: "momo-buzz", category: "MOMO", name: "Mushroom Momo", price: 180, isAvailable: true },
  { id: "mb-mom-3", stallId: "momo-buzz", category: "MOMO", name: "Naga Momo", price: 180, isAvailable: true },
  { id: "mb-mom-4", stallId: "momo-buzz", category: "MOMO", name: "Cheese Momo", price: 200, isAvailable: true },
  { id: "mb-mom-5", stallId: "momo-buzz", category: "MOMO", name: "BBQ Momo", price: 200, isAvailable: true },
  { id: "mb-mom-6", stallId: "momo-buzz", category: "MOMO", name: "Sausage Momo", price: 200, isAvailable: true },
  { id: "mb-mom-7", stallId: "momo-buzz", category: "MOMO", name: "Cheese N' Corn Momo", price: 270, isAvailable: true },
  { id: "mb-mom-8", stallId: "momo-buzz", category: "MOMO", name: "Cheese Explode", price: 270, isAvailable: true },
  { id: "mb-mom-9", stallId: "momo-buzz", category: "MOMO", name: "BBQ Mushroom", price: 270, isAvailable: true },

  // MOMOCOLA
  { id: "mb-mcl-1", stallId: "momo-buzz", category: "MOMOCOLA", name: "Chicken Momocola", price: 210, isAvailable: true },
  { id: "mb-mcl-2", stallId: "momo-buzz", category: "MOMOCOLA", name: "Naga Mushroom Momocola", price: 240, isAvailable: true },
  { id: "mb-mcl-3", stallId: "momo-buzz", category: "MOMOCOLA", name: "Cheese Explode Momocola", price: 270, isAvailable: true },
  { id: "mb-mcl-4", stallId: "momo-buzz", category: "MOMOCOLA", name: "BBQ Squash Momocola", price: 270, isAvailable: true },

  // COMBO & OTHERS
  {
    id: "mb-cmb-1",
    stallId: "momo-buzz",
    category: "COMBO & OTHERS",
    name: "Momo Buzz Combo",
    price: 500,
    description: "18 pieces of chicken, cheese and mushroom momo with 2 soft drinks.",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80",
    isAvailable: true
  },
  { id: "mb-oth-2", stallId: "momo-buzz", category: "COMBO & OTHERS", name: "Momo in Chilli Oil", price: 200, isAvailable: true },

  // FUCHKA BUZZ
  { id: "mb-fuc-1", stallId: "momo-buzz", category: "FUCHKA BUZZ", name: "Regular Fuchka (12pcs)", price: 130, isAvailable: true },
  { id: "mb-fuc-2", stallId: "momo-buzz", category: "FUCHKA BUZZ", name: "Doi Fuchka (12pcs)", price: 150, isAvailable: true },
  { id: "mb-fuc-3", stallId: "momo-buzz", category: "FUCHKA BUZZ", name: "Naga Fuchka (12pcs)", price: 140, isAvailable: true },
  { id: "mb-fuc-4", stallId: "momo-buzz", category: "FUCHKA BUZZ", name: "Cocktail Fuchka (12pcs)", price: 180, isAvailable: true },
  { id: "mb-fuc-5", stallId: "momo-buzz", category: "FUCHKA BUZZ", name: "Regular Chotpoti", price: 120, isAvailable: true },
  { id: "mb-fuc-6", stallId: "momo-buzz", category: "FUCHKA BUZZ", name: "Naga Chotpoti", price: 130, isAvailable: true },
  { id: "mb-fuc-7", stallId: "momo-buzz", category: "FUCHKA BUZZ", name: "Fuchka Buzz Special", price: 160, isAvailable: true },

  // ==========================================
  // STALL 4: WAFFLE CITY
  // ==========================================
  // WAFFLE
  { id: "wc-waf-1", stallId: "waffle-city", category: "WAFFLE", name: "Nutella", price: 160, isAvailable: true },
  { id: "wc-waf-2", stallId: "waffle-city", category: "WAFFLE", name: "Banana Nuts With Chocolate", price: 170, isAvailable: true },
  { id: "wc-waf-3", stallId: "waffle-city", category: "WAFFLE", name: "Red Velvet With Cream Chocolate", price: 170, isAvailable: true },
  { id: "wc-waf-4", stallId: "waffle-city", category: "WAFFLE", name: "Chocolate With Nuts", price: 170, isAvailable: true },
  { id: "wc-waf-5", stallId: "waffle-city", category: "WAFFLE", name: "Cream With Chocolate", price: 170, isAvailable: true },
  { id: "wc-waf-6", stallId: "waffle-city", category: "WAFFLE", name: "Chocolate Blast", price: 180, isAvailable: true },
  { id: "wc-waf-7", stallId: "waffle-city", category: "WAFFLE", name: "Truti Fruti Waffle", price: 180, isAvailable: true },
  { id: "wc-waf-8", stallId: "waffle-city", category: "WAFFLE", name: "Cream With Strawberry", price: 200, isAvailable: true },
  { id: "wc-waf-9", stallId: "waffle-city", category: "WAFFLE", name: "Cream With Blueberry", price: 200, isAvailable: true },
  { id: "wc-waf-10", stallId: "waffle-city", category: "WAFFLE", name: "Nutella With Ice-Cream", price: 220, isAvailable: true },
  { id: "wc-waf-11", stallId: "waffle-city", category: "WAFFLE", name: "Kitkat With Chocolate Chips", price: 220, isAvailable: true },
  { id: "wc-waf-12", stallId: "waffle-city", category: "WAFFLE", name: "Creamy Oreo", price: 220, isAvailable: true },
  { id: "wc-waf-13", stallId: "waffle-city", category: "WAFFLE", name: "Crazy Bliss", price: 280, isAvailable: true },

  // ADD ONS
  { id: "wc-ado-1", stallId: "waffle-city", category: "ADD ONS", name: "Ice Cream", price: 60, isAvailable: true, isAddOn: true },
  { id: "wc-ado-2", stallId: "waffle-city", category: "ADD ONS", name: "Whipped Cream", price: 40, isAvailable: true, isAddOn: true },
  { id: "wc-ado-3", stallId: "waffle-city", category: "ADD ONS", name: "Chocolate Chips", price: 30, isAvailable: true, isAddOn: true },
  { id: "wc-ado-4", stallId: "waffle-city", category: "ADD ONS", name: "Extra Nuts", price: 20, isAvailable: true, isAddOn: true },
  { id: "wc-ado-5", stallId: "waffle-city", category: "ADD ONS", name: "Cream Cheese", price: 40, isAvailable: true, isAddOn: true },
  { id: "wc-ado-6", stallId: "waffle-city", category: "ADD ONS", name: "Extra Nutella", price: 50, isAvailable: true, isAddOn: true },

  // ==========================================
  // STALL 5: LIVE STATION
  // ==========================================
  // BBQ & KABAB
  { id: "ls-bbq-1", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Tandoori Kabab", price: 220, isAvailable: true },
  { id: "ls-bbq-2", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken BBQ", price: 230, isAvailable: true },
  { id: "ls-bbq-3", stallId: "live-station", category: "BBQ & KABAB", name: "Tandoori Chicken", price: 220, isAvailable: true },
  { id: "ls-bbq-4", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Chap Masala", price: 230, isAvailable: true },
  { id: "ls-bbq-5", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Boti Kabab", price: 220, isAvailable: true },
  { id: "ls-bbq-6", stallId: "live-station", category: "BBQ & KABAB", name: "Naga Chicken Kabab", price: 230, isAvailable: true },
  { id: "ls-bbq-7", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Achari Kabab", price: 220, isAvailable: true },
  { id: "ls-bbq-8", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Reshmi Kabab", price: 240, isAvailable: true },
  { id: "ls-bbq-9", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Malai Kabab", price: 250, isAvailable: true },
  { id: "ls-bbq-10", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Hariyali Kabab", price: 220, isAvailable: true },
  { id: "ls-bbq-11", stallId: "live-station", category: "BBQ & KABAB", name: "Afghani Chicken Kabab", price: 250, isAvailable: true },
  { id: "ls-bbq-12", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Drumstick / Naga", price: 299, isAvailable: true },
  { id: "ls-bbq-13", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Lollipop (Badshahi)", price: 299, isAvailable: true },
  { id: "ls-bbq-14", stallId: "live-station", category: "BBQ & KABAB", name: "Chicken Tikka (Sonali)", price: 290, isAvailable: true },
  { id: "ls-bbq-15", stallId: "live-station", category: "BBQ & KABAB", name: "Beef Seek Kabab", price: 280, isAvailable: true },
  { id: "ls-bbq-16", stallId: "live-station", category: "BBQ & KABAB", name: "Beef Boti Kabab", price: 280, isAvailable: true },
  {
    id: "ls-bbq-17",
    stallId: "live-station",
    category: "BBQ & KABAB",
    name: "Whole Koral Fish",
    price: 199,
    unit: "per 100 gram",
    isWeightBased: true,
    minWeight: 500,
    stepWeight: 100,
    description: "Charcoal roasted whole fresh Koral. Price per 100g (minimum 500g).",
    isAvailable: true
  },
  { id: "ls-bbq-18", stallId: "live-station", category: "BBQ & KABAB", name: "Luchi", price: 30, isAvailable: true },

  // PLATTERS
  {
    id: "ls-plt-1",
    stallId: "live-station",
    category: "PLATTERS",
    name: "Platter 1 (1:2)",
    price: 915,
    description: "Chicken Achari Kabab, Chicken Boti Kabab, Chicken Lollipop, Tandoori Chicken, Plain Naan, Basmati Rice, Salad & Sauce.",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    isAvailable: true
  },
  {
    id: "ls-plt-2",
    stallId: "live-station",
    category: "PLATTERS",
    name: "Platter 2 (1:2)",
    price: 745,
    description: "Beef Seekh Kabab, Dramsatic, Chicken Wings, Garlic Naan, Salad & Sauce.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
    isAvailable: true
  },
  {
    id: "ls-plt-3",
    stallId: "live-station",
    category: "PLATTERS",
    name: "Platter 3 (1:4)",
    price: 1290,
    description: "Basmati Rice, Plain Naan (2pcs), Chicken Hariyali Kabab, Chicken Afghani Kabab, Chicken Reshmi Kabab, Chicken Wings, Salad & Sauce.",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    isAvailable: true
  },
  {
    id: "ls-plt-4",
    stallId: "live-station",
    category: "PLATTERS",
    name: "Platter 4 (1:4)",
    price: 970,
    description: "Whole Chicken (4 pcs), Plain Naan (2 pcs), Salad & Sauce.",
    image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80",
    isAvailable: true
  },
  {
    id: "ls-plt-5",
    stallId: "live-station",
    category: "PLATTERS",
    name: "Premium (1:4)",
    price: 2250,
    description: "Basmati Rice (2x), Plain Naan (4 pcs), Beef Seekh Kabab (2 pcs), Chicken Boti Kabab (2 pcs), Tandoori Chicken (1 pcs), BBQ Chicken (1 pcs), Chicken Malai Kabab (2 pcs), Salad & Sauce.",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    isAvailable: true
  },
  {
    id: "ls-plt-6",
    stallId: "live-station",
    category: "PLATTERS",
    name: "Luxury (1:4)",
    price: 2350,
    description: "Chicken Boti Kabab (2 pcs), Beef Seekh Kabab (2 pcs), Chicken Malai Kabab (2 pcs), Chicken Reshmi Kabab (2 pcs), Chicken Afghani Kabab (1 pc), Plain Naan, Salad & Sauce.",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    isAvailable: true
  },

  // ==========================================
  // STALL 6: BURGER BAR
  // ==========================================
  // BURGER
  { id: "bb-bgr-1", stallId: "burger-bar", category: "BURGER", name: "Chicken Burger (Reg)", price: 199, isAvailable: true },
  { id: "bb-bgr-2", stallId: "burger-bar", category: "BURGER", name: "Chicken Crispy Burger", price: 225, isAvailable: true },
  { id: "bb-bgr-3", stallId: "burger-bar", category: "BURGER", name: "Chicken Cheese Delight", price: 249, isAvailable: true },
  { id: "bb-bgr-4", stallId: "burger-bar", category: "BURGER", name: "Naga Chicken Burger", price: 220, isAvailable: true },
  { id: "bb-bgr-5", stallId: "burger-bar", category: "BURGER", name: "Beef Cheese Burger", price: 330, isAvailable: true },

  // SANDWICH
  { id: "bb-sdw-1", stallId: "burger-bar", category: "SANDWICH", name: "Sub Sandwich (Regular)", price: 220, isAvailable: true },
  { id: "bb-sdw-2", stallId: "burger-bar", category: "SANDWICH", name: "BBQ Cheese Sub", price: 259, isAvailable: true },
  { id: "bb-sdw-3", stallId: "burger-bar", category: "SANDWICH", name: "Grilled Chicken Sandwich", price: 180, isAvailable: true },
  { id: "bb-sdw-4", stallId: "burger-bar", category: "SANDWICH", name: "Club Sandwich (4pcs) with French fries", price: 349, isAvailable: true },

  // MEAT BOX
  { id: "bb-mbx-1", stallId: "burger-bar", category: "MEAT BOX", name: "Meat Box (Regular)", price: 260, isAvailable: true },
  { id: "bb-mbx-2", stallId: "burger-bar", category: "MEAT BOX", name: "BBQ Cheese Meat Box", price: 290, isAvailable: true },
  { id: "bb-mbx-3", stallId: "burger-bar", category: "MEAT BOX", name: "Naga Meat Box", price: 280, isAvailable: true },

  // CRISPY CHICKEN
  { id: "bb-chk-1", stallId: "burger-bar", category: "CRISPY CHICKEN", name: "Thai", price: 170, isAvailable: true },
  { id: "bb-chk-2", stallId: "burger-bar", category: "CRISPY CHICKEN", name: "Breast Piece", price: 170, isAvailable: true },
  { id: "bb-chk-3", stallId: "burger-bar", category: "CRISPY CHICKEN", name: "Chest Piece", price: 160, isAvailable: true },
  { id: "bb-chk-4", stallId: "burger-bar", category: "CRISPY CHICKEN", name: "Leg Piece", price: 170, isAvailable: true },
  { id: "bb-chk-5", stallId: "burger-bar", category: "CRISPY CHICKEN", name: "Whole Wings", price: 120, isAvailable: true },
  { id: "bb-chk-6", stallId: "burger-bar", category: "CRISPY CHICKEN", name: "Chicken Strips (6pcs)", price: 249, isAvailable: true },
  { id: "bb-chk-7", stallId: "burger-bar", category: "CRISPY CHICKEN", name: "Pops Chicken (8pcs)", price: 260, isAvailable: true },

  // WRAP ROLL
  { id: "bb-wrp-1", stallId: "burger-bar", category: "WRAP ROLL", name: "Chicken Wrap", price: 200, isAvailable: true },
  { id: "bb-wrp-2", stallId: "burger-bar", category: "WRAP ROLL", name: "Chicken Shawarma", price: 220, isAvailable: true },
  { id: "bb-wrp-3", stallId: "burger-bar", category: "WRAP ROLL", name: "Beef Wrap", price: 320, isAvailable: true },
  { id: "bb-wrp-4", stallId: "burger-bar", category: "WRAP ROLL", name: "Beef Shawarma", price: 300, isAvailable: true },

  // FRENCH FRIES
  { id: "bb-ff-1", stallId: "burger-bar", category: "FRENCH FRIES", name: "French Fries Regular", price: 130, isAvailable: true },
  { id: "bb-ff-2", stallId: "burger-bar", category: "FRENCH FRIES", name: "Mayo French Fries", price: 150, isAvailable: true },
  { id: "bb-ff-3", stallId: "burger-bar", category: "FRENCH FRIES", name: "Masala French Fries", price: 150, isAvailable: true },

  // ADD ONS
  { id: "bb-ado-1", stallId: "burger-bar", category: "ADD ONS", name: "Bun", price: 35, isAvailable: true, isAddOn: true },
  { id: "bb-ado-2", stallId: "burger-bar", category: "ADD ONS", name: "Patty", price: 99, isAvailable: true, isAddOn: true },
  { id: "bb-ado-3", stallId: "burger-bar", category: "ADD ONS", name: "Cheese", price: 35, isAvailable: true, isAddOn: true },
  { id: "bb-ado-4", stallId: "burger-bar", category: "ADD ONS", name: "Sauce", price: 8, isAvailable: true, isAddOn: true },
  { id: "bb-ado-5", stallId: "burger-bar", category: "ADD ONS", name: "Coleslaw", price: 35, isAvailable: true, isAddOn: true },
  { id: "bb-ado-6", stallId: "burger-bar", category: "ADD ONS", name: "Naga Sauce", price: 20, isAvailable: true, isAddOn: true },
  { id: "bb-ado-7", stallId: "burger-bar", category: "ADD ONS", name: "Mayo", price: 35, isAvailable: true, isAddOn: true },

  // COMBO
  {
    id: "bb-cmb-1",
    stallId: "burger-bar",
    category: "COMBO",
    name: "Burger Combo 1",
    price: 320,
    description: "Chicken Burger (1), Coleslaw (1), French Fries (1) & Sauces (1)",
    isAvailable: true
  },
  {
    id: "bb-cmb-2",
    stallId: "burger-bar",
    category: "COMBO",
    name: "Burger Combo 2",
    price: 500,
    description: "Chicken Burger (2pcs), Coleslaw (1), French Fries (1) & Sauces (2)",
    isAvailable: true
  },
  {
    id: "bb-cmb-3",
    stallId: "burger-bar",
    category: "COMBO",
    name: "Crispy Chicken Combo 1",
    price: 460,
    description: "Crispy Chicken (2pcs), Coleslaw (1), French Fries (1) & Sauces (2)",
    isAvailable: true
  },
  {
    id: "bb-cmb-4",
    stallId: "burger-bar",
    category: "COMBO",
    name: "Crispy Chicken Combo Couple",
    price: 750,
    description: "Crispy Chicken (4pcs), Coleslaw (2), French Fries (1) & Sauces (4)",
    isAvailable: true
  },
  {
    id: "bb-cmb-5",
    stallId: "burger-bar",
    category: "COMBO",
    name: "Crispy Chicken Combo Family",
    price: 1750,
    description: "Crispy Chicken (10pcs), Coleslaw (3), Chicken Wings (2pcs), French Fries (1) & Sauces (12)",
    isAvailable: true
  },
  {
    id: "bb-cmb-6",
    stallId: "burger-bar",
    category: "COMBO",
    name: "Kids Meal",
    price: 350,
    description: "Pop Chicken (4pcs), Chicken Fry (1), Bun (2pcs), French Fries (1) & Sauce (2)",
    isAvailable: true
  }
];

// 55 Tables with Zones
export const tablesData = Array.from({ length: 55 }, (_, i) => {
  const num = i + 1;
  const tableId = `T${num.toString().padStart(2, "0")}`;
  let zone = "Zone A (Central Piazza)";
  if (num > 18 && num <= 36) zone = "Zone B (Fusion Boulevard)";
  else if (num > 36 && num <= 46) zone = "Zone C (Garden Terrace)";
  else if (num > 46) zone = "Executive VIP Lounge";

  return {
    id: tableId,
    name: `Table ${tableId}`,
    zone,
    seats: num % 4 === 0 ? 6 : num % 2 === 0 ? 4 : 2,
    status: num === 17 ? "ACTIVE" : num === 5 ? "PAYMENT DUE" : num === 12 ? "PREPARING" : "AVAILABLE",
    currentSessionId: num === 17 ? "sess-t17-active" : null,
    activeOrderToken: num === 17 ? "0047" : null,
    totalSpentToday: num === 17 ? 1999 : num === 5 ? 1450 : 0
  };
});

// Seed users for all roles
export const usersData = [
  { id: "usr-1", name: "Chief Admin", email: "admin@vivacity.local", role: "SUPER ADMIN", stallId: null },
  { id: "usr-2", name: "Food Court Manager", email: "manager@vivacity.local", role: "MANAGER", stallId: null },
  { id: "usr-3", name: "Main Cashier", email: "cashier@vivacity.local", role: "CASHIER", stallId: null },
  { id: "usr-4", name: "Fusion Cafe Lead", email: "fusion@vivacity.local", role: "STALL MANAGER", stallId: "fusion-cafe" },
  { id: "usr-5", name: "Top Town Chef", email: "toptown@vivacity.local", role: "STALL MANAGER", stallId: "top-town" },
  { id: "usr-6", name: "Momo Buzz Staff", email: "momobuzz@vivacity.local", role: "STALL MANAGER", stallId: "momo-buzz" },
  { id: "usr-7", name: "Waffle City Barista", email: "wafflecity@vivacity.local", role: "STALL MANAGER", stallId: "waffle-city" },
  { id: "usr-8", name: "Live Station Master", email: "livestation@vivacity.local", role: "STALL MANAGER", stallId: "live-station" },
  { id: "usr-9", name: "Burger Bar Lead", email: "burgerbar@vivacity.local", role: "STALL MANAGER", stallId: "burger-bar" },
  { id: "usr-10", name: "Head Kitchen Chef", email: "kitchen@vivacity.local", role: "KITCHEN STAFF", stallId: null },
  { id: "usr-11", name: "Floor Runner Kabir", email: "runner@vivacity.local", role: "RUNNER / WAITER", stallId: null },
];
