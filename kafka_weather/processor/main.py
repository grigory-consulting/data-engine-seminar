import logging
from quixstreams import Application


def main():
    logging.info("START")
    app = Application(
        broker_address = "localhost:9092",
        loglevel = "DEBUG",
        consumer_group="weather_processor",
        auto_offset_reset="earliest",
    )

    input_topic = app.topic("weather_data")
    output_topic = app.topic("weather_conversion")

    def conversion(msg):
        celsius = msg["current"]["temperature_2m"] 
        
        fahrenheit = (celsius*9 /5) + 32
        kelvin = celsius + 273.15
        new_msg = {
            "celsius": celsius,
            "fahrenheit": round(fahrenheit,2),
            "kelvin": round(kelvin,2),
        }

        return new_msg
    
    sdf = app.dataframe(input_topic) # Streaming DataFrame
    sdf = sdf.apply(conversion)
    sdf = sdf.to_topic(output_topic)

    app.run(sdf)

if __name__ == "__main__":
    logging.basicConfig(level="DEBUG")
    main()