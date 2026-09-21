FROM node:20-alpine

# 显式安装 openssl + 环境变量：Prisma schema engine 在 alpine 上检测 libssl 失败
# （"Prisma failed to detect the libssl/openssl version"），必须钉住。
RUN apk add --no-cache openssl
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# 云托管构建时传入以打破缓存（如 --build-arg CACHE_BUST=$(date +%s)）
ARG CACHE_BUST=1
RUN echo "cache bust: $CACHE_BUST"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# 先拷 schema 并生成 client，利用构建缓存
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

# 头像上传目录（云托管实际使用时应挂载持久卷或对象存储）
RUN mkdir -p uploads

EXPOSE 3000

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npx", "tsx", "src/index.ts"]
