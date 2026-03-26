# MLflow + Spark MLlib Demo

Separater, kleiner Container-Stack fuer ein Spark-MLlib-Training mit MLflow Tracking.

## Inhalt

- `mlflow`: MLflow Tracking Server mit UI
- `spark-mllib-trainer`: startet ein kleines Spark-Training und loggt Run, Parameter, Metrik und Modell nach MLflow
- `jupyterlab`: startet das Notebook `train_model.ipynb` direkt im Browser

Die Demo verwendet eine einfache binäre Klassifikation mit Spark MLlib auf einem kleinen Beispiel-Datensatz.

## Dateien

```text
mlflow_spark_mllib_demo/
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── README.md
├── requirements.txt
├── train_model.ipynb
└── train_model.py
```

`train_model.py` ist die Container-Variante fuer `docker compose`.

`train_model.ipynb` ist die Schulungs-Variante fuer die schrittweise Erklaerung in Jupyter.

## Start

```bash
cd mlflow_spark_mllib_demo
docker compose up --build
```

Was passiert dann:

- der MLflow-Server startet auf `http://localhost:5001`
- der Training-Container baut eine Spark-Session auf
- ein logistisches Regressionsmodell wird trainiert
- Parameter, Accuracy und das Spark-Modell werden in MLflow geloggt
- Modellartefakte landen in einer gemeinsamen Docker-Volume `mlflow-data`, die sowohl vom MLflow-Server als auch vom Trainer genutzt wird
- JupyterLab ist auf `http://localhost:8889/lab/tree/train_model.ipynb` verfuegbar

Wenn du nur MLflow und JupyterLab fuer die interaktive Schulung starten willst:

```bash
docker compose up --build mlflow jupyterlab
```

Falls `8889` bei dir belegt ist, kannst du den Host-Port ueberschreiben:

```bash
JUPYTER_HOST_PORT=8895 docker compose up --build mlflow jupyterlab
```

## Beobachten

MLflow UI:

```text
http://localhost:5001
```

JupyterLab:

```text
http://localhost:8889/lab/tree/train_model.ipynb
```

Container-Status:

```bash
docker compose ps
```

Trainer-Logs:

```bash
docker compose logs spark-mllib-trainer
```

## Stoppen

```bash
docker compose down
```

Wenn du die MLflow-Daten auch entfernen willst:

```bash
docker compose down -v
```

## Schulungserklärung

Diese Demo zeigt die klassische ML-Schiene neben der Streaming-Demo:

- Spark uebernimmt Datenaufbereitung und Training
- Spark MLlib stellt den Algorithmus bereit
- MLflow trackt Run, Parameter, Metriken und Modellartefakte
- beide Container teilen sich die Artifact-Volume, damit `mlflow.spark.log_model(...)` das Modell direkt ablegen kann

Kurz gesagt:

- Spark trainiert
- MLflow dokumentiert
- die UI zeigt spaeter nachvollziehbar, was gelaufen ist

## Hinweise zu den Versionen

Die Demo verwendet:

- `pyspark==3.5.1`
- `mlflow==2.21.3`

Nach der offiziellen MLflow-Dokumentation ist `mlflow.pyspark.ml` fuer `pyspark` im Bereich `3.3.0` bis `4.1.1` kompatibel, und die verwendete Spark-Version liegt damit im unterstuetzten Bereich.
