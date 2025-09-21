// Listen for messages from content script and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Sidepanel received message:', message)
  if (message.action === "updateSidePanel") {
    updateSelectionText(message.selectedText)
  } else if (message.action === "analysisComplete") {
    console.log('Sidepanel received analysis results')
    updateWithAnalysis(message.analysis)
  }
})

// Update the selection text in the sidepanel
function updateSelectionText(text) {
  console.log('Updating sidepanel with text:', text.substring(0, 50) + '...')
  const selectionElement = document.getElementById("selection-text")
  if (selectionElement) {
    selectionElement.textContent = text
    console.log('Selection text updated successfully')
  } else {
    console.error('Selection text element not found')
  }
}

// Update sidepanel with API analysis results
function updateWithAnalysis(analysis) {
  console.log('Updating sidepanel with analysis:', analysis)
  
  const root = document.getElementById("sp-root")
  
  // Set loading state first
  root.setAttribute("data-state", "loading")
  
  // Simulate brief loading for better UX
  setTimeout(() => {
    try {
      // Update classification
      const badge = document.querySelector(".classification-badge")
      
      if (analysis.type === "opinion") {
        root.setAttribute("data-classification", "opinion")
        badge.setAttribute("data-type", "opinion")
        badge.textContent = "Opinion"
      } else {
        root.setAttribute("data-classification", "statement")
        badge.setAttribute("data-type", "statement")
        badge.textContent = analysis.type ? analysis.type.charAt(0).toUpperCase() + analysis.type.slice(1) : "Statement"
      }
      
      // Update credibility with fallback
      const credibilitySection = document.getElementById("sp-credibility")
      if (credibilitySection) {
        const credibility = analysis.credibility || 'medium'
        credibilitySection.setAttribute("data-level", credibility)
        
        const levelElement = credibilitySection.querySelector(".credibility-level")
        const rationaleElement = credibilitySection.querySelector(".credibility-rationale")
        
        if (levelElement) {
          levelElement.textContent = `${credibility.charAt(0).toUpperCase() + credibility.slice(1)} Credibility`
        }
        if (rationaleElement) {
          const sourceCount = analysis.sources?.length || 0
          rationaleElement.textContent = sourceCount > 0 && analysis.sources[0].url != "" ? `Based on ${sourceCount} sources` : 'No sources available'
        }
      }
      
      // Update categories with fallback
      const categoriesSection = document.getElementById("sp-categories")
      if (categoriesSection) {
        const category = analysis.category || 'General'
        categoriesSection.innerHTML = `<span class="chip">${category}</span>`
      }
      
      // Update sources with fallback
      updateSources(analysis.sources || [])
      
      // Set state to ready
      root.setAttribute("data-state", "ready")
      console.log('Sidepanel updated with analysis results')
      console.log('Current root state:', root.getAttribute('data-state'))
      console.log('Ready content visible:', document.querySelector('.ready-content').style.display !== 'none')
    } catch (error) {
      console.error('Error updating sidepanel:', error)
      root.setAttribute("data-state", "error")
    }
  }, 500)
}

