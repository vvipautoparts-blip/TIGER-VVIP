FROM public.ecr.aws/lambda/nodejs:24@sha256:f3c848893566f5efb8bf8c48798f0687a7196cf1808846cafbb4974706be3cdc

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts=false \
    && npm cache clean --force

COPY src ./src

CMD ["src/handler.handler"]
