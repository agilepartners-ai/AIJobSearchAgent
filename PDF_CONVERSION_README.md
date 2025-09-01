# Enhanced PDF to DOCX Conversion Solution

This comprehensive solution provides high-quality PDF to DOCX conversion with advanced features and fallback mechanisms.

## 🚀 Quick Start

### 1. Start the Python Service (Recommended)

```bash
# Navigate to server directory
cd server

# Install dependencies
pip install -r requirements.txt

# Start the service
python start_pdf_service.py
```

### 2. Use in Your Application

```typescript
import { PDFToDocxService } from './services/pdfToDocxService';

// Convert PDF with automatic Python service fallback
const result = await PDFToDocxService.convertFileToDocx(pdfFile);

// Download the result
PDFToDocxService.downloadDocxBlob(result.docxBlob, 'converted-resume');
```

## 🏗️ Architecture

### Components

1. **Enhanced PDF to DOCX Service** (`src/services/enhancedPdfToDocxService.ts`)
   - Node.js client for Python service
   - Automatic fallback to TypeScript implementation
   - Health checks and error handling

2. **Python Conversion Service** (`server/pdf_conversion_service.py`)
   - Flask-based REST API
   - Uses `pdf2docx` and `docling` libraries
   - High-quality layout preservation

3. **TypeScript Fallback** (`src/services/pdfToDocxService.ts`)
   - Pure TypeScript implementation
   - Structured text parsing
   - Resume-specific formatting

## ✨ Key Features

### Advanced Text Processing
- **Structured Parsing**: Automatically detects headers, bullet points, and sections
- **Resume Optimization**: Special handling for contact info, skills, and experience sections
- **HTML Entity Cleaning**: Removes `[object Object]` and decodes HTML entities
- **Contact Information Extraction**: Automatically finds and formats email/phone

### High-Quality Conversion
- **Layout Preservation**: Maintains document structure and formatting
- **Table Recognition**: Advanced table detection and reconstruction
- **Image Handling**: Preserves images and visual elements
- **Font and Style Preservation**: Maintains original typography

### Robust Error Handling
- **Multiple Fallbacks**: Python service → TypeScript implementation
- **Health Monitoring**: Automatic service health checks
- **Graceful Degradation**: Continues working even if some features fail
- **Comprehensive Logging**: Detailed error reporting and debugging

## 📋 API Reference

### EnhancedPDFToDocxService

```typescript
interface EnhancedPDFToDocxOptions extends PDFToDocxOptions {
    usePythonService?: boolean;        // Enable Python service (default: true)
    pythonServiceUrl?: string;         // Python service URL (default: localhost:5001)
}

// Main conversion method
convertFileToDocxEnhanced(file: File, options?: EnhancedPDFToDocxOptions): Promise<ConversionResult>

// Health check
checkPythonServiceHealth(serviceUrl?: string): Promise<boolean>

// Get service status
getPythonServiceStatus(serviceUrl?: string): Promise<object>
```

### Python Service Endpoints

```http
GET  /health                    # Service health check
POST /convert                   # Convert PDF file (multipart/form-data)
POST /convert/base64           # Convert PDF from base64 (application/json)
```

## 🔧 Configuration

### Environment Variables

```bash
# Python service port
PORT=5001

# Python service URL (for Node.js client)
PYTHON_SERVICE_URL=http://localhost:5001
```

### Service Configuration

```typescript
// Disable Python service fallback
const result = await PDFToDocxService.convertFileToDocx(file, {
    usePythonService: false
});

// Custom Python service URL
const result = await EnhancedPDFToDocxService.convertFileToDocxEnhanced(file, {
    pythonServiceUrl: 'http://custom-service:8080'
});
```

## 🐍 Python Dependencies

Install the required Python packages:

```bash
pip install -r server/requirements.txt
```

### Key Libraries

- **pdf2docx** (0.5.8): High-quality PDF to DOCX conversion with layout preservation
- **docling** (1.16.0): Advanced document processing with ML models
- **Flask** (2.3.3): Web framework for the REST API
- **Flask-CORS** (4.0.0): Cross-origin resource sharing support

## 📊 Performance Comparison

| Feature | Python Service | TypeScript Fallback |
|---------|---------------|-------------------|
| Layout Preservation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Table Recognition | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Image Handling | ⭐⭐⭐⭐⭐ | ⭐ |
| Processing Speed | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Resume Formatting | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🧪 Testing

### Test the Python Service

```bash
# Health check
curl http://localhost:5001/health

# Convert a PDF file
curl -X POST -F "file=@test.pdf" http://localhost:5001/convert
```

### Test the Node.js Integration

```typescript
// Test Python service availability
const isHealthy = await EnhancedPDFToDocxService.checkPythonServiceHealth();
console.log('Python service healthy:', isHealthy);

// Test conversion
const result = await PDFToDocxService.convertFileToDocx(pdfFile);
```

## 🚨 Troubleshooting

### Common Issues

1. **Python Service Not Starting**
   ```bash
   # Check if port is available
   lsof -i :5001

   # Install dependencies
   pip install -r server/requirements.txt
   ```

2. **Conversion Failures**
   - Check PDF file validity
   - Ensure sufficient memory for large PDFs
   - Review service logs for detailed error messages

3. **TypeScript Errors**
   ```bash
   # Rebuild the project
   npm run build

   # Check for type errors
   npx tsc --noEmit
   ```

### Debug Mode

Enable detailed logging:

```typescript
// Enable debug logging
console.log('Service status:', await EnhancedPDFToDocxService.getPythonServiceStatus());
```

## 📈 Monitoring

### Health Checks

```typescript
// Periodic health monitoring
setInterval(async () => {
    const status = await EnhancedPDFToDocxService.getPythonServiceStatus();
    if (status.status !== 'healthy') {
        console.warn('Python service unhealthy:', status);
    }
}, 30000); // Check every 30 seconds
```

### Performance Metrics

The service provides conversion metrics:
- Processing time
- File size information
- Success/failure rates

## 🔄 Migration Guide

### From Basic Implementation

If you're upgrading from a basic PDF to DOCX implementation:

1. **Install Python dependencies** in the server directory
2. **Start the Python service** alongside your Node.js application
3. **Update imports** to use the enhanced service (automatic)
4. **Test conversions** with sample PDFs

### Backward Compatibility

The enhanced service maintains full backward compatibility:
- All existing method signatures work unchanged
- Automatic fallback ensures no service disruption
- TypeScript implementation serves as reliable backup

## 🤝 Contributing

### Adding New Features

1. **Python Service**: Add new endpoints in `pdf_conversion_service.py`
2. **Node.js Client**: Extend `EnhancedPDFToDocxService` class
3. **TypeScript Fallback**: Update `PDFToDocxService` with new capabilities

### Testing New Conversions

```typescript
// Test new conversion features
const testFile = new File([pdfData], 'test.pdf');
const result = await PDFToDocxService.convertFileToDocx(testFile, {
    // Test new options
});
```

## 📄 License

This solution is part of the AI Job Search Agent project.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review service logs for error details
3. Test with sample files to isolate problems
4. Ensure all dependencies are properly installed

---

**Note**: The Python service provides significantly better conversion quality, especially for complex layouts, tables, and images. The TypeScript fallback ensures the service remains functional even if the Python service is unavailable.