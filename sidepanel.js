// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateSidePanel") {
    updateSelectionText(message.selectedText)
  }
})

// Update the selection text in the sidepanel
function updateSelectionText(text) {
  const selectionElement = document.getElementById("selection-text")
  if (selectionElement) {
    selectionElement.textContent = text
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Sidepanel loaded")
})