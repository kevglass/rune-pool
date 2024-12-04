perl -pe 's/multiplayer\.js/multiplayer-dev\.js/' ./dist/index.html > ./dist/temp.html
cp ./dist/temp.html ./dist/index.html
rm ./dist/temp.html

perl -pe 's/maxPlayers: [0-9]/maxPlayers: 1/' ./dist/logic.js > ./dist/temp.js
cp ./dist/temp.js ./dist/logic.js
rm ./dist/temp.js

perl -pe 's/<\/head>/<script src="hosting\.js"><\/script><\/head>/' ./dist/index.html > ./dist/temp.html
cp ./dist/temp.html ./dist/index.html
rm ./dist/temp.html

perl -pe 's/<\/body>/<div id="loading" style="position: absolute; width: 100%; height: 100%; background: black; z-index: 1000"><\/div><\/body>/' ./dist/index.html > ./dist/temp.html
cp ./dist/temp.html ./dist/index.html
rm ./dist/temp.html
  
perl -pe 's/https:\/\/cdn.jsdelivr.net\/npm\/rune-sdk.*\/multiplayer-dev.js/multiplayer-dev.js/' ./dist/index.html > ./dist/temp.html
cp ./dist/temp.html ./dist/index.html
rm ./dist/temp.html

cp standalone/hosting.js dist
cp node_modules/rune-sdk/multiplayer-dev.js dist

perl -pe 's/calc\(100vh/calc\(0vh/g' ./dist/multiplayer-dev.js > ./dist/temp.js
cp ./dist/temp.js ./dist/multiplayer-dev.js
rm ./dist/temp.js
