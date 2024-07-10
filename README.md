# Code Sample - Backend Service

This project is a backend service designed to provide robust APIs for applications. It leverages technologies such as Node.js, Express, and various security technologies like LDAPS and JWT to ensure a secure and reliable service. The service is also integrated with databases like Microsoft SQL Server and Snowflake to provide smooth and efficient data flow.

## Getting Started

### Prerequisites

- Typescript
- Node.js
- NPM
- Microsoft SQL Server
- Snowflake
- LDAPS Server

### Local Secrets Management

To use secrets in your local environment please create a .env.local file in the config/env folder. You can add all secrets to that file since this is in .gitignore and won't be committed. For production and hosted environments please use Rancher secrets.

### Running the Service

To start the service locally:

```
npm install
npm run dev
```

### Testing

This project uses Jest for testing. Run tests with:

```
npm run test
```

## Documentation

- API documentation is automatically generated with Swagger using annotations. Access it at `http://localhost:8080/swagger` when the server is running. For more details, see http://mherman.org/blog/2016/05/26/swagger-and-nodejs.
- Further documentation is available here.

## Build

This service is built by Typescript, kindly compile and build the whole project before running the service in production environment:

```
npm run build
npm start
```

## Deployment

This service is equiped with Dockerfile and Jenkinsfile, kindly modify these two file based on your configuration and deploy to your Kubernetes cluster.
