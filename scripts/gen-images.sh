#!/bin/bash
# Generate brand images for Shankar Sweets & Bakery
cd /home/z/my-project

echo "Generating logo..."
z-ai image -p "Luxurious gold 3D glossy wordmark logo reading SHANKAR in elegant serif typography, ornamental gold flourish arch above the word, small text SINCE 1962 beneath, subtitle SWEETS BAKERY ICE CREAM CHAT, cursive gold tagline Taste the Tradition, deep maroon burgundy background, premium heritage Indian sweet shop emblem, centered, high quality, detailed" -o "./public/images/brand/logo.png" -s 1024x1024 &

echo "Generating promo dish..."
z-ai image -p "Gulab jamun Indian sweet on an ornate gold plated dish, golden syrup glistening, dark maroon background fading to black on left, professional food photography, warm golden lighting, luxurious, high quality, detailed" -o "./public/images/brand/promo-gulabjamun.png" -s 1024x1024 &

echo "Generating category icons batch 1..."
z-ai image -p "Top down photo of a freshly baked margherita pizza with melted mozzarella and herbs on a wooden board, appetizing, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/pizza.png" -s 1024x1024 &
z-ai image -p "A gourmet veggie burger with fresh lettuce tomato and cheese on a sesame bun, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/burger.png" -s 1024x1024 &
z-ai image -p "A bowl of steaming hot masala maggie noodles with vegetables and herbs, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/maggie.png" -s 1024x1024 &
z-ai image -p "A traditional Indian clay kulhad cup of hot chai tea with steam rising, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/hot-beverage.png" -s 1024x1024 &

wait
echo "Batch 1 done"

z-ai image -p "Indian chaat platter with samosa chutney yogurt sev and pomegranate on a brass plate, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/chaat.png" -s 1024x1024 &
z-ai image -p "Indo chinese hakka noodles with vegetables in a black bowl with chopsticks, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/chinese.png" -s 1024x1024 &
z-ai image -p "Assorted Indian sweets rasgulla gulab jamun barfi on a golden tray, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/sweets.png" -s 1024x1024 &
z-ai image -p "Assorted bakery items pastries cookies and cake slices on a wooden board, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/bakery.png" -s 1024x1024 &
z-ai image -p "Colorful ice cream scoops in waffle cones vanilla chocolate strawberry pistachio, professional food photography, warm lighting, high quality, detailed" -o "./public/images/categories/ice-cream.png" -s 1024x1024 &

wait
echo "Batch 2 done"

echo "Generating hero product images..."
z-ai image -p "Paneer tikka pizza with paneer cubes jalapeno and spices on a wooden board, professional food photography, warm lighting, high quality, detailed" -o "./public/images/items/paneer-pizza.png" -s 1024x1024 &
z-ai image -p "Golden corn delight pizza with sweet corn and cheese, professional food photography, warm lighting, high quality, detailed" -o "./public/images/items/corn-pizza.png" -s 1024x1024 &
z-ai image -p "Crispy veg spring rolls with dipping sauce on a plate, professional food photography, warm lighting, high quality, detailed" -o "./public/images/items/spring-roll.png" -s 1024x1024 &
z-ai image -p "Steamed veg momos with spicy red chutney in a bamboo steamer, professional food photography, warm lighting, high quality, detailed" -o "./public/images/items/momos.png" -s 1024x1024 &
z-ai image -p "A glass of creamy sweet lassi with a layer of cream on top garnished with pistachio, professional food photography, warm lighting, high quality, detailed" -o "./public/images/items/lassi.png" -s 1024x1024 &

wait
echo "Batch 3 done"
echo "ALL IMAGES GENERATED"
ls -la public/images/brand/ public/images/categories/ public/images/items/
