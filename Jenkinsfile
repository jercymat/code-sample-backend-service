buildDeployService {
  email = "%owner_email%"
  platform  = "node"
  nodeVersion = "16"
  initialDelaySeconds = "20"
  healthUri = "%health_uri%"
  ingressType = "root-context"
  args = []
  envs = [
        '{"env": {"name": "NODE_ENV", "value": "%env%"}}',
        '{"secretEnv":{"name": "SNOWFLAKE_PASSWORD", "secretKey": "SNOWFLAKE_PASSWORD", "secretName": "%secret_name%"}}',
        '{"secretEnv":{"name": "MSSQL_PASSWORD", "secretKey": "MSSQL_PASSWORD", "secretName": "%secret_name%"}}',
        '{"secretEnv":{"name": "JWT_SECRET", "secretKey": "JWT_SECRET", "secretName": "%secret_name%"}}',
    ]
  contextPath = "/"
  context= "internal"
  deployLocations = "%deploy_locations%"
  namespace = "%namespace%"
  snyk = ["org": "%snyk-org%", "environment": "backend", "devBranch": "dev"]
  cors = [
    'enabled': 'true',
    'allowOrigin': '*',
    'allowCredentials': 'true'
  ]
  buildCommands = [
    "CI=true npm install",
    "CI=true npm run build"
  ]
}
