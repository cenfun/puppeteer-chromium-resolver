FROM node:18.15

RUN apt-get update
RUN apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils


WORKDIR /workspace/my-project/

#ENV PUPPETEER_SKIP_DOWNLOAD=true

#COPY package.json .
#COPY lib ./lib/
#COPY test ./test/
#RUN ls -l
#RUN npm install --dd


RUN npm init -y
RUN npm install puppeteer-chromium-resolver --dd