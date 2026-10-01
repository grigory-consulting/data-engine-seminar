FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        default-jre-headless \
        tini \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

RUN pip install --no-cache-dir \
    jupyterlab==4.2.5 \
    pandas \
    pyarrow \
    pyspark==4.1.1 \
    faker

EXPOSE 8888

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root", "--ServerApp.token=", "--ServerApp.password="]
