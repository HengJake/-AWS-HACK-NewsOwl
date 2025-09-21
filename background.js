console.log("background loaded");

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "factCheckText") {
    // Send message to content script to fact-check the selected text
    chrome.tabs.sendMessage(tab.id, {
      action: "factCheckFromContext",
      text: info.selectionText
    })
  }
})

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.sync.set({
    factCheckEnabled: true,
    biasEnabled: true,
    autoExpand: false,
  })

  // Initialize stats
  chrome.storage.local.set({
    factsChecked: 0,
    biasAlerts: 0,
    sourcesVerified: 0,
  })

  // Create context menu for fact checking
  chrome.contextMenus.create({
    id: "factCheckText",
    title: "🔍 Fact Check This Text",
    contexts: ["selection"],
    documentUrlPatterns: ["http://*/*", "https://*/*"]
  })
})

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request)

  if (request.action === "updateStats") {
    chrome.storage.local.get(["factsChecked", "biasAlerts", "sourcesVerified"], (result) => {
      const updates = {}
      if (request.type === "factCheck") {
        updates.factsChecked = (result.factsChecked || 0) + 1
      } else if (request.type === "biasAlert") {
        updates.biasAlerts = (result.biasAlerts || 0) + 1
      } else if (request.type === "sourceVerified") {
        updates.sourcesVerified = (result.sourcesVerified || 0) + 1
      }
      chrome.storage.local.set(updates)
    })
    sendResponse({ success: true })
  } else if (request.action === "openSidePanel") {
    console.log('Background: Opening sidepanel for text:', request.selectedText.substring(0, 50) + '...')
    // Store the selected text and context for the side panel
    chrome.storage.local.set({
      selectedText: request.selectedText,
      sourceUrl: request.url,
      timestamp: request.timestamp,
      tabId: sender.tab.id
    })

    // Open the side panel
    chrome.sidePanel.open({
      windowId: sender.tab.windowId
    }).then(() => {
      console.log('Background: Sidepanel opened successfully')
      sendResponse({ success: true, message: "Side panel opened successfully" })
    }).catch((error) => {
      console.error("Error opening side panel:", error)
      sendResponse({ success: false, error: error.message })
    })

    // Return true to indicate we'll send a response asynchronously
    return true
  } else if (request.action === "updateSidePanelWithAnalysis") {
    console.log('Background: Storing analysis results for sidepanel')
    // Store analysis results for sidepanel
    chrome.storage.local.set({
      latestAnalysis: request.analysis
    })

    // Send message to sidepanel if it's open
    chrome.runtime.sendMessage({
      action: "analysisComplete",
      analysis: request.analysis
    }).catch(() => {
      // Sidepanel might not be open, that's okay
      console.log('Sidepanel not available to receive analysis')
    })

    sendResponse({ success: true })
  } else if (request.action === "openSidePanelForImage") {
    console.log('Background: Opening sidepanel for image analysis')
    // Store the image info for the side panel
    chrome.storage.local.set({
      analyzingImage: {
        src: request.imageSrc,
        alt: request.imageAlt
      },
      sourceUrl: request.url,
      timestamp: request.timestamp,
      tabId: sender.tab.id
    })

    // Open the side panel
    chrome.sidePanel.open({
      windowId: sender.tab.windowId
    }).then(() => {
      console.log('Background: Sidepanel opened for image analysis')
      
      // Send image info to sidepanel
      chrome.runtime.sendMessage({
        action: "updateSidePanelForImage",
        imageSrc: request.imageSrc,
        imageAlt: request.imageAlt
      }).catch(() => {
        console.log('Sidepanel not available to receive image info')
      })
      
      // Start mock image analysis
      performMockImageAnalysis(request.imageSrc, request.imageAlt)
      
      sendResponse({ success: true, message: "Side panel opened for image analysis" })
    }).catch((error) => {
      console.error("Error opening side panel for image:", error)
      sendResponse({ success: false, error: error.message })
    })

    // Return true to indicate we'll send a response asynchronously
    return true
  }
})

// Mock image analysis function
async function performMockImageAnalysis(imageSrc, imageAlt) {
  console.log('Background: Starting mock image analysis')
  
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create a mock image element to determine response type
    const mockImg = {
      src: imageSrc,
      alt: imageAlt || '',
      className: '',
      width: 300, // Default size for mock
      height: 200
    }
    
    // Get mock response (we'll need to include the mock data in background)
    const mockResponse = getMockImageAnalysisResponse(mockImg)
    
    console.log('Background: Mock image analysis complete:', mockResponse)
    
    // Store results
    chrome.storage.local.set({
      latestImageAnalysis: mockResponse
    })
    
    // Send to sidepanel
    chrome.runtime.sendMessage({
      action: "imageAnalysisComplete",
      analysis: mockResponse
    }).catch(() => {
      console.log('Sidepanel not available to receive image analysis')
    })
    
  } catch (error) {
    console.error('Mock image analysis failed:', error)
  }
}

// Mock image analysis response generator
function getMockImageAnalysisResponse(imageElement) {
  const src = imageElement.src || ''
  const alt = imageElement.alt || ''
  
  // Simple logic to determine response type
  if (src.includes('chart') || alt.includes('chart')) {
    return {
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
    }
  }
  
  if (src.includes('opinion') || alt.includes('opinion')) {
    return {
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
    }
  }
  
  if (src.includes('landscape') || alt.includes('nature')) {
    return {
      labels: [
        { name: "Landscape", confidence: 94.5 },
        { name: "Mountain", confidence: 89.7 },
        { name: "Sky", confidence: 92.3 },
        { name: "Nature", confidence: 87.1 }
      ],
      ocrText: "",
      textClassification: null,
      credibility: null
    }
  }
  
  // Default news image response
  return {
    labels: [
      { name: "Person", confidence: 95.2 },
      { name: "Suit", confidence: 87.4 },
      { name: "Microphone", confidence: 92.1 },
      { name: "Press Conference", confidence: 78.9 },
      { name: "Building", confidence: 65.3 }
    ],
    ocrText: "Breaking: Mayor announces new infrastructure plan worth $2.5 billion",
    textClassification: "statement",
    credibility: {
      level: "medium",
      rationale: "Statement contains specific financial figures but lacks verifiable sources in the image context."
    }
  }
}