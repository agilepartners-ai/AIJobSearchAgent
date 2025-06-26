# CORS Configuration Guide

This guide explains how to properly configure Cross-Origin Resource Sharing (CORS) for the resume optimization application.

## What is CORS?

Cross-Origin Resource Sharing (CORS) is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the original page. This is a security measure to prevent malicious websites from making unauthorized requests to other websites on behalf of the user.

## Solution Overview

Our application implements a comprehensive CORS solution with multiple layers:

1. **Client-side handling** - Improved error detection and user feedback
2. **Development proxy** - Local proxy in Vite for development
3. **Production proxy** - Supabase Edge Function for production
4. **Server-side configuration** - Python backend CORS settings

## Client-Side Implementation

### Enhanced Error Detection
The application includes improved error detection for CORS issues with user-friendly error handling and helpful information for troubleshooting.

### Development Setup
For development, we use Vite's built-in proxy configuration to handle CORS issues locally.

### Production Deployment
In production, we use Supabase Edge Functions to handle API requests while maintaining proper CORS configuration.

## Server-Side Configuration

The Python backend (Flask) is configured with proper CORS settings to allow requests from:
- Local development servers (localhost:5173, localhost:3000)
- Production domains

## Troubleshooting

If you encounter CORS issues:
1. Check that your API endpoints are properly configured
2. Verify that your domain is included in the allowed origins
3. Ensure preflight requests are handled correctly
4. Check browser developer tools for specific CORS error messages
