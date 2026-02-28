# Rodo Backend API

A Node.js backend service for intelligent road quality analysis and optimal route navigation. This API uses machine learning to predict road quality based on sensor data and provides route recommendations using Google Maps API.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Machine Learning**: ml-random-forest
- **Authentication**: JWT + bcryptjs
- **External APIs**: Google Maps Directions API
- **Geospatial**: ngeohash, @mapbox/polyline
- **Data Processing**: csvtojson, axios

## Project Structure

```
backend/
├── data/
│   └── road_dataset.csv          # Training data for ML model
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Database migration files
├── src/
│   ├── Controllers/
│   │   ├── directionController.ts # Route direction logic
│   │   ├── qualityController.ts   # Road quality prediction
│   │   └── userContoller.ts       # User authentication
│   ├── Routers/
│   │   ├── directionRouter.ts     # Direction endpoints
│   │   └── userRouter.ts          # User endpoints
│   ├── utils/
│   │   ├── pattern.ts             # Validation regex patterns
│   │   └── prisma.ts              # Prisma client instance
│   ├── app.ts                     # Express app configuration
│   └── server.ts                  # Server entry point
├── .env                           # Environment variables
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Google Maps API key
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file (see [Environment Variables](#environment-variables))

4. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=8000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rodo"

# Google Maps API
GOOG_MAP_API_KEY=your_google_maps_api_key_here

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here
```

## Database Setup

The application uses Prisma with PostgreSQL. Run migrations to set up the database:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio (optional)
npx prisma studio
```

## API Routes

### Base URL
```
http://localhost:8000/api/v1
```

---

### Maps & Directions

#### **GET** `/maps`
Get optimal route directions with road quality analysis.

**Query Parameters:**
- `src` (string, required): Source location (address or coordinates)
- `dest` (string, required): Destination location (address or coordinates)

**Response:**
```json
{
  "status": "success",
  "message": "Directions fetched successfully!",
  "points": [
    {
      "lat": 40.7128,
      "lon": -74.0060
    }
  ],
  "analytics": {
    "score": 0.85,
    "avgQuality": 0.78,
    "coverage": 0.92
  }
}
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/maps?src=New+York&dest=Boston"
```

---

#### **POST** `/maps`
Predict and store road quality data.

**Request Body:**
```json
{
  "rms_value": 0.45,
  "peak_count": 12,
  "geohash": "dr5regw2z"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Road quality added!",
  "score": 0.76
}
```

**Field Descriptions:**
- `rms_value` (number): Root Mean Square value from accelerometer
- `peak_count` (number): Number of peaks detected in sensor data
- `geohash` (string): Geohash of the location (8 characters)

---

### User Management

#### **POST** `/users/signup`
Register a new user.

**Request Body:**
```json
{
  "username": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Welcome johndoe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Validation Rules:**
- `username`: Alphanumeric with underscores, 3-20 characters
- `email`: Valid email format
- `password`: Minimum 8 characters with uppercase, lowercase, number, and special character

---

#### **POST** `/users/login`
Authenticate an existing user.

**Request Body:**
```json
{
  "credentials": "johndoe",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Welcome johndoe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Note:** `credentials` can be either username or email.

---

## Data Models

### RoadQuality

```prisma
model RoadQuality {
  geohash     String @id
  roadQuality Float  @default(0.6)
  sample      Int    @default(0)
}
```

- `geohash`: 8-character geohash identifier for location
- `roadQuality`: Average quality score (0-1, where 1 is excellent)
- `sample`: Number of samples collected for this location

### Users

```prisma
model Users {
  user_id  String @id @default(uuid())
  username String @unique
  name     String
  email    String @unique
  password String
}
```

## Machine Learning Model

The application uses a **Random Forest Regression** model to predict road quality based on sensor data.

### Training Data Format
CSV file located at `data/road_dataset.csv`:
```csv
rms_value,peak_count,roadQuality
0.45,12,0.8
0.62,18,0.6
...
```

### Model Configuration
- **Algorithm**: Random Forest Regression
- **Seed**: 42
- **Max Features**: 1.0
- **Replacement**: true
- **Number of Estimators**: 100

### Prediction Process
1. Receives RMS value and peak count from sensor
2. Predicts road quality score (0-1)
3. Updates database with running average
4. Uses geohash for spatial indexing

### Route Scoring Algorithm
```
score = (avgQuality × 0.7) + (coverage × 0.3)
```

Where:
- `avgQuality`: Average road quality of known segments
- `coverage`: Percentage of route with known quality data
- Unknown segments are assigned a default quality of 0.6

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request (missing/invalid parameters) |
| 401 | Unauthorized |
| 409 | Conflict (duplicate username/email) |
| 500 | Internal server error |
| 503 | Service unavailable (model training) |

## Route Analysis Workflow

1. **Query Google Maps API** for multiple route alternatives
2. **Sample Points** along each route every 10 meters
3. **Convert to Geohashes** (8-character precision)
4. **Query Database** for known road quality data
5. **Score Routes** based on quality and coverage
6. **Return Best Route** with analytics and waypoints

