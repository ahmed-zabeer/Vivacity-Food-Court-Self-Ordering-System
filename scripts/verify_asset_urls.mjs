const urls = [
  'http://localhost:3000/assets/Drinks/Cocacola.jpg',
  'http://localhost:3000/assets/Drinks/Sprite.jpg',
  'http://localhost:3000/assets/Drinks/Fanta.jpg',
  'http://localhost:3000/assets/Drinks/Kinley.jpg',
  'http://localhost:3000/assets/Drinks/drinks-banner.jpg',
  'http://localhost:3000/assets/Stall%20logo/Burger%20Bar.png',
  'http://localhost:3000/assets/Stall%20logo/Fusion%20Cafe.png',
  'http://localhost:3000/assets/Stall%20logo/Top%20Town.png',
  'http://localhost:3000/assets/Stall%20logo/Waffle%20City.png',
  'http://localhost:3000/assets/vivacity-logo1.png'
];

for (const u of urls) {
  try {
    const res = await fetch(u);
    console.log(`${res.status} ${res.headers.get('content-type')} | ${u}`);
  } catch (err) {
    console.error(`FAILED ${u}:`, err.message);
  }
}
