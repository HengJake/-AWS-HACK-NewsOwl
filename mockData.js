// Mock data for image analysis simulation
const ImageAnalysisMockData = {
  // Mock responses for different types of images
  responses: {
    // News image with people and text
    newsImage1: {
      labels: [
        { name: "Tiger", confidence: 95.2 },
        { name: "Car", confidence: 87.4 },
        { name: "Truck", confidence: 92.1 }
      ],
      ocrText: "Breaking: Mayor announces new infrastructure plan worth $2.5 billion",
      textClassification: "statement",
      credibility: {
        level: "medium",
        rationale: "Statement contains specific financial figures but lacks verifiable sources in the image context."
      }
    },

    // Chart/infographic image
    chartImage: {
      labels: [
        { name: "Chart", confidence: 98.7 },
        { name: "Graph", confidence: 94.3 },
        { name: "Text", confidence: 89.1 },
        { name: "Statistics", confidence: 82.6 }
      ],
      ocrText: "Unemployment rate drops to 3.2% in Q4 2024",
      textClassification: "statement",
      credibility: {
        level: "high",
        rationale: "Statistical claim with specific data points. Unemployment statistics are typically verifiable through official sources."
      }
    },

    // Opinion/editorial image
    opinionImage: {
      labels: [
        { name: "Person", confidence: 91.8 },
        { name: "Text", confidence: 88.4 },
        { name: "Quote", confidence: 76.2 }
      ],
      ocrText: "I believe this policy will transform our economy for the better",
      textClassification: "opinion",
      credibility: {
        level: "low",
        rationale: "Personal opinion statement using subjective language like 'I believe' and 'for the better'."
      }
    },

    // Image with no text
    noTextImage: {
      labels: [
        { name: "Landscape", confidence: 94.5 },
        { name: "Mountain", confidence: 89.7 },
        { name: "Sky", confidence: 92.3 },
        { name: "Nature", confidence: 87.1 }
      ],
      ocrText: "",
      textClassification: null,
      credibility: null
    },

    // Low quality/unclear image
    lowQualityImage: {
      labels: [
        { name: "Blurry", confidence: 45.2 },
        { name: "Text", confidence: 32.1 }
      ],
      ocrText: "unclear text detected",
      textClassification: "statement",
      credibility: {
        level: "low",
        rationale: "Image quality too poor for reliable text extraction and verification."
      }
    }
  },

  // Function to get mock response based on image characteristics
  getMockResponse: function(imageElement) {
    // Simple logic to determine which mock response to return
    const src = imageElement.src || '';
    const alt = imageElement.alt || '';
    const className = imageElement.className || '';
    
    // Check for keywords to determine response type
    if (src.includes('chart') || alt.includes('chart') || className.includes('chart')) {
      return this.responses.chartImage;
    }
    
    if (src.includes('opinion') || alt.includes('opinion') || className.includes('editorial')) {
      return this.responses.opinionImage;
    }
    
    if (src.includes('landscape') || alt.includes('nature') || className.includes('photo')) {
      return this.responses.noTextImage;
    }
    
    if (imageElement.width < 200 || imageElement.height < 200) {
      return this.responses.lowQualityImage;
    }
    
    // Default to news image response
    return this.responses.newsImage1;
  },

  // Simulate API delay
  simulateDelay: function(min = 1000, max = 3000) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  // Simulate occasional API failures
  simulateFailure: function(failureRate = 0.1) {
    return Math.random() < failureRate;
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageAnalysisMockData;
}