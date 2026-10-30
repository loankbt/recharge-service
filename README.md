# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Daily exchange-rate service

The Express server fetches the KRW to VND exchange rate when it starts and every day at 7:00 a.m. Vietnam time. Keep the server running for the daily schedule to execute. The React app reads the latest cached rate from the server and checks for updates every five minutes.

For local development, run these commands in separate terminals:

```sh
npm run server
npm start
```

The Express API runs on port 4000, and the React development server proxies `/api` requests to it. To use a different schedule timezone, set `SCHEDULE_TIMEZONE` to a valid IANA timezone before starting the server, for example `Asia/Seoul`.

To configure the private server-side API key, copy the example file and edit `.env`:

```powershell
Copy-Item .env.example .env
# Edit .env and replace the placeholder with a long random secret.
npm run server
```

The server loads `.env` on startup. It is ignored by Git; do not commit it or put the key in React code. You can also set `SCHEDULE_TIMEZONE` in `.env`.

Then send a `PUT` request to `/api/exchange-rate` with the key in the `x-api-key` header and a positive numeric `rate` in the JSON body:

```powershell
Invoke-RestMethod -Method Put -Uri "http://localhost:4000/api/exchange-rate" `
  -Headers @{ "x-api-key" = "your-secret-from-.env" } `
  -ContentType "application/json" `
  -Body '{"rate":19.5}'
```

The endpoint returns `401` if the key is missing or incorrect, `503` if the server key is not configured, and `400` for an invalid rate. Both protected endpoints share a limit of five requests per IP per minute; excess requests receive `429 Too Many Requests`. In production, configure the key through your hosting provider's environment settings rather than committing `.env`.

To reset the cached rate by fetching it from the upstream exchange-rate API, call the protected reset endpoint:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/exchange-rate/reset" `
  -Headers @{ "x-api-key" = "your-secret-from-.env" }
```

It returns the refreshed `rate` and `updatedAt`. If the upstream fetch fails, it returns `502` and retains the existing rate.

For production, build the Docker image and run the Express server from it. Express serves the built React app and API from the same port. Configure `EXCHANGE_RATE_URL` and `SCHEDULE_TIMEZONE` in the hosting provider's environment settings; the server validates both at startup. Upstream exchange-rate requests time out after 10 seconds.

Run one always-on container instance: the current exchange rate is stored in memory, and each instance runs its own daily schedule. `compose.yaml` uses a fixed container name to prevent scaling that service with Docker Compose and restarts the same container after a failure or host restart. A restart clears the in-memory rate until the initial upstream fetch succeeds. Configure the host's liveness check to use `/health/live` and its readiness check to use `/health/ready`; readiness returns `503` until an exchange rate is available. If you later need multiple instances or restart-persistent rates, move the rate to shared persistent storage and run the schedule through a single external scheduler.

To run locally with Docker, copy `.env.example` to `.env`, fill in the real API URL and a strong secret, then run:

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f recharge-service
```

The app is available at `http://localhost:4000`. Stop it with `docker compose down`. Do not commit `.env`; `.dockerignore` excludes it from the image build context. In production, set secrets through the platform's environment/secret settings instead of baking them into the image.

On your hosting platform, deploy with the Dockerfile, provide `EXCHANGE_RATE_API_KEY` and `EXCHANGE_RATE_URL` as secret environment values, configure `/health/ready` as the readiness check, and set the instance count to one with autoscaling disabled.

To keep a running Render instance active, set `KEEP_ALIVE_URL` in the service environment to `https://recharge-service-2x30.onrender.com/health/live`. The server requests that endpoint every five minutes and logs failures. This in-process job cannot wake a service after Render has already stopped it, and platform sleep behavior may vary; use an always-on plan if the site must be reliably available without cold starts.
