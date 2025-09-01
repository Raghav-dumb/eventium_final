Eventium - Events Management Platform
A modern, full-stack events management application built with Next.js, featuring venue search, user authentication, event creation, and interactive maps.

=> Table of Contents
   Features
   Prerequisites
   Installation
   Environment Setup
   Running the Application
   API Endpoints
   Database Schema
   Deployment
   Troubleshooting
   Contributing

✨ Features
  User Authentication - Secure login/register with JWT tokens
  Venue Search - Integrated Foursquare API for venue discovery
  Interactive Maps - Leaflet maps for venue visualization
  Event Management - Create, edit, delete, and browse events
  User Enrollments - Join/leave events with enrollment tracking
  Dashboard Analytics - Event statistics and user insights
  Modern UI - Responsive design with Tailwind CSS and shadcn/ui
  Auto Cleanup - Automatic cleanup of past events and enrollments

🔧 Prerequisites
  Before running this project, ensure you have the following installed:
  - Required Software
    Node.js (version 18.0.0 or higher)
          #Check your Node.js version
          node --version
          #Should return v18.x.x or higher
    npm (comes with Node.js) or yarn
          #Check npm version
          npm --version
          #Should return 8.x.x or higher
    Git (for cloning the repository)
          #Check git version
          git --version 

🚀 Installation
  Step 1: Clone the Repository
    #Clone the repository
    git clone https://github.com/Raghav-dumb/eventium_final.git
    #Navigate to the project directory
    cd eventium_final
  Step 2: Install Dependencies
    #Install all dependencies using npm
    npm install
    Expected Output:
    added 1234 packages, and audited 1235 packages in 1m 30s found 0 vulnerabilities.
  Step 3: Verify Installation
    #Check if all dependencies are installed correctly
    npm list --depth=0
    #Verify Next.js installation
    npx next --version

🔑 Environment Setup
  Step 1: Create Environment File
    #Create .env.local file
    touch .env.local
    #OR on Windows
    echo. > .env.local
  Step 2: Get Foursquare API Key
    1. Visit Foursquare Developers
    2. Sign up or log in to your account
    3. Create a new app:
      - Click "Create App"
      - Fill in app details (name: "Eventium", description: "Events management platform")
      - Select "Web" as platform
    4. Copy your API key from the app dashboard
  Step 3: Configure Environment Variables
    - Add the following to your .env.local file:
      #Foursquare API Configuration
      FOURSQUARE_API_KEY=your_foursquare_api_key_here
      #JWT Secret (generate a secure random string)
      JWT_SECRET=your_super_secret_jwt_key_here
      #Database Configuration (optional)
      DATABASE_PATH=./app.db
      #Development Configuration (optional)
      NODE_ENV=development
    - Generate JWT Secret:
    #Generate a random JWT secret
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  Step 4: Verify Environment Setup {shell}
    #Check if environment file exists
    ls -la .env.local
    #Verify environment variables are loaded (optional)
    node -e "require('dotenv').config(); console.log('FOURSQUARE_API_KEY:', process.env.FOURSQUARE_API_KEY ? 'Set' : 'Not set')"

🏃‍♂️ Running the Application
  Development Mode
    #Start the development server
    npm run dev
  Expected Output:
    - ready started server on 0.0.0.0:3000, url: http://localhost:3000
    - event compiled client and server successfully in 2.3s (18 modules)
  Access the Application
    - Open your web browser
    - Navigate to: http://localhost:3000
    - You should see the Eventium homepage with animated globe
  Production Build (will run without it only for deployment)
    #Build the application for production
    npm run build
    #Start the production server
    npm start
  Other Available Scripts
    #Run linting
    npm run lint
    #Check for TypeScript errors (if applicable)
    npx tsc --noEmit
    #Run tests (if configured)
    npm test

=> API Endpoints
The application provides the following API endpoints:
  Authentication
    POST /api/users/register - User registration
    POST /api/users/login - User login
  Events
    GET /api/events/list - List all public events
    GET /api/events/my - Get user's hosted events
    POST /api/events/create - Create new event
    GET /api/events/[id] - Get specific event details
    PUT /api/events/[id] - Update event
    DELETE /api/events/[id] - Delete event
    GET /api/events/filter - Filter events by criteria
    GET /api/events/cleanup - Clean up past events
  Enrollments
    POST /api/enrollments/enroll - Join an event
    POST /api/enrollments/unenroll - Leave an event
    GET /api/enrollments/my - Get user's enrollments
  Venues & Geocoding
    GET /api/venues/search - Search venues via Foursquare
    GET /api/geocode - Convert address to coordinates
    GET /api/reverse-geocode - Convert coordinates to address

🚀 Deployment (not needed to run locally)
  - Vercel
    1. Install Vercel CLI:
      npm install -g vercel
    2. Deploy:
      vercel
    3. Set environment variables in Vercel dashboard

=> Troubleshooting
  Common Issues
    1. "Module not found" errors
      #Clear node_modules and reinstall
      rm -rf node_modules package-lock.json
      npm install
    2. Port 3000 already in use
      #Kill process on port 3000
      npx kill-port 3000
      #OR use different port
      npm run dev -- -p 3001
    3. Foursquare API errors
      #Verify API key in .env.local
      cat .env.local
      #Test API key
      curl "https://places-api.foursquare.com/v3/places/search?query=coffee&near=New%20York" \
      -H "Authorization: Bearer your_api_key_here"
    4. Database connection issues
      #Check database file permissions
      ls -la app.db
      #Remove and recreate database
      rm app.db
      npm run dev
    5. Build errors
      #Clear Next.js cache
      rm -rf .next
      #Rebuild
      npm run build
    * Performance Issues
      #Check bundle size
      npm run build
      #Look for bundle analysis in terminal
      #Monitor memory usage
      node --max-old-space-size=4096 node_modules/.bin/next dev

Made with ❤️ using Next.js and modern web technologies
🎯 Quick Start Checklist
[ ] Node.js 18+ installed
[ ] Repository cloned
[ ] Dependencies installed (npm install)
[ ] Environment file created (.env.local)
[ ] Foursquare API key obtained and configured
[ ] JWT secret generated and configured
[ ] Development server running (npm run dev)
[ ] Application accessible at http://localhost:3000
[ ] User account created
[ ] First event created successfully
If you've completed all steps above, congratulations! Your Eventium application is ready to use! 🎉
