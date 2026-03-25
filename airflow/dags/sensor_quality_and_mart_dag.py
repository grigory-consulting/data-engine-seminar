from __future__ import annotations

from datetime import datetime
import os

from airflow import DAG
from airflow.operators.python import PythonOperator
import psycopg2


def _get_conn():
    return psycopg2.connect(
        host=os.getenv("PG_HOST", "postgres"),
        port=int(os.getenv("PG_PORT", "5432")),
        dbname=os.getenv("PG_DB", "warehouse"),
        user=os.getenv("PG_USER", "postgres"),
        password=os.getenv("PG_PASSWORD", "postgres"),
    )


def run_quality_checks() -> None:
    conn = _get_conn()
    with conn, conn.cursor() as cur:
        cur.execute(
            """
            CREATE SCHEMA IF NOT EXISTS analytics;

            CREATE TABLE IF NOT EXISTS analytics.sensor_quality_audit (
                check_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                check_name TEXT NOT NULL,
                metric_value BIGINT NOT NULL,
                status TEXT NOT NULL
            );

            INSERT INTO analytics.sensor_quality_audit (check_name, metric_value, status)
            SELECT
                'duplicate_reading_ids',
                COUNT(*)::BIGINT,
                CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END
            FROM (
                SELECT reading_id
                FROM analytics.sensor_readings_fact
                GROUP BY reading_id
                HAVING COUNT(*) > 1
            ) dup;

            INSERT INTO analytics.sensor_quality_audit (check_name, metric_value, status)
            SELECT
                'invalid_temperature_range',
                COUNT(*)::BIGINT,
                CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END
            FROM analytics.sensor_readings_fact
            WHERE temperature_c < -40 OR temperature_c > 85;

            INSERT INTO analytics.sensor_quality_audit (check_name, metric_value, status)
            SELECT
                'null_key_fields',
                COUNT(*)::BIGINT,
                CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END
            FROM analytics.sensor_readings_fact
            WHERE reading_id IS NULL OR sensor_id IS NULL OR recorded_at IS NULL;
            """
        )


def build_site_daily_stats() -> None:
    conn = _get_conn()
    with conn, conn.cursor() as cur:
        cur.execute(
            """
            CREATE SCHEMA IF NOT EXISTS analytics;

            CREATE TABLE IF NOT EXISTS analytics.site_daily_sensor_stats (
                reading_date DATE NOT NULL,
                site TEXT NOT NULL,
                readings_count BIGINT NOT NULL,
                avg_temperature_c NUMERIC(8, 2) NOT NULL,
                avg_humidity_pct NUMERIC(8, 2) NOT NULL,
                alerts_count BIGINT NOT NULL,
                PRIMARY KEY (reading_date, site)
            );

            INSERT INTO analytics.site_daily_sensor_stats (
                reading_date,
                site,
                readings_count,
                avg_temperature_c,
                avg_humidity_pct,
                alerts_count
            )
            SELECT
                DATE(recorded_at) AS reading_date,
                site,
                COUNT(*) AS readings_count,
                AVG(temperature_c) AS avg_temperature_c,
                AVG(humidity_pct) AS avg_humidity_pct,
                SUM(CASE WHEN status <> 'ok' THEN 1 ELSE 0 END) AS alerts_count
            FROM analytics.sensor_readings_fact
            GROUP BY DATE(recorded_at), site
            ON CONFLICT (reading_date, site) DO UPDATE SET
                readings_count = EXCLUDED.readings_count,
                avg_temperature_c = EXCLUDED.avg_temperature_c,
                avg_humidity_pct = EXCLUDED.avg_humidity_pct,
                alerts_count = EXCLUDED.alerts_count;
            """
        )


with DAG(
    dag_id="sensor_quality_and_mart",
    description="Downstream DAG: quality checks and site mart build for sensor data",
    start_date=datetime(2024, 1, 1),
    schedule=None,
    catchup=False,
    tags=["starter", "quality", "mart", "sensors"],
) as dag:
    quality_checks = PythonOperator(
        task_id="run_quality_checks",
        python_callable=run_quality_checks,
    )

    build_mart = PythonOperator(
        task_id="build_site_daily_stats",
        python_callable=build_site_daily_stats,
    )

    quality_checks >> build_mart
