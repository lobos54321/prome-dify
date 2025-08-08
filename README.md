# Prome-Dify

AI-powered chat platform with token-based billing and real-time streaming.

## Features

- 🤖 **AI Chat**: Natural conversations with AI assistant
- ⚡ **Real-time Streaming**: Live SSE responses as they're generated
- 💎 **Token-based Billing**: Transparent pay-per-use pricing
- 🔐 **JWT Authentication**: Secure user sessions
- 💳 **Stripe Integration**: Seamless token purchasing
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔄 **Real-time Balance**: Live token balance updates

## Architecture

### Backend (Node.js + Express + TypeScript)
- RESTful API with SSE streaming endpoints
- JWT authentication middleware
- Prisma ORM with SQLite database
- Stripe webhooks for payment processing
- Token usage tracking with conversation support

### Frontend (Next.js + TypeScript + Tailwind)
- Server-side rendering with App Router
- Protected routes with authentication guards
- Real-time SSE client for chat streaming
- Responsive UI with Tailwind CSS
- Token balance tracking

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

Backend runs on http://localhost:3000

### Frontend Setup

1. **Navigate to frontend**:
   ```bash
   cd web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment setup** (optional):
   ```bash
   # Create .env.local if backend runs on different host
   echo "NEXT_PUBLIC_API_BASE=http://localhost:3000" > .env.local
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

