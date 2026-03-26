import os

import mlflow
import mlflow.spark
from pyspark.ml import Pipeline
from pyspark.ml.classification import LogisticRegression
from pyspark.ml.evaluation import MulticlassClassificationEvaluator
from pyspark.ml.feature import VectorAssembler
from pyspark.sql import SparkSession


TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5001")
EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "spark-mllib-demo")


def build_spark_session():
    return (
        SparkSession.builder.appName("spark-mllib-mlflow-demo")
        .master("local[*]")
        .config("spark.sql.shuffle.partitions", "2")
        .getOrCreate()
    )


def build_training_dataframes(spark):
    train_rows = [
        (0.10, 1.10, 0.0),
        (0.20, 1.30, 0.0),
        (0.30, 1.70, 0.0),
        (0.35, 1.90, 0.0),
        (0.40, 2.20, 0.0),
        (0.55, 2.80, 0.0),
        (0.70, 3.10, 1.0),
        (0.80, 3.30, 1.0),
    ]
    test_rows = [
        (0.90, 3.60, 1.0),
        (1.10, 4.00, 1.0),
        (0.25, 1.50, 0.0),
        (1.20, 4.30, 1.0),
    ]
    columns = ["feature_1", "feature_2", "label"]
    return spark.createDataFrame(train_rows, columns), spark.createDataFrame(test_rows, columns)


def main():
    mlflow.set_tracking_uri(TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_NAME)

    spark = build_spark_session()
    spark.sparkContext.setLogLevel("WARN")

    train_df, test_df = build_training_dataframes(spark)

    assembler = VectorAssembler(inputCols=["feature_1", "feature_2"], outputCol="features")
    classifier = LogisticRegression(
        featuresCol="features",
        labelCol="label",
        predictionCol="prediction",
        maxIter=20,
        regParam=0.05,
        elasticNetParam=0.0,
    )
    pipeline = Pipeline(stages=[assembler, classifier])
    evaluator = MulticlassClassificationEvaluator(
        labelCol="label",
        predictionCol="prediction",
        metricName="accuracy",
    )

    with mlflow.start_run(run_name="spark-mllib-logistic-regression"):
        model = pipeline.fit(train_df)
        predictions = model.transform(test_df)
        accuracy = evaluator.evaluate(predictions)

        logistic_model = model.stages[-1]

        mlflow.log_params(
            {
                "algorithm": "spark_ml_logistic_regression",
                "train_rows": train_df.count(),
                "test_rows": test_df.count(),
                "max_iter": classifier.getMaxIter(),
                "reg_param": classifier.getRegParam(),
                "elastic_net_param": classifier.getElasticNetParam(),
            }
        )
        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_metric("num_features", float(len(logistic_model.coefficients)))
        mlflow.spark.log_model(model, artifact_path="model")

        print(f"MLflow tracking URI: {TRACKING_URI}", flush=True)
        print(f"Experiment: {EXPERIMENT_NAME}", flush=True)
        print(f"Run ID: {mlflow.active_run().info.run_id}", flush=True)
        print(f"Accuracy: {accuracy:.4f}", flush=True)
        print("Predictions:", flush=True)
        predictions.select("feature_1", "feature_2", "label", "prediction", "probability").show(truncate=False)

    spark.stop()


if __name__ == "__main__":
    main()
