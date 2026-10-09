FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir -r requirements/base.txt
COPY . .
# collectstatic needs a key but it is never stored in the image.
RUN SECRET_KEY=build-only DEBUG=false DATABASE_URL=sqlite:////tmp/x.db python manage.py collectstatic --noinput
RUN useradd -r -u 10001 app && chown -R app /app
USER app
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers ${WEB_CONCURRENCY:-3} --access-logfile -"]
