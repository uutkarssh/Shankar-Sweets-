#!/bin/bash
# Generate food images sequentially (more reliable than parallel)
cd /home/z/my-project
gen() { echo "→ $2"; timeout 120 z-ai image -p "$1" -o "$2" -s 1024x1024 2>/dev/null && echo "  ✓ done" || echo "  ✗ FAILED $2"; }

gen "Top down photo of a freshly baked margherita pizza with melted mozzarella and herbs on a wooden board, professional food photography, warm lighting, high quality" "./public/images/categories/pizza.png"
gen "A gourmet veggie burger with fresh lettuce tomato and cheese on a sesame bun, professional food photography, warm lighting, high quality" "./public/images/categories/burger.png"
gen "A bowl of steaming hot masala maggie noodles with vegetables and herbs, professional food photography, warm lighting, high quality" "./public/images/categories/maggie.png"
gen "A traditional Indian clay kulhad cup of hot chai tea with steam rising, professional food photography, warm lighting, high quality" "./public/images/categories/hot-beverage.png"
gen "Indian chaat platter with samosa chutney yogurt sev and pomegranate on a brass plate, professional food photography, warm lighting, high quality" "./public/images/categories/chaat.png"
gen "Indo chinese hakka noodles with vegetables in a black bowl with chopsticks, professional food photography, warm lighting, high quality" "./public/images/categories/chinese.png"
gen "Assorted Indian sweets rasgulla gulab jamun barfi on a golden tray, professional food photography, warm lighting, high quality" "./public/images/categories/sweets.png"
gen "Assorted bakery pastries cookies and cake slices on a wooden board, professional food photography, warm lighting, high quality" "./public/images/categories/bakery.png"
gen "Colorful ice cream scoops in waffle cones vanilla chocolate strawberry pistachio, professional food photography, warm lighting, high quality" "./public/images/categories/ice-cream.png"
gen "Paneer tikka pizza with paneer cubes jalapeno and spices, professional food photography, warm lighting, high quality" "./public/images/items/paneer-pizza.png"
gen "Golden corn delight pizza with sweet corn and cheese, professional food photography, warm lighting, high quality" "./public/images/items/corn-pizza.png"
gen "Crispy veg spring rolls with dipping sauce on a plate, professional food photography, warm lighting, high quality" "./public/images/items/spring-roll.png"
gen "Steamed veg momos with spicy red chutney in a bamboo steamer, professional food photography, warm lighting, high quality" "./public/images/items/momos.png"
gen "A glass of creamy sweet lassi with a layer of cream on top garnished with pistachio, professional food photography, warm lighting, high quality" "./public/images/items/lassi.png"
echo "=== ALL DONE ==="
ls -la public/images/categories/ public/images/items/ public/images/brand/
