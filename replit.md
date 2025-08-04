# Overview

This is a full-stack web application for analyzing Warframe game inventory screenshots using AI image recognition. The application allows users to upload multiple inventory screenshots, processes them using Google's Gemini AI to extract item names, and then integrates with the Warframe Market API to fetch current market prices. Users can manage their inventory with CRUD operations and export data to Excel format.

**Key Feature Update (January 2025)**: Added Excel file editing capability and advanced processing modes. Users can now:
- Upload existing Excel files and add new screenshots to update inventory
- Update market prices from Excel files via Warframe Market API (4th mode)
- Split Excel files by price threshold (5th mode: items ≤11 vs ≥12 platinum)
- Delete all inventory data with one-click
- Merge new items and increment quantities for existing items
All modes maintain market data integrity and support continuous inventory management.

The application features a modern React frontend with shadcn/ui components and a Node.js/Express backend with PostgreSQL database storage using Drizzle ORM.

# User Preferences

Preferred communication style: Simple, everyday language.
Author credit: "Сделано игроком GrendematriX" 
API Key: Hardcoded fallback included for deployment
Processing Status: Auto-hide after completion with 2-second delay

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API endpoints for inventory management and image processing
- **File Handling**: Multer middleware for multipart form uploads with memory storage
- **Error Handling**: Centralized error handling middleware with structured error responses

## Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless provider
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Two main tables - `inventory_items` and `processing_jobs`
- **Migrations**: Drizzle Kit for database schema management
- **Fallback Storage**: In-memory storage implementation for development/testing

## Database Schema Design
- **inventory_items**: Stores item data with name, quantity, market prices, and metadata
- **processing_jobs**: Tracks background image processing tasks with status and logs
- **Type Safety**: Zod schemas for runtime validation integrated with Drizzle

## Authentication and Authorization
- **Current State**: No authentication system implemented
- **Session Management**: Basic session configuration present but not actively used
- **Security**: CORS and basic security headers configured

## Image Processing Pipeline
- **AI Integration**: Google Gemini 2.5 Flash model for OCR and text extraction with quantity detection
- **Processing Flow**: Async job-based processing with status tracking
- **File Constraints**: 10MB file size limit, JPEG/PNG support
- **Error Recovery**: Comprehensive error handling and logging for failed operations
- **Excel Integration**: Support for uploading existing Excel files and merging with new screenshot data
- **Dual Processing Modes**: New inventory creation and existing inventory editing workflows
- **Quantity Recognition**: Enhanced prompt to detect item quantities from screenshot badges (x2, x6, etc.)

## Market Data Integration
- **External API**: Warframe Market v2 API integration
- **Data Caching**: In-memory caching of market items for performance
- **Price Analysis**: Real-time market price fetching with buy/sell price tracking
- **Normalization**: String normalization for accurate item matching between game and market data

## Export Functionality
- **Format**: Excel (.xlsx) export using ExcelJS library  
- **Data Scope**: Complete inventory with market pricing data
- **Download Mechanism**: Browser-based file download with proper MIME types
- **Import Capability**: Excel file upload and parsing for existing inventory management
- **Merge Logic**: Automatic quantity addition for existing items, new item creation for unknowns

## Development Features
- **Hot Reload**: Vite HMR for rapid development
- **Error Overlay**: Runtime error modal in development
- **Logging**: Structured request/response logging
- **TypeScript**: Full type safety across frontend, backend, and shared schemas

## Deployment Architecture
- **Build Process**: Separate client and server builds with esbuild for server bundling
- **Static Assets**: Client build served as static files in production
- **Environment**: Environment-based configuration for development vs production
- **Replit Integration**: Custom Replit-specific plugins and configuration