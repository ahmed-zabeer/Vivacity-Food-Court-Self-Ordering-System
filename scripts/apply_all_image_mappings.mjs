import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

// Complete 100% item mapping for all 332 items across all 6 stalls
export const imageMapping = {
  // =========================================================================
  // 1. Coffee Buzz Fusion Cafe (150 items)
  // =========================================================================
  // STEAK (15 items)
  'cb-stk-1': '/assets/fusion%20Cafe/Steaks/Asset%2031@4x.png',
  'cb-stk-2': '/assets/fusion%20Cafe/Steaks/Asset%2032@4x.png',
  'cb-stk-3': '/assets/fusion%20Cafe/Steaks/Asset%2033@4x.png',
  'cb-stk-4': '/assets/fusion%20Cafe/Steaks/Asset%2030@4x.png',
  'cb-stk-5': '/assets/fusion%20Cafe/Steaks/Asset%2028@4x.png',
  'cb-stk-6': '/assets/fusion%20Cafe/Steaks/Asset%2029@4x.png',
  'cb-stk-c1': '/assets/fusion%20Cafe/Combo/Asset%2034@4x.png',
  'cb-stk-c2': '/assets/fusion%20Cafe/Combo/Asset%2035@4x.png',
  'cb-stk-c3': '/assets/fusion%20Cafe/Combo/Asset%2036@4x.png',
  'cb-stk-c4': '/assets/fusion%20Cafe/Combo/Asset%2037@4x.png',
  'cb-stk-c5': '/assets/fusion%20Cafe/Combo/Asset%2038@4x.png',
  'cb-stk-c6': '/assets/fusion%20Cafe/Combo/Asset%2039@4x.png',
  'cb-platter-couple': '/assets/fusion%20Cafe/Premium%20Mix%20Platter/Asset%2040@4x.png',
  'cb-platter-fm': '/assets/fusion%20Cafe/Premium%20Mix%20Platter/Asset%2041@4x.png',
  'cb-platter-cc': '/assets/fusion%20Cafe/Premium%20Mix%20Platter/Asset%2042@4x.png',

  // SEAFOOD (12 items)
  'cb-sea-1': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2024@4x.png',
  'cb-sea-2': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2025@4x.png',
  'cb-sea-3': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2022@4x.png',
  'cb-sea-4': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2026@4x.png',
  'cb-sea-5': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2023@4x.png',
  'cb-sea-6': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2027@4x.png',
  'cb-sea-7': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2020@4x.png',
  'cb-sea-8': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2021@4x.png',
  'cb-sea-9': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2017@4x.png',
  'cb-sea-10': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2018@4x.png',
  'cb-sea-11': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2019@4x.png',
  'cb-sea-12': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2016@4x.png',

  // COMBO MEAL (4 items)
  'cb-cmb-1': '/assets/fusion%20Cafe/Combo/Asset%2034@4x.png',
  'cb-cmb-2': '/assets/fusion%20Cafe/Combo/Asset%2035@4x.png',
  'cb-cmb-3': '/assets/fusion%20Cafe/Combo/Asset%2036@4x.png',
  'cb-cmb-4': '/assets/fusion%20Cafe/Combo/Asset%2037@4x.png',

  // CHEF SPECIAL (6 items)
  'cb-chef-1': '/assets/fusion%20Cafe/Chef%20Special/Asset%2043@4x.png',
  'cb-chef-2': '/assets/fusion%20Cafe/Chef%20Special/Asset%2044@4x.png',
  'cb-chef-3': '/assets/fusion%20Cafe/Chef%20Special/Asset%2045@4x.png',
  'cb-chef-4': '/assets/fusion%20Cafe/Chef%20Special/Asset%2046@4x.png',
  'cb-chef-5': '/assets/fusion%20Cafe/Chef%20Special/Asset%2047@4x.png',
  'cb-chef-6': '/assets/fusion%20Cafe/Chef%20Special/Asset%2048@4x.png',

  // STARTERS (19 items)
  'cb-reg-st-1': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2031@4x.png',
  'cb-reg-st-2': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2031@4x.png',
  'cb-reg-st-3': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2023@4x.png',
  'cb-reg-st-4': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2030@4x.png',
  'cb-reg-st-5': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2019@4x.png',
  'cb-reg-st-6': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2029@4x.png',
  'cb-reg-st-7': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2027@4x.png',
  'cb-reg-st-8': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2026@4x.png',
  'cb-reg-st-9': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2025@4x.png',
  'cb-reg-st-10': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2028@4x.png',
  'cb-reg-st-11': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2022@4x.png',
  'cb-reg-st-12': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2024@4x.png',
  'cb-reg-st-13': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2032@4x.png',
  'cb-reg-st-14': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2018@4x.png',
  'cb-reg-st-15': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2020@4x.png',
  'cb-reg-st-16': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2021@4x.png',
  'cb-reg-st-17': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2017@4x.png',
  'cb-reg-st-18': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2016@4x.png',
  'cb-reg-st-19': '/assets/fusion%20Cafe/Fusion%20Starters/Asset%2033@4x.png',

  // PASTA & NOODLES (9 items)
  'cb-pas-1': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2075@4x.png',
  'cb-pas-2': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2076@4x.png',
  'cb-pas-3': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2077@4x.png',
  'cb-pas-4': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2078@4x.png',
  'cb-pas-5': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2079@4x.png',
  'cb-pas-6': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2080@4x.png',
  'cb-pas-7': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2081@4x.png',
  'cb-pas-8': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2082@4x.png',
  'cb-pas-9': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2083@4x.png',

  // SOUP (6 items)
  'cb-sop-1': '/assets/Top%20Town/Soup/Asset%2072@4x.png',
  'cb-sop-2': '/assets/Top%20Town/Soup/Asset%2073@4x.png',
  'cb-sop-3': '/assets/Top%20Town/Soup/Asset%2072@4x.png',
  'cb-sop-4': '/assets/Top%20Town/Soup/Asset%2074@4x.png',
  'cb-sop-5': '/assets/Top%20Town/Soup/Asset%2072@4x.png',
  'cb-sop-6': '/assets/Top%20Town/Soup/Asset%2071@4x.png',

  // SALAD (4 items)
  'cb-sal-1': '/assets/fusion%20Cafe/Fusion%20Salad/Asset%2090@4x.png',
  'cb-sal-2': '/assets/fusion%20Cafe/Fusion%20Salad/Asset%2091@4x.png',
  'cb-sal-3': '/assets/fusion%20Cafe/Fusion%20Salad/Asset%2092@4x.png',
  'cb-sal-4': '/assets/fusion%20Cafe/Fusion%20Salad/Asset%2094@4x.png',

  // IMPROVED PLATTER (15 items)
  'cb-imp-1': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%201@4x.png',
  'cb-imp-2': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%202@4x.png',
  'cb-imp-3': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%203@4x.png',
  'cb-imp-4': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%204@4x.png',
  'cb-imp-5': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%205@4x.png',
  'cb-imp-6': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%206@4x.png',
  'cb-imp-7': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%207@4x.png',
  'cb-imp-8': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%208@4x.png',
  'cb-imp-9': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%209@4x.png',
  'cb-imp-10': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%2010@4x.png',
  'cb-imp-11': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%2011@4x.png',
  'cb-imp-12': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%2012@4x.png',
  'cb-imp-13': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%2013@4x.png',
  'cb-imp-14': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%2014@4x.png',
  'cb-imp-15': '/assets/fusion%20Cafe/Fusion%20Platter%20Improved/Asset%2015@4x.png',

  // PIZZA (11 items)
  'cb-piz-1': '/assets/menu/fusion-pizza-tandoori.jpg',
  'cb-piz-2': '/assets/menu/fusion-pizza-mexican-hot.jpg',
  'cb-piz-3': '/assets/menu/fusion-pizza-barcelona.jpg',
  'cb-piz-4': '/assets/menu/fusion-pizza-chick-bbq.jpg',
  'cb-piz-5': '/assets/menu/fusion-pizza-sausage-carnival.jpg',
  'cb-piz-6': '/assets/menu/fusion-pizza-beef-lovers.jpg',
  'cb-piz-7': '/assets/menu/fusion-pizza-margherita.jpg',
  'cb-piz-8': '/assets/menu/fusion-pizza-four-season.jpg',
  'cb-piz-9': '/assets/menu/fusion-pizza-pepperoni.jpg',
  'cb-piz-10': '/assets/menu/fusion-pizza-seafood.jpg',
  'cb-piz-11': '/assets/menu/fusion-pizza-special.jpg',

  // BOBA DRINK (17 items)
  'cb-bob-1': '/assets/menu/drinks-boba-milk-tea.jpg',
  'cb-bob-2': '/assets/menu/drinks-boba-milk-tea.jpg',
  'cb-bob-3': '/assets/menu/drinks-boba-chocolate.jpg',
  'cb-bob-4': '/assets/menu/drinks-boba-chocolate.jpg',
  'cb-bob-5': '/assets/menu/drinks-boba-chocolate.jpg',
  'cb-bob-6': '/assets/menu/drinks-smoothie-fruit.jpg',
  'cb-bob-7': '/assets/menu/drinks-smoothie-fruit.jpg',
  'cb-bob-8': '/assets/menu/drinks-boba-milk-tea.jpg',
  'cb-bob-9': '/assets/menu/drinks-smoothie-fruit.jpg',
  'cb-bob-10': '/assets/menu/drinks-shake-chocolate.jpg',
  'cb-bob-11': '/assets/menu/drinks-shake-strawberry.jpg',
  'cb-bob-12': '/assets/menu/drinks-shake-vanilla.jpg',
  'cb-bob-13': '/assets/menu/drinks-smoothie-fruit.jpg',
  'cb-bob-14': '/assets/menu/drinks-shake-vanilla.jpg',
  'cb-bob-15': '/assets/menu/drinks-shake-vanilla.jpg',
  'cb-bob-16': '/assets/menu/drinks-shake-oreo.jpg',
  'cb-bob-17': '/assets/menu/drinks-boba-milk-tea.jpg',

  // ICE CRUSHED (8 items)
  'cb-drk-1': '/assets/menu/drinks-lemonade.jpg',
  'cb-drk-2': '/assets/menu/drinks-lemonade.jpg',
  'cb-drk-3': '/assets/menu/drinks-lemonade.jpg',
  'cb-drk-4': '/assets/menu/drinks-lemon-mint.jpg',
  'cb-drk-5': '/assets/menu/drinks-lemon-mint.jpg',
  'cb-drk-6': '/assets/menu/drinks-orange-cooler.jpg',
  'cb-drk-7': '/assets/menu/drinks-lemonade.jpg',
  'cb-drk-8': '/assets/menu/drinks-mojito.jpg',

  // HEALTHY DRINKS (6 items)
  'cb-hlt-1': '/assets/menu/drinks-smoothie-fruit.jpg',
  'cb-hlt-2': '/assets/menu/drinks-lemonade.jpg',
  'cb-hlt-3': '/assets/menu/drinks-orange-cooler.jpg',
  'cb-hlt-4': '/assets/menu/drinks-smoothie-fruit.jpg',
  'cb-hlt-5': '/assets/menu/drinks-orange-cooler.jpg',
  'cb-hlt-6': '/assets/menu/drinks-smoothie-fruit.jpg',

  // SHAKE (8 items)
  'cb-shk-1': '/assets/menu/drinks-shake-chocolate.jpg',
  'cb-shk-2': '/assets/menu/drinks-shake-strawberry.jpg',
  'cb-shk-3': '/assets/menu/drinks-shake-vanilla.jpg',
  'cb-shk-4': '/assets/menu/drinks-smoothie-fruit.jpg',
  'cb-shk-5': '/assets/menu/drinks-shake-vanilla.jpg',
  'cb-shk-6': '/assets/menu/drinks-smoothie-fruit.jpg',
  'cb-shk-7': '/assets/menu/drinks-shake-vanilla.jpg',
  'cb-shk-8': '/assets/menu/drinks-shake-oreo.jpg',

  // SPECIAL DRINKS (4 items)
  'cb-spc-1': '/assets/menu/drinks-shake-vanilla.jpg',
  'cb-spc-2': '/assets/menu/drinks-blue-lagoon.jpg',
  'cb-spc-3': '/assets/menu/drinks-mojito.jpg',
  'cb-spc-4': '/assets/menu/drinks-lemon-mint.jpg',

  // COFFEE (6 items)
  'cb-cff-1': '/assets/menu/drinks-cold-coffee.jpg',
  'cb-cff-2': '/assets/menu/drinks-cold-coffee.jpg',
  'cb-cff-3': '/assets/menu/drinks-cold-coffee.jpg',
  'cb-cff-4': '/assets/menu/drinks-special-coffee.jpg',
  'cb-cff-5': '/assets/menu/drinks-special-coffee.jpg',
  'cb-cff-6': '/assets/menu/drinks-hot-coffee.jpg',

  // =========================================================================
  // 2. Top Town (78 items)
  // =========================================================================
  // APPETIZER (14 items)
  'tt-app-1': '/assets/Top%20Town/Apatizer/Asset%2057@4x.png',
  'tt-app-2': '/assets/Top%20Town/Apatizer/Asset%2058@4x.png',
  'tt-app-3': '/assets/Top%20Town/Apatizer/Asset%2070@4x.png',
  'tt-app-4': '/assets/Top%20Town/Apatizer/Asset%2059@4x.png',
  'tt-app-5': '/assets/Top%20Town/Apatizer/Asset%2060@4x.png',
  'tt-app-6': '/assets/Top%20Town/Apatizer/Asset%2061@4x.png',
  'tt-app-7': '/assets/Top%20Town/Apatizer/Asset%2062@4x.png',
  'tt-app-8': '/assets/Top%20Town/Apatizer/Asset%2069@4x.png',
  'tt-app-9': '/assets/Top%20Town/Apatizer/Asset%2063@4x.png',
  'tt-app-10': '/assets/Top%20Town/Apatizer/Asset%2064@4x.png',
  'tt-app-11': '/assets/Top%20Town/Apatizer/Asset%2067@4x.png',
  'tt-app-12': '/assets/Top%20Town/Apatizer/Asset%2066@4x.png',
  'tt-app-13': '/assets/Top%20Town/Apatizer/Asset%2068@4x.png',
  'tt-app-14': '/assets/Top%20Town/Apatizer/Asset%2065@4x.png',

  // SOUP (4 items)
  'tt-sop-1': '/assets/Top%20Town/Soup/Asset%2071@4x.png',
  'tt-sop-2': '/assets/Top%20Town/Soup/Asset%2072@4x.png',
  'tt-sop-3': '/assets/Top%20Town/Soup/Asset%2073@4x.png',
  'tt-sop-4': '/assets/Top%20Town/Soup/Asset%2074@4x.png',

  // SET MENU (7 items)
  'tt-set-1': '/assets/Top%20Town/Set%20Menu/Asset%2075@4x.png',
  'tt-set-2': '/assets/Top%20Town/Set%20Menu/Asset%2076@4x.png',
  'tt-set-3': '/assets/Top%20Town/Set%20Menu/Asset%2077@4x.png',
  'tt-set-4': '/assets/Top%20Town/Set%20Menu/Asset%2078@4x.png',
  'tt-set-5': '/assets/Top%20Town/Set%20Menu/Asset%2079@4x.png',
  'tt-set-6': '/assets/Top%20Town/Set%20Menu/Asset%2080@4x.png',
  'tt-set-7': '/assets/Top%20Town/Set%20Menu/Asset%2081@4x.png',

  // RICE BOWL (5 items)
  'tt-rb-1': '/assets/Top%20Town/Rice%20Bowl/Asset%2082@4x.png',
  'tt-rb-2': '/assets/Top%20Town/Rice%20Bowl/Asset%2082@4x.png',
  'tt-rb-3': '/assets/Top%20Town/Rice%20Bowl/Asset%2082@4x.png',
  'tt-rb-4': '/assets/Top%20Town/Rice%20Bowl/Asset%2082@4x.png',
  'tt-rb-5': '/assets/Top%20Town/Rice%20Bowl/Asset%2082@4x.png',

  // FRIED RICE (5 items)
  'tt-frc-1': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2083@4x.png',
  'tt-frc-2': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2083@4x.png',
  'tt-frc-3': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2083@4x.png',
  'tt-frc-4': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2083@4x.png',
  'tt-frc-5': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2083@4x.png',

  // SIZZLING (8 items)
  'tt-siz-1': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2084@4x.png',
  'tt-siz-2': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2084@4x.png',
  'tt-siz-3': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2084@4x.png',
  'tt-siz-4': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2084@4x.png',
  'tt-siz-5': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2084@4x.png',
  'tt-siz-6': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2084@4x.png',
  'tt-siz-7': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',
  'tt-siz-8': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',

  // GRAVY (7 items)
  'tt-grv-1': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',
  'tt-grv-2': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',
  'tt-grv-3': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',
  'tt-grv-4': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',
  'tt-grv-5': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',
  'tt-grv-6': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',
  'tt-grv-7': '/assets/Top%20Town/Fried%20Rice%20Sizling/Asset%2085@4x.png',

  // CHOWMEIN (2 items)
  'tt-chw-1': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2080@4x.png',
  'tt-chw-2': '/assets/fusion%20Cafe/Fusion%20Pasta%20Noodles/Asset%2082@4x.png',

  // COMBO PLATTERS (2 items)
  'tt-cmb-1': '/assets/Top%20Town/Set%20Menu/Asset%2077@4x.png',
  'tt-cmb-2': '/assets/Top%20Town/Set%20Menu/Asset%2078@4x.png',

  // COUPLE PLATTERS (2 items)
  'tt-cpl-1': '/assets/Top%20Town/Set%20Menu/Asset%2079@4x.png',
  'tt-cpl-2': '/assets/Top%20Town/Set%20Menu/Asset%2080@4x.png',

  // SNACKS (4 items)
  'tt-snk-1': '/assets/menu/toptown-chola-bhatora.jpg',
  'tt-snk-2': '/assets/menu/toptown-chola-bhatora.jpg',
  'tt-snk-3': '/assets/Barger%20Bar/Asset%2052@4x.png',
  'tt-snk-4': '/assets/menu/toptown-luchi.jpg',

  // DOSA (6 items)
  'tt-dos-1': '/assets/menu/toptown-dosa.jpg',
  'tt-dos-2': '/assets/menu/toptown-dosa.jpg',
  'tt-dos-3': '/assets/menu/toptown-dosa.jpg',
  'tt-dos-4': '/assets/menu/toptown-dosa.jpg',
  'tt-dos-5': '/assets/menu/toptown-dosa.jpg',
  'tt-dos-6': '/assets/menu/toptown-dosa.jpg',

  // BIRIYANI (2 items)
  'tt-bir-1': '/assets/menu/toptown-biryani.jpg',
  'tt-bir-2': '/assets/menu/toptown-biryani.jpg',

  // CHAATS (4 items)
  'tt-cht-1': '/assets/menu/momo-fuchka.jpg',
  'tt-cht-2': '/assets/menu/momo-doi-fuchka.jpg',
  'tt-cht-3': '/assets/menu/momo-fuchka-special.jpg',
  'tt-cht-4': '/assets/menu/momo-fuchka-special.jpg',

  // NAN RUTI (3 items)
  'tt-nan-1': '/assets/menu/live-naan.jpg',
  'tt-nan-2': '/assets/menu/live-naan.jpg',
  'tt-nan-3': '/assets/menu/live-naan.jpg',

  // DRINKS (3 items)
  'tt-drk-1': '/assets/menu/drinks-lassi.jpg',
  'tt-drk-2': '/assets/menu/drinks-lassi.jpg',
  'tt-drk-3': '/assets/menu/drinks-lemonade.jpg',

  // =========================================================================
  // 3. Burger Bar (39 items)
  // =========================================================================
  // BURGER (5 items)
  'bb-bgr-1': '/assets/Barger%20Bar/Asset%2056@4x.png',
  'bb-bgr-2': '/assets/Barger%20Bar/Asset%2056@4x.png',
  'bb-bgr-3': '/assets/Barger%20Bar/Asset%2056@4x.png',
  'bb-bgr-4': '/assets/Barger%20Bar/Asset%2056@4x.png',
  'bb-bgr-5': '/assets/Barger%20Bar/Asset%2056@4x.png',

  // SANDWICH (4 items)
  'bb-sdw-1': '/assets/Barger%20Bar/Asset%2050@4x.png',
  'bb-sdw-2': '/assets/Barger%20Bar/Asset%2050@4x.png',
  'bb-sdw-3': '/assets/Barger%20Bar/Asset%2050@4x.png',
  'bb-sdw-4': '/assets/Barger%20Bar/Asset%2055@4x.png',

  // MEAT BOX (3 items)
  'bb-mbx-1': '/assets/Barger%20Bar/Asset%2054@4x.png',
  'bb-mbx-2': '/assets/Barger%20Bar/Asset%2054@4x.png',
  'bb-mbx-3': '/assets/Barger%20Bar/Asset%2054@4x.png',

  // CRISPY CHICKEN (7 items)
  'bb-chk-1': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-chk-2': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-chk-3': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-chk-4': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-chk-5': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-chk-6': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-chk-7': '/assets/Barger%20Bar/Asset%2053@4x.png',

  // WRAP ROLL (4 items)
  'bb-wrp-1': '/assets/Barger%20Bar/Asset%2052@4x.png',
  'bb-wrp-2': '/assets/Barger%20Bar/Asset%2052@4x.png',
  'bb-wrp-3': '/assets/Barger%20Bar/Asset%2052@4x.png',
  'bb-wrp-4': '/assets/Barger%20Bar/Asset%2052@4x.png',

  // FRENCH FRIES (3 items)
  'bb-ff-1': '/assets/Barger%20Bar/Asset%2051@4x.png',
  'bb-ff-2': '/assets/Barger%20Bar/Asset%2051@4x.png',
  'bb-ff-3': '/assets/Barger%20Bar/Asset%2051@4x.png',

  // ADD ONS (7 items)
  'bb-ado-1': '/assets/Barger%20Bar/Asset%2056@4x.png',
  'bb-ado-2': '/assets/Barger%20Bar/Asset%2056@4x.png',
  'bb-ado-3': '/assets/Barger%20Bar/Asset%2056@4x.png',
  'bb-ado-4': '/assets/Barger%20Bar/Asset%2051@4x.png',
  'bb-ado-5': '/assets/Barger%20Bar/Asset%2049@4x.png',
  'bb-ado-6': '/assets/Barger%20Bar/Asset%2051@4x.png',
  'bb-ado-7': '/assets/Barger%20Bar/Asset%2051@4x.png',

  // COMBO (6 items)
  'bb-cmb-1': '/assets/Barger%20Bar/Asset%2049@4x.png',
  'bb-cmb-2': '/assets/Barger%20Bar/Asset%2049@4x.png',
  'bb-cmb-3': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-cmb-4': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-cmb-5': '/assets/Barger%20Bar/Asset%2053@4x.png',
  'bb-cmb-6': '/assets/Barger%20Bar/Asset%2049@4x.png',

  // =========================================================================
  // 4. Momo Buzz (22 items)
  // =========================================================================
  // MOMO (9 items)
  'mb-mom-1': '/assets/menu/momo-steamed-basket.jpg',
  'mb-mom-2': '/assets/menu/momo-plate.jpg',
  'mb-mom-3': '/assets/menu/momo-bowl.jpg',
  'mb-mom-4': '/assets/menu/momo-assorted.jpg',
  'mb-mom-5': '/assets/menu/momo-bowl.jpg',
  'mb-mom-6': '/assets/menu/momo-plate.jpg',
  'mb-mom-7': '/assets/menu/momo-assorted.jpg',
  'mb-mom-8': '/assets/menu/momo-bowl.jpg',
  'mb-mom-9': '/assets/menu/momo-plate.jpg',

  // MOMOCOLA (4 items)
  'mb-mcl-1': '/assets/menu/momo-cola.jpg',
  'mb-mcl-2': '/assets/menu/momo-cola.jpg',
  'mb-mcl-3': '/assets/menu/momo-cola.jpg',
  'mb-mcl-4': '/assets/menu/momo-cola.jpg',

  // COMBO & OTHERS (2 items)
  'mb-cmb-1': '/assets/menu/momo-assorted.jpg',
  'mb-oth-2': '/assets/menu/momo-chilli-oil.jpg',

  // FUCHKA BUZZ (7 items)
  'mb-fuc-1': '/assets/menu/momo-fuchka.jpg',
  'mb-fuc-2': '/assets/menu/momo-doi-fuchka.jpg',
  'mb-fuc-3': '/assets/menu/momo-fuchka.jpg',
  'mb-fuc-4': '/assets/menu/momo-fuchka.jpg',
  'mb-fuc-5': '/assets/menu/momo-chotpoti.jpg',
  'mb-fuc-6': '/assets/menu/momo-chotpoti.jpg',
  'mb-fuc-7': '/assets/menu/momo-fuchka-special.jpg',

  // =========================================================================
  // 5. Waffle City (19 items)
  // =========================================================================
  // WAFFLE (13 items)
  'wc-waf-1': '/assets/menu/waffle-nutella.jpg',
  'wc-waf-2': '/assets/menu/waffle-banana.jpg',
  'wc-waf-3': '/assets/menu/waffle-red-velvet.jpg',
  'wc-waf-4': '/assets/menu/waffle-chocolate-nuts.jpg',
  'wc-waf-5': '/assets/menu/waffle-cream-chocolate.jpg',
  'wc-waf-6': '/assets/menu/waffle-chocolate-loaded.jpg',
  'wc-waf-7': '/assets/menu/waffle-tutti-frutti.jpg',
  'wc-waf-8': '/assets/menu/waffle-strawberry.jpg',
  'wc-waf-9': '/assets/menu/waffle-blueberry.jpg',
  'wc-waf-10': '/assets/menu/waffle-icecream.jpg',
  'wc-waf-11': '/assets/menu/waffle-kitkat.jpg',
  'wc-waf-12': '/assets/menu/waffle-dark.jpg',
  'wc-waf-13': '/assets/menu/waffle-plain.jpg',

  // ADD ONS (6 items)
  'wc-ado-1': '/assets/menu/addon-ice-cream.jpg',
  'wc-ado-2': '/assets/menu/addon-whipped-cream.jpg',
  'wc-ado-3': '/assets/menu/addon-choc-chips.jpg',
  'wc-ado-4': '/assets/menu/addon-nuts.jpg',
  'wc-ado-5': '/assets/menu/addon-cream-cheese.jpg',
  'wc-ado-6': '/assets/menu/addon-nutella.jpg',

  // =========================================================================
  // 6. Live Station (24 items)
  // =========================================================================
  // BBQ & KABAB (18 items)
  'ls-bbq-1': '/assets/menu/live-tandoori-chicken.jpg',
  'ls-bbq-2': '/assets/menu/live-grilled-chicken.jpg',
  'ls-bbq-3': '/assets/menu/live-tandoori-chicken.jpg',
  'ls-bbq-4': '/assets/menu/live-chicken-chap.jpg',
  'ls-bbq-5': '/assets/menu/live-kebab-skewers.jpg',
  'ls-bbq-6': '/assets/menu/live-kebab-skewers.jpg',
  'ls-bbq-7': '/assets/menu/live-kebab-skewers.jpg',
  'ls-bbq-8': '/assets/menu/live-kebab-skewers.jpg',
  'ls-bbq-9': '/assets/menu/live-kebab-skewers.jpg',
  'ls-bbq-10': '/assets/menu/live-kebab-skewers.jpg',
  'ls-bbq-11': '/assets/menu/live-kebab-skewers.jpg',
  'ls-bbq-12': '/assets/menu/live-wings.jpg',
  'ls-bbq-13': '/assets/Top%20Town/Apatizer/Asset%2064@4x.png',
  'ls-bbq-14': '/assets/menu/live-grilled-chicken.jpg',
  'ls-bbq-15': '/assets/menu/live-kebab-skewers.jpg',
  'ls-bbq-16': '/assets/menu/live-ribs.jpg',
  'ls-bbq-17': '/assets/fusion%20Cafe/Seafood%20Platter%20and%20Premium/Asset%2027@4x.png',
  'ls-bbq-18': '/assets/menu/live-luchi.jpg',

  // PLATTERS (6 items)
  'ls-plt-1': '/assets/menu/live-mixed-grill.jpg',
  'ls-plt-2': '/assets/menu/live-mixed-grill.jpg',
  'ls-plt-3': '/assets/menu/live-mixed-grill.jpg',
  'ls-plt-4': '/assets/menu/live-mixed-grill.jpg',
  'ls-plt-5': '/assets/menu/live-steak-board.jpg',
  'ls-plt-6': '/assets/menu/live-steak-board.jpg',
};

