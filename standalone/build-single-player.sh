perl -pe 's/multiplayer\.js/multiplayer-dev\.js/' ./dist/index.html > ./dist/temp.html
cp ./dist/temp.html ./dist/index.html
rm ./dist/temp.html

perl -pe 's/maxPlayers: [0-9]/maxPlayers: 1/' ./dist/logic.js > ./dist/temp.js
cp ./dist/temp.js ./dist/logic.js
rm ./dist/temp.js

perl -pe 's/<\/head>/<script src="hosting\.js"><\/script><\/head>/' ./dist/index.html > ./dist/temp.html
cp ./dist/temp.html ./dist/index.html
rm ./dist/temp.html

cp standalone/hosting.js dist