// Update sources section
function updateSources(sources) {
  console.log('Updating sources:', sources)
  
  // Target the sources section within ready-content specifically
  const sourcesSection = document.querySelector(".ready-content #sp-sources")
  if (!sourcesSection) {
    console.error('Ready-content sources section not found')
    return
  }
  
  console.log('Found sources section:', sourcesSection)
  
  // Clear existing content
  const existingSources = sourcesSection.querySelectorAll('.source-card, .empty-state')
  console.log('Clearing existing sources:', existingSources.length)
  existingSources.forEach(element => element.remove())
  
  if (!sources || sources.length === 0) {
    console.log('No sources provided, showing empty state')
    const emptyState = document.createElement('div')
    emptyState.className = 'empty-state'
    emptyState.innerHTML = '<p>No related sources found for this text.</p>'
    sourcesSection.appendChild(emptyState)
    return
  }
  
  // Filter valid sources
  const validSources = sources.filter(source => {
    const isValid = source.title !== "No relevant sources found" && source.url && source.url.trim() !== ''
    console.log('Source validation:', { title: source.title, url: source.url, isValid })
    return isValid
  })
  
  console.log('Valid sources after filtering:', validSources.length)
  
  if (validSources.length === 0) {
    console.log('No valid sources after filtering, showing empty state')
    const emptyState = document.createElement('div')
    emptyState.className = 'empty-state'
    emptyState.innerHTML = '<p>No valid sources available for this text.</p>'
    sourcesSection.appendChild(emptyState)
    return
  }
  
  // Add valid sources
  validSources.forEach((source, index) => {
    console.log(`Creating source card ${index + 1}:`, source)
    
    const sourceCard = document.createElement('a')
    sourceCard.className = 'source-card'
    sourceCard.href = source.url
    sourceCard.target = '_blank'
    sourceCard.rel = 'noopener'
    
    let domain = 'Unknown source'
    try {
      domain = new URL(source.url).hostname
    } catch (e) {
      console.warn('Invalid URL:', source.url)
      domain = 'Invalid URL'
    }
    
    sourceCard.innerHTML = `
      <div class="source-header">
        <h3 class="source-title">${source.title || 'Untitled Source'}</h3>
        <svg class="external-icon" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M3.5 3c-.28 0-.5.22-.5.5s.22.5.5.5h3.086L2.793 7.793a.5.5 0 1 0 .707.707L7.293 4.707V7.5a.5.5 0 0 0 1 0v-4a.5.5 0 0 0-.5-.5h-4z"/>
        </svg>
      </div>
      <div class="source-domain">${domain}</div>
      <p class="source-snippet">${source.snippet || 'No description available'}</p>
    `
    
    sourcesSection.appendChild(sourceCard)
    console.log(`Source card ${index + 1} added to DOM`)
    console.log('Source card HTML:', sourceCard.outerHTML.substring(0, 100) + '...')
  })
  
  console.log(`Total ${validSources.length} source cards added`)
}

// Set empty state when no analysis is available
function setEmptyState() {
  console.log('Setting sidepanel to empty state')
  const root = document.getElementById("sp-root")
  root.setAttribute("data-state", "empty")
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Sidepanel loaded and ready")
  
  // Listen for analysis results from background script
  chrome.storage.local.get(['latestAnalysis', 'selectedText'], (result) => {
    if (result.selectedText) {
      updateSelectionText(result.selectedText)
    }
    
    if (result.latestAnalysis) {
      console.log('Found stored analysis, updating sidepanel')
      updateWithAnalysis(result.latestAnalysis)
    } else {
      console.log('No stored analysis found, showing empty state')
      setEmptyState()
    }
  })
})

// Toggle selection preview
function toggleSelection() {
  const content = document.getElementById("selection-text");
  const button = document.querySelector(".toggle-btn");

  if (content.classList.contains("collapsed")) {
    content.classList.remove("collapsed");
    button.textContent = "Show less";
  } else {
    content.classList.add("collapsed");
    button.textContent = "Show more";
  }
}

// Retry function
function retry() {
  const root = document.getElementById("sp-root");
  root.setAttribute("data-state", "loading");

  // Simulate loading and return to ready state
  setTimeout(() => {
    root.setAttribute("data-state", "ready");
  }, 2000);
}

// Demo: Switch between states (for testing)
function switchState(state) {
  document.getElementById("sp-root").setAttribute("data-state", state);
}

// Demo: Switch between opinion and statement (for testing)
function switchClassification(type) {
  const root = document.getElementById("sp-root");
  root.setAttribute("data-classification", type);

  const badge = document.querySelector(".classification-badge");
  badge.setAttribute("data-type", type);
  badge.textContent = type === "opinion" ? "Opinion" : "Statement";
}

// Keyboard navigation enhancements
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    // Close panel or handle escape
    console.log("Escape pressed - would close panel");
  }
});

// Handle button press states
document.addEventListener("click", function (e) {
  if (e.target.matches("button, .action-btn")) {
    e.target.style.transform = "scale(0.95)";
    setTimeout(() => {
      e.target.style.transform = "";
    }, 100);
  }
});

// Initialize panel
document.addEventListener("DOMContentLoaded", function () {
  console.log('Sidepanel DOM loaded, initializing...')
  // Set initial state
  const root = document.getElementById("sp-root");
  root.setAttribute("data-state", "ready");
  root.setAttribute("data-classification", "statement");
  console.log('Sidepanel initialized with default state')
});