// Check all image paths on filesystem
console.log('--- Verifying Filesystem Existence of Mapped Assets ---');
let missingFiles = 0;
const uniquePaths = [...new Set(Object.values(imageMapping))];
for (const p of uniquePaths) {
  // Decode URL components (e.g. %20 -> space)
  const decodedRel = decodeURIComponent(p.replace(/^\//, ''));
  const fullPath = path.join(publicDir, decodedRel.replace(/^assets\//, 'assets/'));
  if (!fs.existsSync(fullPath)) {
    console.error(`MISSING FILE: ${p} (resolved to: ${fullPath})`);
    missingFiles++;
  }
}

if (missingFiles > 0) {
  console.error(`Total missing files: ${missingFiles}`);
  process.exit(1);
} else {
  console.log(`All ${uniquePaths.length} unique asset paths exist on disk!`);
}

// Now update server/menuData.js
const menuDataPath = path.join(root, 'server', 'menuData.js');
let fileContent = fs.readFileSync(menuDataPath, 'utf8');

// Read existing menu items
import('../server/menuData.js').then((module) => {
  const { menuItemsData } = module;
  console.log(`Total menu items in menuData.js: ${menuItemsData.length}`);

  let mappedCount = 0;
  let unmappedCount = 0;

  for (const item of menuItemsData) {
    if (imageMapping[item.id]) {
      mappedCount++;
    } else {
      console.error(`UNMAPPED ITEM: ${item.id} - ${item.name} (${item.stallId})`);
      unmappedCount++;
    }
  }

  console.log(`Mapping summary: ${mappedCount} mapped, ${unmappedCount} unmapped out of ${menuItemsData.length} items.`);

  if (unmappedCount > 0) {
    process.exit(1);
  }

  // Rewrite image fields in fileContent
  // Each item has an id: "..." and an image: "..." (or missing image).
  // We'll update the menuItemsData array cleanly.
  const updatedItems = menuItemsData.map((item) => ({
    ...item,
    image: imageMapping[item.id],
  }));

  // Replace menuItemsData in fileContent
  // Find "export const menuItemsData = [" to "];"
  const startMarker = 'export const menuItemsData = [';
  const startIndex = fileContent.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error('Could not find start of menuItemsData in server/menuData.js');
  }

  // Find the closing bracket followed by semicolon for menuItemsData
  // We know export const stallsData comes before or after.
  // In server/menuData.js: stallsData is first, then menuItemsData, then tablesData, usersData.
  const afterStart = fileContent.slice(startIndex + startMarker.length);
  // Find closing bracket
  let depth = 1;
  let endIndex = -1;
  for (let i = 0; i < afterStart.length; i++) {
    if (afterStart[i] === '[') depth++;
    else if (afterStart[i] === ']') {
      depth--;
      if (depth === 0) {
        endIndex = startIndex + startMarker.length + i + 1;
        if (fileContent[endIndex] === ';') endIndex++;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error('Could not find end of menuItemsData array');
  }

  const jsonSerialized = JSON.stringify(updatedItems, null, 2);
  const newDeclaration = `export const menuItemsData = ${jsonSerialized};`;

  const newFileContent = fileContent.slice(0, startIndex) + newDeclaration + fileContent.slice(endIndex);

  fs.writeFileSync(menuDataPath, newFileContent, 'utf8');
  console.log('Successfully updated server/menuData.js with 100% matched images!');
});
