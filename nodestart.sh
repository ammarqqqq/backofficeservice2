#!/bin/sh

echo "Node env set to " $NODE_ENV
if [ $NODE_ENV = "production" ]; then
  echo "starting node"
  node /src/start.js
else
  echo "starting nodemon with debugger"
  nodemon --inspect=0.0.0.0:9923-L --watch "/src" /src/start.js
fi
