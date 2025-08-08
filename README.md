# Prome-dify

A modern AI chat platform with real-time points balance management, built with Next.js and Express.js.

## Features

### Real-time Balance Management
- **SWR-based polling**: Automatically polls `/api/me/points` every 30 seconds
- **Focus revalidation**: Updates balance when window gains focus
- **Optimistic updates**: Instant UI updates when sending messages, with automatic correction
- **Live balance display**: Real-time balance shown in navigation bar

### Frontend (Next.js + Tailwind CSS)
- Modern React application with TypeScript
- SWR for efficient data fetching and caching
- Responsive design with Tailwind CSS
- Real-time points balance integration
- Chat interface with usage tracking

### Backend (Express.js)
- RESTful API for points management
- CORS-enabled for frontend integration
- Simple in-memory data storage (production would use database)
- Health check endpoint

### CI/CD Pipeline
- GitHub Actions workflow for automated testing
- Separate jobs for backend and frontend
- Linting, type-checking, and building
- Triggers on push and PR to main branch

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Backend (.env)
```bash
PORT=3000
NODE_ENV=development
```

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prome-dify
   ```

2. **Start the backend server**
   ```bash
   cd server
   npm install
   npm run dev
   ```
   The backend will run on http://localhost:3000

3. **Start the frontend development server**
   ```bash
   cd web
   npm install
   npm run dev
   ```
   The frontend will run on http://localhost:3001

4. **Test the integration**
   - Open http://localhost:3001 in your browser
   - Watch the balance update in the navigation
   - Send messages to see points deducted with optimistic updates

## Docker Deployment

### Frontend Docker Build
```bash
cd web
docker build -t prome-dify-frontend .
docker run -p 3001:3001 -e NEXT_PUBLIC_API_URL=http://localhost:3000 prome-dify-frontend
```

### Backend Docker Build
```bash
cd server
# Create a simple Dockerfile if needed
docker build -t prome-dify-backend .
docker run -p 3000:3000 prome-dify-backend
```

## API Endpoints

### GET /api/me/points
Returns the current user's points balance.

**Response:**
```json
{
  "balance": 1000
}
```

### POST /api/usage
Deducts points for AI usage and returns updated balance.

**Request Body:**
```json
{
  "cost": 10
}
```

**Response:**
```json
{
  "success": true,
  "balance": 990,
  "conversationId": "conv_1234567890"
}
```

### GET /health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok"
}
```

## Architecture

### Balance Polling Implementation
The frontend uses SWR (Stale-While-Revalidate) for efficient data fetching:

- **Automatic polling**: Fetches balance every 30 seconds
- **Smart revalidation**: Updates on window focus and network reconnection
- **Optimistic updates**: Immediate UI updates with server-side correction
- **Error handling**: Automatic retries on network errors

### Usage Flow
1. User sends a chat message
2. Frontend optimistically updates balance (-10 points)
3. API call to `/api/usage` deducts actual points
4. Server responds with real balance
5. SWR cache updates with authoritative balance
6. UI reflects final balance (usually matches optimistic update)

## Development Scripts

### Backend (server/)
```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm run lint     # Lint code with ESLint
npm run build    # Build verification (placeholder)
```

### Frontend (web/)
```bash
npm run dev         # Start development server with Turbopack
npm run build       # Build for production
npm start           # Start production server
npm run lint        # Lint code with ESLint
npm run type-check  # TypeScript type checking
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) includes:

### Backend Job
- Node.js 20 setup
- Dependency installation
- ESLint linting
- Build verification

### Frontend Job
- Node.js 20 setup
- Dependency installation
- ESLint linting
- TypeScript type checking
- Production build

### Triggers
- Push to `main` branch
- Pull requests to `main` branch

## Production Considerations

### Database Integration
Replace in-memory storage with:
- PostgreSQL for relational data
- Redis for caching and sessions
- MongoDB for document storage

### Authentication
Add user authentication:
- JWT tokens
- Session management
- User-specific balance tracking

### Environment Configuration
- Separate development/staging/production configs
- Secure environment variable management
- API rate limiting

### Monitoring
- Application performance monitoring
- Error tracking
- Balance audit logging
- Usage analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.