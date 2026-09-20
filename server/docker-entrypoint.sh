#!/bin/sh
# 启动前等待数据库可达并推送 schema（云托管 MySQL 冷启动可能晚于容器）。
# 策略：最多重试 6 次，每次 timeout 90s，间隔 10s；结果写入 /tmp/dbpush.status。
# 数据库不可达时不挂死容器：重试耗尽后仍启动服务，由健康检查/人工介入处理。

status_file=/tmp/dbpush.status
echo "running" > "$status_file"

max_attempts=6
attempt=1
while [ "$attempt" -le "$max_attempts" ]; do
  echo "[entrypoint] prisma db push attempt ${attempt}/${max_attempts} ..."
  if timeout 90 npx prisma db push --skip-generate --accept-data-loss; then
    echo "ok" > "$status_file"
    echo "[entrypoint] db push succeeded"
    break
  fi
  echo "fail" > "$status_file"
  echo "[entrypoint] db push failed (attempt ${attempt}/${max_attempts})"
  attempt=$((attempt + 1))
  if [ "$attempt" -le "$max_attempts" ]; then
    sleep 10
  fi
done

if [ "$(cat "$status_file")" != "ok" ]; then
  echo "[entrypoint] WARNING: db push failed after ${max_attempts} attempts, starting server anyway"
fi

exec "$@"
