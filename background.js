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
      sendResponse({ success: true, message: "Side panel opened successfully" })
    }).catch((error) => {
      console.error("Error opening side panel:", error)
      sendResponse({ success: false, error: error.message })
    })
    
    // Return true to indicate we'll send a response asynchronously
    return true
  }
})