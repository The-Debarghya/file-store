# file-store
- Just another file upload/download app with proper authentication and vulnerability mitigation.
- Key features: File upload vulnerability mitigated by all means, used safe auth mechanism using passport and prevented strange file uploads by restricting only to text,pdf and images.
- Though docker-compose is present it couldn't be used inside railway, so...apologies!

## How to use?
- Using local deployment:(Using node and npm)
  - Create a `.env` file with 2 variables as **DB_STRING and SECRET**, then start the application:
```bash
npm i
npm start
```
- Using docker:
```bash
docker compose up
```

