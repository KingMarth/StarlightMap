#!/bin/bash

FRONT_DIRECTORY='starlight-front'

GREEN='\033[1;32m'
RED='\033[1;31m'
NC='\033[0m'

echo -e "${GREEN}Begin building front${NC}"
if [ ! -d "$FRONT_DIRECTORY" ]; then
  echo "${RED}$FRONT_DIRECTORY directory is missing. You may want to run:${NC}"
  echo '  - git submodule init'
  echo '  - git submodule update'
  exit 1
fi
cd starlight-front
npm install &&
npm run build
cd ..
echo -e "${GREEN}Done building front${NC}"

echo -e "${GREEN}Building old front${NC}"
npm run pack
echo -e "${GREEN}Done building old front${NC}"
