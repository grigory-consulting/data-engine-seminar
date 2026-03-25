from __future__ import annotations

# Standard-Library: Zeitstempel fuer DAG-Start, Umgebungsvariablen, Typ-Hinweise.
from datetime import datetime
import os
from typing import Any

# Airflow-Bausteine: DAG-Definition und Python-basierte Tasks.
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator

# Datenverarbeitung und Datenbankzugriff.
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values


REQUIRED_COLUMNS = [
    "reading_id",  # Eindeutige ID je Messung.
    "sensor_id",  # Sensor-Identifikator.
    "site",  # Standort/Anlage.
    "temperature_c",  # Temperatur in Grad Celsius.
    "humidity_pct",  # Luftfeuchte in Prozent.
    "status",  # Betriebsstatus (ok/alert/...).
    "recorded_at",  # Messzeitpunkt.
]


# 1. extract_csv -> list[dict] (JSON-like) 
# 2. transform_with_pandas -> list[dict]
# 3. load_sensor_readings -> None (hier wird ins DB geschrieben) 
# 4. load_daily_sensor_stats -> None (für DM) 

def extract_csv() -> list[dict[str, Any]]:
    # CSV-Pfad aus ENV lesen, sonst Standardpfad im Airflow-Container nutzen.
    csv_path = os.getenv("CSV_PATH", "/opt/airflow/data/sensor_readings.csv")
    # Früher Fehler, falls die Datei fehlt.
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")
    # CSV laden.
    df = pd.read_csv(csv_path)
    # Pflichtspalten gegen erwartetes Schema pruefen.
    missing = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    # Bei fehlenden Spalten Pipeline sauber abbrechen.
    if missing:
        raise ValueError(f"Missing required CSV columns: {missing}")
    
    return df.to_dict(orient="records") # für XCom 

