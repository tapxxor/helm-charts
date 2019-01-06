### STAGE 1: Build angular app ###

FROM node:8.4.0-alpine

ENV NPM_VERSION=4.6.1

# mkdir plugin folder
RUN mkdir /app

# move plugin contents to /app
COPY . /app/

WORKDIR /app

## install curl
RUN apk add --no-cache curl bash openssl
	
## install helm
RUN curl https://raw.githubusercontent.com/helm/helm/master/scripts/get > get_helm.sh 
RUN chmod 700 get_helm.sh 
RUN ./get_helm.sh

## Storing node modules on a separate layer will prevent 
## unnecessary npm installs at each build. Install npm
## force a cache clean to keep image size small, create 
## node_modules, 
RUN npm install -g npm@${NPM_VERSION} && \
    npm cache clean --force && \ 
    npm update 

# Install the utility
RUN npm i -g helm-charts

WORKDIR /input
