def get_dates(**context) -> tuple[str, str]:
    """"""
    start_date = context["data_interval_start"].format("YYYY-MM-DD")
    end_date = context["data_interval_end"].format("YYYY-MM-DD")

    return start_date, end_date


def get_secret_with_default(variable_name: str, default_value: str) -> str:
    """Read secret from Airflow Variable and fallback to local docker-compose defaults."""

    return Variable.get(variable_name, default_var=default_value)


def get_and_transfer_raw_data_to_ods_pg(**context):
    """"""

    start_date, end_date = get_dates(**context)
    access_key = get_secret_with_default("access_key", "minioadmin")
    secret_key = get_secret_with_default("secret_key", "minioadmin")
    password = get_secret_with_default("pg_password", "postgres")

    logging.info(f"Start load for dates: {start_date}/{end_date}")
    con = duckdb.connect()

    con.sql(
        f"""
        SET TIMEZONE='Europe/Berlin';
        INSTALL httpfs;
        LOAD httpfs;
        SET s3_url_style = 'path';
        SET s3_endpoint = 'minio:9000';
        SET s3_access_key_id = '{access_key}';
        SET s3_secret_access_key = '{secret_key}';
        SET s3_use_ssl = FALSE;

        CREATE SECRET dwh_postgres (
            TYPE postgres,
            HOST 'postgres_dwh',
            PORT 5432,
            DATABASE postgres,
            USER 'postgres',
            PASSWORD '{password}'
        );

        ATTACH '' AS dwh_postgres_db (TYPE postgres, SECRET dwh_postgres);
        CREATE SCHEMA IF NOT EXISTS dwh_postgres_db.{SCHEMA};

        CREATE TABLE IF NOT EXISTS dwh_postgres_db.{SCHEMA}.{TARGET_TABLE}
        (
            time varchar,
            latitude varchar,
            longitude varchar,
            depth varchar,
            mag varchar,
            mag_type varchar,
            nst varchar,
            gap varchar,
            dmin varchar,
            rms varchar,
            net varchar,
            id varchar,
            updated varchar,
            place varchar,
            type varchar,
            horizontal_error varchar,
            depth_error varchar,
            mag_error varchar,
            mag_nst varchar,
            status varchar,
            location_source varchar,
            mag_source varchar
        );

        INSERT INTO dwh_postgres_db.{SCHEMA}.{TARGET_TABLE}
        (
            time,
            latitude,
            longitude,
            depth,
            mag,
            mag_type,
            nst,
            gap,
            dmin,
            rms,
            net,
            id,
            updated,
            place,
            type,
            horizontal_error,
            depth_error,
            mag_error,
            mag_nst,
            status,
            location_source,
            mag_source
        )
        SELECT
            time,
            latitude,
            longitude,
            depth,
            mag,
            magType AS mag_type,
            nst,
            gap,
            dmin,
            rms,
            net,
            id,
            updated,
            place,
            type,
            horizontalError AS horizontal_error,
            depthError AS depth_error,
            magError AS mag_error,
            magNst AS mag_nst,
            status,
            locationSource AS location_source,
            magSource AS mag_source
        FROM 's3://prod/{LAYER}/{SOURCE}/{start_date}/{start_date}_00-00-00.gz.parquet';
        """,
    )

    con.close()
    logging.info(f"Download for date success: {start_date}")


with DAG(
    dag_id=DAG_ID,
    schedule_interval="0 5 * * *",
    start_date=pendulum.datetime(2026, 2, 14, tz="Europe/Berlin"),
    catchup=False,
    default_args=args,
    tags=["s3", "ods", "pg"],
    description=SHORT_DESCRIPTION,
    concurrency=1,
    max_active_tasks=1,
    max_active_runs=1,
) as dag:
    dag.doc_md = LONG_DESCRIPTION