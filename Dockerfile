#   docker build -t wakeset .
#   docker run -p 3200:3200 -v wakeset-data:/data --env-file .env.local wakeset
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN SKIP_TYPECHECK=1 npm run build
ENV NODE_ENV=production WAKESET_DATA_DIR=/data
# The database lives here. Mount a persistent disk at /data or it is lost on redeploy.
VOLUME /data
EXPOSE 3200
CMD ["sh", "-c", "npx next start -p ${PORT:-3200}"]
