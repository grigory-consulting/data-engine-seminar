from quixstreams import Application
import json


def main():
    app = Application(
        broker_address="localhost:9092",
        loglevel="DEBUG",
        consumer_group="weather_reader",
        auto_offset_reset="latest",
    )

    
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
