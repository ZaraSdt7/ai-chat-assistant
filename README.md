# AI Chat Assistant API

A lightweight conversational AI backend built with NestJS, TypeScript, MySQL, TypeORM, and Google Gemini. The API creates conversations automatically, persists user and assistant messages, and sends the complete conversation history to Gemini so follow-up messages retain context.

## Features

- Conversational chat endpoint powered by Google Gemini
- Automatic conversation creation when no `conversationId` is supplied
- Persistent conversations and messages in MySQL
- Context-aware replies using the stored conversation history
- Request validation with `class-validator`
- Interactive OpenAPI documentation through Swagger
- Docker Compose configuration for local MySQL development
- Configurable Gemini model and database connection

## Technology Stack

- Node.js and TypeScript
- NestJS 11
- TypeORM with MySQL 8.4
- Google Gemini `generateContent` API
- Swagger / OpenAPI
- Jest and Supertest tooling

## Requirements

- Node.js 20 or newer
- npm
- Docker Desktop, if you want to run MySQL through Docker
- A Google Gemini API key

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start MySQL

```bash
docker compose up -d mysql
```

The default container exposes MySQL on `localhost:3306` and creates the `ai_chat` database.

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=ai_chat_user
DATABASE_PASSWORD=ai_chat_password
DATABASE_NAME=ai_chat

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Development convenience only; use migrations in production.
TYPEORM_SYNC=true
```

Never commit `.env` or expose `GEMINI_API_KEY` in client-side code.

### 4. Run the API

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The server listens on `http://localhost:3000` by default.

## API Documentation

Once the application is running, open:

```text
http://localhost:3000/api
```

Swagger provides an interactive description of the available endpoints.

## API Usage

### Create a new conversation

```http
POST /chat
Content-Type: application/json
```

```json
{
  "message": "What is NestJS?"
}
```

Example response:

```json
{
  "conversationId": "7c2d5f8a-4b9e-4f72-9c6d-0b7e0d4a1f12",
  "messageId": "1ab4fb2d-0a8d-4ab2-8c1c-81b3b529a2ef",
  "reply": "NestJS is a framework for building efficient, scalable Node.js server-side applications..."
}
```

### Continue an existing conversation

Send the `conversationId` returned by the previous request:

```json
{
  "message": "Can you show me a basic example?",
  "conversationId": "7c2d5f8a-4b9e-4f72-9c6d-0b7e0d4a1f12"
}
```

### Request validation

- `message` is required, must be a string, and may contain up to 4,000 characters.
- `conversationId` is optional but must be a valid UUID when provided.
- Unknown request properties are rejected.

## Error Responses

- `400 Bad Request`: Invalid payload or validation failure
- `404 Not Found`: The supplied conversation does not exist
- `500 Internal Server Error`: Missing Gemini API key or an unexpected server failure
- `503 Service Unavailable`: Gemini rejected the request, returned no usable reply, or could not be reached

## Project Structure

```text
src/
|-- ai/              # Gemini integration
|-- chat/            # Chat endpoint, service, DTOs, entities, and message roles
|-- database/        # TypeORM and MySQL configuration
|-- app.module.ts    # Root application module
`-- main.ts          # Application bootstrap and Swagger setup
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the application |
| `npm run start:dev` | Start in watch mode |
| `npm run start:debug` | Start in debug watch mode |
| `npm run build` | Compile the application |
| `npm run start:prod` | Run the compiled application |
| `npm run lint` | Run ESLint and apply fixes |
| `npm run format` | Format TypeScript source and test files |
| `npm run test` | Run Jest unit tests |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:cov` | Generate test coverage |
| `npm run test:e2e` | Run end-to-end tests |

## Database Notes

The application currently uses TypeORM synchronization, controlled by `TYPEORM_SYNC`. This is convenient for local development, but automatic schema synchronization can modify or remove database structures and should not be used as the production migration strategy. Set it to `false` in production and introduce versioned migrations before deploying.

Conversations use UUID primary keys. Messages belong to conversations and are deleted automatically when their parent conversation is deleted.

## Production Considerations

- Set `TYPEORM_SYNC=false` and use migrations.
- Store secrets in a secret manager or deployment environment, not in source control.
- Add authentication and authorization before exposing the API publicly.
- Add rate limiting and request size limits to control Gemini usage and abuse.
- Configure structured logging and monitoring for Gemini and database failures.
- Review conversation retention and privacy requirements before storing user content.

## License

This project is private and currently marked as `UNLICENSED` in `package.json`.
