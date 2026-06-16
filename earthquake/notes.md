docker compose exec -T airflow-scheduler airflow dags backfill raw_from_api_to_s3 -s 2026-06-09 -e 2026-06-15 