def transform_with_pandas(ti) -> list[dict[str, Any]]:
    # Rohdaten aus dem Extract-Task (weil Daten nicht so groß)
    records = ti.xcom_pull(task_ids="extract_csv") or []
    
    df = pd.DataFrame(records)  

    if df.empty:
        return {"sensor_readings":[],
                "daily_sensor_stats": [],
                 "stats": {"input_rows": 0, "valid_rows": 0},       
                }  
    
    input_rows = len(df)

    # Fehlende Pflichtspalten 
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            df[col] = None

    # Normalisierung von Textfeldern 
    df["reading_id"] = df["reading_id"].astype("string").str.strip()
    df["sensor_id"] = df["sensor_id"].astype("string").str.strip()
    df["site"] = df["site"].astype("string").str.strip()
    df["status"] = df["status"].fillna("ok").astype("string").str.strip().str.lower()

    # "10", "20", "abc", "30"
    df["temperature_c"] = pd.to_numeric(df["temperature_c"], errors="coerce")
    df["humidity_pct"] = pd.to_numeric(df["humidity_pct"], errors="coerce")
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], errors="coerce", utc=True)

    # Bereinigung
    df = df.drop_duplicates(subset=["reading_id"] , keep="last")
    # 
    df = df.dropna(
        subset=["reading_id", "sensor_id", "site", "temperature_c", "humidity_pct", "recorded_at"]
    )
    
    df = df[df["reading_id"] != ""]
    df = df[df["sensor_id"] != ""]
    

    if df.empty:
        return {"sensor_readings":[],
                "daily_sensor_stats": [],
                 "stats": {"input_rows": input_rows, "valid_rows": 0},       
                }  
    
    df["reading_date"] = df["recorded_at"].dt.date
    daily = (
        df.groupby("reading_date", as_index=False)
        .agg(
            readings_count=("reading_id", "count"),  # Anzahl Messungen pro Tag.
            avg_temperature_c=("temperature_c", "mean"),  # Durchschnittstemperatur.
            avg_humidity_pct=("humidity_pct", "mean"),  # Durchschnittsfeuchte.
            alerts_count=("status", lambda x: int((x != "ok").sum())),  # Status != ok zaehlen.
        )
        .sort_values("reading_date")  # Chronologisch sortieren.
    )

    daily["avg_temperature_c"] = daily["avg_temperature_c"].round(2)
    daily["avg_humidity_pct"] = daily["avg_humidity_pct"].round(2) 

    readings_payload = df.assign(
        recorded_at=df["recorded_at"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    )[
        [
            "reading_id",
            "sensor_id",
            "site",
            "temperature_c",
            "humidity_pct",
            "status",
            "recorded_at",
        ]
    ].to_dict(orient="records")

    daily_payload = daily.assign(
        reading_date=daily["reading_date"].astype("string")
    ).to_dict(orient="records")

    return {
        "sensor_readings": readings_payload,
        "daily_sensor_stats": daily_payload,
        "stats": {"input_rows": input_rows, "valid_rows": len(df)},
    }

def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return None



def _get_conn():
    return psycopg2.connect(
        host=os.getenv("PG_HOST", "postgres"),
        port=int(os.getenv("PG_PORT", "5432")),
        dbname=os.getenv("PG_DB", "warehouse"),
        user=os.getenv("PG_USER", "postgres"),
        password=os.getenv("PG_PASSWORD", "postgres"),
    )

def load_sensor_readings(ti) -> None:
    # Transform-Ergebnis lesen.
    payload = ti.xcom_pull(task_ids="transform_with_pandas") or {}
    # Detaildatensaetze aus Payload extrahieren.
    readings = payload.get("sensor_readings", [])

    # DB-Verbindung aufbauen.
    conn = _get_conn()

    # Transaktion + Cursor als Context Manager: commit/rollback sauber gehandhabt.
    with conn, conn.cursor() as cur:
        # Schema und Faktentabelle sicherstellen.
        cur.execute(
            """
            CREATE SCHEMA IF NOT EXISTS analytics;

            CREATE TABLE IF NOT EXISTS analytics.sensor_readings_fact (
                reading_id TEXT PRIMARY KEY,
                sensor_id TEXT NOT NULL,
                site TEXT NOT NULL,
                temperature_c NUMERIC(6, 2) NOT NULL,
                humidity_pct NUMERIC(6, 2) NOT NULL,
                status TEXT NOT NULL, 
                recorded_at TIMESTAMPTZ NOT NULL
            );
            """
        )

        # Wertezeilen fuer Bulk-Upsert vorbereiten.
        rows: list[tuple[Any, ...]] = []
        # Jede Messung in das SQL-Tuple-Format bringen.
        for reading in readings:
            rows.append(
                (
                    reading.get("reading_id"),  # PK.
                    reading.get("sensor_id"),  # Sensor.
                    reading.get("site"),  # Standort.
                    float(reading.get("temperature_c", 0)),  # Temperatur.
                    float(reading.get("humidity_pct", 0)),  # Feuchte.
                    #(
                    #    float(reading.get("battery_v"))  # Batteriespannung, falls gueltig.
                    #    if reading.get("battery_v") is not None
                    #    and pd.notna(reading.get("battery_v"))
                    #    else None  # Sonst SQL-NULL.
                    #),
                    reading.get("status", "ok"),  # Status mit Default.
                    _parse_dt(reading.get("recorded_at")),  # UTC-Zeitstempel.
                )
            )

        # Nur schreiben, wenn Daten vorhanden sind.
        if rows:
            execute_values(
                cur,
                """
                INSERT INTO analytics.sensor_readings_fact
                    (reading_id, sensor_id, site, temperature_c, humidity_pct, status, recorded_at)
                VALUES %s
                ON CONFLICT (reading_id) DO UPDATE SET
                    sensor_id = EXCLUDED.sensor_id,
                    site = EXCLUDED.site,
                    temperature_c = EXCLUDED.temperature_c,
                    humidity_pct = EXCLUDED.humidity_pct,
                    status = EXCLUDED.status,
                    recorded_at = EXCLUDED.recorded_at
                """,
                rows,
            )


def load_daily_sensor_stats(ti) -> None:
    # Transform-Ergebnis lesen.
    payload = ti.xcom_pull(task_ids="transform_with_pandas") or {}
    # Tagesaggregation aus Payload extrahieren.
    daily_stats = payload.get("daily_sensor_stats", [])

    # DB-Verbindung aufbauen.
    conn = _get_conn()

    # Transaktion + Cursor.
    with conn, conn.cursor() as cur:
        # Schema und Aggregationstabelle sicherstellen.
        cur.execute(
            """
            CREATE SCHEMA IF NOT EXISTS analytics;

            CREATE TABLE IF NOT EXISTS analytics.daily_sensor_stats (
                reading_date DATE PRIMARY KEY,
                readings_count BIGINT NOT NULL,
                avg_temperature_c NUMERIC(8, 2) NOT NULL,
                avg_humidity_pct NUMERIC(8, 2) NOT NULL,
                alerts_count BIGINT NOT NULL
            );
            """
        )

        # Wertezeilen fuer Bulk-Upsert vorbereiten.
        rows: list[tuple[Any, ...]] = []
        # Jede Tageszeile in SQL-Format bringen.
        for row in daily_stats:
            rows.append(
                (
                    row.get("reading_date"),  # Datum (PK).
                    int(row.get("readings_count", 0)),  # Anzahl Messungen.
                    float(row.get("avg_temperature_c", 0)),  # Durchschnittstemp.
                    float(row.get("avg_humidity_pct", 0)),  # Durchschnittsfeuchte.
                    int(row.get("alerts_count", 0)),  # Anzahl Alerts.
                )
            )

        # Nur schreiben, wenn Daten vorhanden sind.
        if rows:
            execute_values(
                cur,
                """
                INSERT INTO analytics.daily_sensor_stats
                    (reading_date, readings_count, avg_temperature_c, avg_humidity_pct, alerts_count)
                VALUES %s
                ON CONFLICT (reading_date) DO UPDATE SET
                    readings_count = EXCLUDED.readings_count,
                    avg_temperature_c = EXCLUDED.avg_temperature_c,
                    avg_humidity_pct = EXCLUDED.avg_humidity_pct,
                    alerts_count = EXCLUDED.alerts_count
                """,
                rows,
            )




with DAG(
    dag_id = "csv_to_postgres_etl",
    description= "CSV sensor data + pandas -> Postgres",
    start_date=datetime(2025,1,1),
    schedule="@hourly",
    catchup=False, 
    tags =["csv", "pandas"], 
) as dag:
    # Task registrieren
    extract_task = PythonOperator(
        task_id="extract_csv",
        python_callable=extract_csv,
    )
    transform_task = PythonOperator(
        task_id="transform_with_pandas",
        python_callable=transform_with_pandas,
    )

    load_sensor_readings_task = PythonOperator(
        task_id="load_sensor_readings",
        python_callable=load_sensor_readings,
    )

    load_daily_sensor_stats_task = PythonOperator(
        task_id="load_daily_sensor_stats",
        python_callable=load_daily_sensor_stats,
    )

    trigger_downstream_dag = TriggerDagRunOperator(
        task_id="trigger_sensor_quality_and_mart",
        trigger_dag_id="sensor_quality_and_mart",
        wait_for_completion=False,
    )


    extract_task >> transform_task >> load_sensor_readings_task >> load_daily_sensor_stats_task >> trigger_downstream_dag

