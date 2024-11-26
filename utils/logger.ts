import winston from "winston";
import path from "path";

// Define config folder path
const configPath = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => {
        return new Date().toLocaleString("en-US", {
          timeZone: "America/Chicago",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      },
    }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(configPath, "error.log"), 
      level: "error" 
    }),
    new winston.transports.File({ 
      filename: path.join(configPath, "combined.log") 
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;