Frontend runs on http://localhost:3001

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "balance": 1000,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "token": "jwt_token"
}
```

#### POST /api/auth/login
Authenticate existing user.

**Request:**
```json
{
  "email": "user@example.com", 
  "password": "password123"
}
```

**Response:** Same as register

#### GET /api/auth/me
Get current user information (requires Authorization header).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "balance": 950,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Chat Endpoints

#### POST /api/chat
Start a chat session with SSE streaming (requires authentication).

**Request:**
```json
{
  "message": "Hello, how are you?",
  "conversationId": "optional_conversation_id"
}
```

**Response:** Server-Sent Events stream with the following events:

##### meta Event
Emitted when a new conversation is created:
```json
{
  "event": "meta",
  "data": {
    "conversation_id": "new_conversation_id"
  }
}
```

##### answer Event  
Emitted during AI response generation:
```json
{
  "event": "answer",
  "data": {
    "content": "Hello! I'm doing well, thank you for asking...",
    "finished": false
  }
}
```

##### usage Event
Emitted after token consumption:
```json
{
  "event": "usage", 
  "data": {
    "conversationId": "conversation_id",
    "tokensUsed": 25,
    "balanceAfter": 975
  }
}
```

##### done Event
Emitted when response is complete:
```json
{
  "event": "done",
  "data": {
    "conversationId": "conversation_id"
  }
}
```

##### error Event
Emitted on errors:
```json
{
  "event": "error",
  "data": {
    "error": "Insufficient tokens",
    "balance": 10
  }
}
```

#### GET /api/conversations
Get user's conversation list (requires authentication).

**Response:**
```json
{
  "conversations": [
    {
      "id": "conversation_id",
      "userId": "user_id", 
      "title": "Conversation Title",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/conversations/:id/messages
Get messages for a specific conversation (requires authentication).

**Response:**
```json
{
  "messages": [
    {
      "id": "message_id",
      "conversationId": "conversation_id",
      "role": "user",
      "content": "Hello!",
      "tokens": 5,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "message_id_2", 
      "conversationId": "conversation_id",
      "role": "assistant",
      "content": "Hello! How can I help you?",
      "tokens": 15,
      "createdAt": "2024-01-01T00:00:01Z"
    }
  ]
}
```

### Billing Endpoints

#### GET /api/billing/packages
Get available token packages.

**Response:**
```json
{
  "packages": [
    {
      "id": "package_id",
      "name": "Starter Pack",
      "description": "Perfect for light usage",
      "tokens": 1000,
      "priceUsd": 999,
      "stripePriceId": "price_...",
      "active": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/billing/checkout
Create Stripe checkout session (requires authentication).

**Request:**
```json
{
  "packageId": "package_id"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

#### GET /api/billing/balance
Get user's current token balance (requires authentication).

**Response:**
```json
{
  "balance": 1000
}
```

#### GET /api/billing/usage
Get user's usage history (requires authentication).

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 50)

**Response:**
```json
{
  "usage": [
    {
      "id": "usage_id",
      "userId": "user_id",
      "conversationId": "conversation_id",
      "tokensUsed": 25,
      "balanceAfter": 975,
      "type": "chat",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/billing/webhook
Stripe webhook endpoint for payment processing.

## Frontend Usage

### Authentication
- Navigate to `/register` to create a new account (receives 1,000 free tokens)
- Use `/login` to sign in to existing account
- JWT token stored in localStorage for persistence
- Protected routes automatically redirect to login when unauthenticated

### Chat Interface
- Navigate to `/chat` for the main chat interface
- Messages are streamed in real-time using SSE
- Token usage displayed during conversations
- Balance updates automatically after each message
- Abort generation using the "Stop" button
- Conversation history maintained

### Billing Management
- Navigate to `/billing` to view current balance and purchase tokens
- Browse available token packages
- Click "Purchase" to initiate Stripe checkout
- Redirected back with success/cancel status
- Token balance updates immediately after successful payment

### Navigation
- Top navigation bar shows current user and token balance
- Links to Chat and Billing when authenticated
- Logout functionality available
- Responsive design adapts to mobile devices

## Development

### Backend Development

**Available Scripts:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint

**Project Structure:**
```
src/
├── index.ts              # Express app entry point
├── middleware/
│   └── auth.ts          # JWT authentication middleware
├── routes/
│   ├── auth.ts          # Authentication endpoints
│   ├── chat.ts          # Chat and SSE endpoints  
│   └── billing.ts       # Billing and Stripe endpoints
├── services/
│   ├── authService.ts   # Authentication logic
│   ├── chatService.ts   # Chat and conversation logic
│   └── usageService.ts  # Token usage and balance management
└── types/
    └── index.ts         # TypeScript type definitions
```

### Frontend Development  

**Available Scripts:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run Next.js linting

**Project Structure:**
```
web/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx      # Root layout with auth provider
│   ├── page.tsx        # Home page
│   ├── login/page.tsx  # Login page
│   ├── register/page.tsx # Registration page
│   ├── chat/page.tsx   # Chat interface
│   └── billing/page.tsx # Billing management
├── components/
│   ├── Navigation.tsx   # Global navigation bar
│   └── ChatBox.tsx     # Chat interface component
└── lib/
    ├── auth.tsx        # Authentication context and hooks
    ├── useAuthGuard.ts # Protected route hook
    ├── api.ts          # API client functions
    └── sse.ts          # SSE client for chat streaming
```

## Configuration

### Environment Variables

**Backend (.env):**
```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DATABASE_URL="file:./dev.db"
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:3001
```

**Frontend (web/.env.local):**
```env
NEXT_PUBLIC_API_BASE=http://localhost:3000
```

### Database Schema

The application uses SQLite with Prisma ORM. Key models:

- **User**: Stores user accounts with email, password, and token balance
- **Conversation**: Groups messages by conversation
- **Message**: Individual chat messages with token counts
- **UsageEvent**: Tracks token consumption with conversation context
- **Package**: Available token packages for purchase

### Stripe Integration

1. Create Stripe account and get API keys
2. Create products and prices in Stripe dashboard
3. Update database with package records including `stripePriceId`
4. Configure webhook endpoint for `checkout.session.completed` events
5. Test with Stripe test mode before going live

## Deployment

### Backend Deployment
1. Build the application: `npm run build`
2. Set production environment variables
3. Run database migrations: `npx prisma db push`
4. Start the server: `npm start`

### Frontend Deployment
1. Build the application: `npm run build`
2. Set `NEXT_PUBLIC_API_BASE` to production backend URL
3. Deploy static files or run: `npm start`

### Production Considerations
- Use PostgreSQL or MySQL instead of SQLite for production
- Configure proper CORS origins
- Set up SSL/TLS certificates
- Configure proper Stripe webhook endpoint
- Set strong JWT secret
- Configure proper database connection pooling
- Set up monitoring and logging

## License

MIT