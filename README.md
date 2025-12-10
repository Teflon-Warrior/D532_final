# Netflix Recommendation Engine

## Overview

A NoSQL-based movie and TV show recommendation application built as the final project for Applied Database Technologies (D532). This project leverages MongoDB to deliver personalized content recommendations to users.

### Contributors

- Luke Harris
- Sahil Ravula
- Manish Maudgalya

## Project Structure

```
D532_final/
├── server.js              # Express server configuration
├── mongo_script.js        # MongoDB setup and utilities
├── package.json           # Node.js dependencies
├── public/                # Frontend files
│   ├── index.html         # Main dashboard
│   ├── landing.html       # Landing page
│   ├── login.html         # User authentication
│   ├── account.html       # User account management
│   └── credentials.env    # Environment variables
└── output/                # Generated outputs and logs
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the `D532_final/` directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Configure your MongoDB connection in `credentials.env`
5. Start the server:
   ```bash
   npm start
   ```

## Features

- User authentication and account management
- Movie and TV show database with MongoDB
- Personalized recommendation engine
- Responsive web interface
- User dashboard for browsing recommendations

## Technical Stack

- **Backend:** Node.js with Express.js
- **Database:** MongoDB (NoSQL)
- **Frontend:** HTML5, CSS, JavaScript
- **Environment Management:** dotenv

## Usage

Visit the landing page to create an account or log in. Browse recommendations tailored to your preferences through the dashboard.

## License

[Specify license if applicable]