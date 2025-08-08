# prome-dify

A comprehensive backend service that provides a proxy to Dify AI with credit-based usage tracking, Stripe payment integration, and usage estimation capabilities.

## Features

- 🤖 **Dify AI Proxy**: Seamless integration with Dify's chat completion API
- 💳 **Credit System**: Points-based usage tracking and billing
- 💰 **Stripe Integration**: Secure payment processing for credit purchases
- 📊 **Usage Analytics**: Detailed usage tracking and estimation
- 🔐 **Authentication**: JWT-based auth with API key support
- 👨‍💼 **Admin Panel**: User management and system monitoring
- 🔄 **Streaming Support**: Real-time chat responses with Server-Sent Events
- 📈 **Cost Estimation**: Predictive usage cost calculation

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe
- **AI Integration**: Dify API
- **Authentication**: JWT + bcrypt

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Dify API account
- Stripe account (for payments)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lobos54321/prome-dify.git
cd prome-dify
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with default data
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/api-key` - Generate API key

### Chat (Dify Proxy)
- `POST /api/chat/estimate` - Estimate usage cost
- `POST /api/chat/completion` - Chat completion (blocking)
- `POST /api/chat/stream` - Chat completion (streaming)
- `GET /api/chat/conversations` - Get conversation history

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/credits` - Get credit balance
- `GET /api/user/usage` - Get usage history

### Billing
- `GET /api/billing/pricing` - Get pricing tiers
- `POST /api/billing/create-payment-intent` - Create Stripe payment
- `POST /api/billing/confirm-payment` - Confirm payment and add credits
- `GET /api/billing/payments` - Get payment history

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - Manage users
- `POST /api/admin/models` - Manage AI models
- `POST /api/admin/users/:id/credits` - Adjust user credits

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/promedify"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key"

# Dify API
DIFY_API_URL="https://api.dify.ai/v1"
DIFY_API_KEY="your-dify-api-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret"

# Admin Account (for seeding)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
```

## Usage Examples

### Authentication

```javascript
// Register a new user
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe'
  })
});
```

### Chat Completion

```javascript
// Get cost estimate
const estimate = await fetch('/api/chat/estimate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'Hello, how are you?',
    model: 'gpt-3.5-turbo'
  })
});

// Make chat request
const response = await fetch('/api/chat/completion', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'Hello, how are you?',
    model: 'gpt-3.5-turbo'
  })
});
```

### API Key Usage

```javascript
// Use API key instead of JWT
const response = await fetch('/api/chat/completion', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'Hello, how are you?'
  })
});
```

## Credit System

- Users start with 1000 free credits
- Credits are deducted based on token usage
- Different AI models have different costs per token
- Users can purchase more credits via Stripe integration
- Admins can manually adjust user credits

## Deployment

### Docker

```bash
# Build the image
docker build -t prome-dify .

# Run the container
docker run -p 3000:3000 --env-file .env prome-dify
```

### Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure production database
- [ ] Set up Stripe webhook endpoints
- [ ] Configure CORS for your frontend domain
- [ ] Set up proper logging and monitoring
- [ ] Configure SSL/TLS termination
- [ ] Set up database backups

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run seed` - Seed database with default data

### Project Structure

```
src/
├── config/         # Environment configuration
├── db/            # Database setup and Prisma client
├── lib/           # Utility libraries (auth, dify client, pricing)
├── services/      # Business logic services
├── routes/        # API route handlers
└── server.ts      # Main application entry point

scripts/
└── seed.ts        # Database seeding script

prisma/
└── schema.prisma  # Database schema definition
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details