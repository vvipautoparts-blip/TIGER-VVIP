FROM public.ecr.aws/lambda/nodejs:24

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY src ./src

CMD ["src/handler.handler"]
