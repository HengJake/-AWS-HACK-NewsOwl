class FactCheckCompanion {
  constructor() {
    this.currentCard = null
    this.isPinned = false
    this.init()
  }

  init() {
    document.addEventListener("mouseup", this.handleTextSelection.bind(this))
    document.addEventListener("mousedown", this.handleMouseDown.bind(this))
  }

  handleTextSelection(event) {
    const selection = window.getSelection()
    const selectedText = selection.toString().trim()
    console.log('Text selected:', selectedText)

    if (selectedText.length > 10) {
      console.log('Text length valid, showing choice card')
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // Send selected text to sidepanel
      if (chrome.runtime?.id) {
        console.log('Sending message to sidepanel')
        chrome.runtime.sendMessage({
          action: "updateSidePanel",
          selectedText: selectedText,
          url: window.location.href
        })
      }

      // Show the choice popup card first
      this.showChoiceCard(selectedText, rect)
    }
  }

  handleMouseDown(event) {
    if (this.currentCard && !this.currentCard.contains(event.target) && !this.isPinned) {
      this.hideFactCheckCard()
    }
  }

  async showChoiceCard(text, rect) {
    console.log('Creating choice card for text:', text.substring(0, 50) + '...')
    this.hideFactCheckCard()

    const card = this.createChoiceCard(text)
    document.body.appendChild(card)
    console.log('Choice card added to DOM')

    // Position the card
    const cardRect = card.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = rect.left + rect.width / 2 - cardRect.width / 2
    let top = rect.bottom + 10

    // Adjust if card goes off screen
    if (left + cardRect.width > viewportWidth - 20) {
      left = viewportWidth - cardRect.width - 20
    }
    if (left < 20) {
      left = 20
    }
    if (top + cardRect.height > viewportHeight - 20) {
      top = rect.top - cardRect.height - 10
    }

    card.style.left = `${left + window.scrollX}px`
    card.style.top = `${top + window.scrollY}px`

    // Animate in
    setTimeout(() => {
      card.classList.add("visible")
    }, 10)

    this.currentCard = card
  }

  createChoiceCard(text) {
    const card = document.createElement("div")
    card.className = "fact-check-card choice-card"

    card.innerHTML = `
      <div class="fact-check-card-header">
        <div class="fact-check-type">
          <span>🔍</span>
          <span>Fact Check This Text?</span>
        </div>
      </div>
      <div class="fact-check-content">
        <div class="selected-text-preview">
          "${text.length > 100 ? text.substring(0, 100) + '...' : text}"
        </div>
        <small class="small-text">Select >10 word for better accuracy</small>
        <div class="choice-buttons">
          <button class="choice-btn yes-btn" id="fact-check-yes">
            <span>Fact Check</span>
          </button>
          <button class="choice-btn no-btn" id="fact-check-no">
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    `

    // Add event listeners for the choice buttons
    const yesBtn = card.querySelector("#fact-check-yes")
    const noBtn = card.querySelector("#fact-check-no")

    yesBtn.addEventListener("click", async () => {
      // User chose to fact-check - open side panel and show analysis
      await this.handleFactCheckChoice(text, true)
    })

    noBtn.addEventListener("click", () => {
      // User chose not to fact-check - just fade away
      this.handleFactCheckChoice(text, false)
    })

    return card
  }

  async handleFactCheckChoice(text, shouldFactCheck) {
    console.log('User choice:', shouldFactCheck ? 'Yes, fact-check' : 'No, dismiss')

    if (shouldFactCheck) {
      // Open side panel if extension context is valid
      if (chrome.runtime?.id) {
        try {
          await chrome.runtime.sendMessage({
            action: "openSidePanel",
            selectedText: text,
            url: window.location.href,
            timestamp: Date.now()
          })
          console.log("Side panel opened for fact-checking")
        } catch (error) {
          console.error("Error opening side panel:", error)
        }
      } else {
        console.log("Extension context invalidated - please refresh the page")
      }

      // Transform the choice card into an analysis card
      await this.transformToAnalysisCard(text)
    } else {
      // User said no - just fade away
      this.hideFactCheckCard()
    }
  }

  async transformToAnalysisCard(text) {
    console.log('Transforming to analysis card')
    if (!this.currentCard) return

    // Update the card content to show analysis
    const card = this.currentCard
    card.className = "fact-check-card analysis-card"

    card.innerHTML = `
      <div class="fact-check-card-header">
        <div class="fact-check-type" id="fact-type">
          <span>🔍</span>
          <span>Analyzing...</span>
        </div>
        <div class="card-actions">
          <button class="card-action-btn" id="pin-btn" title="Pin card">📌</button>
          <button class="card-action-btn" id="close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="fact-check-content">
        <div class="verification-status" id="verification-status" style="display: none;">
        </div>
        <div class="bias-indicator" id="bias-indicator" style="display: none;">
        </div>
        <div class="expand-section" id="expand-toggle" style="display: none;">
          <span>Show more details</span>
          <span>▼</span>
        </div>
        <div class="expand-content" id="expand-content">
          <div class="sources-section">
            <h4>Related Sources:</h4>
            <div class="sources-list" id="related-sources">
            </div>
          </div>
        </div>
      </div>
    `

    // Re-add event listeners for the new buttons
    card.querySelector("#close-btn").addEventListener("click", () => {
      this.hideFactCheckCard()
    })

    card.querySelector("#pin-btn").addEventListener("click", (e) => {
      this.togglePin(e.target)
    })

    card.querySelector("#expand-toggle").addEventListener("click", () => {
      this.toggleExpand(card)
    })

    // Start the analysis
    await this.analyzeText(text, card)
  }

  async analyzeText(text, card) {
    console.log('Starting API call for text:', text.substring(0, 50) + '...')
    try {
      const response = await fetch('https://majb2cj4m6.execute-api.ap-southeast-1.amazonaws.com/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
      })

      console.log('API response status:', response.status)
      const analysis = await response.json()
      console.log('API response data:', analysis)

      // Send analysis results to background script for sidepanel
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({
          action: "updateSidePanelWithAnalysis",
          analysis: analysis
        }).catch(error => {
          console.log('Could not send analysis to background:', error)
        })
      }

      this.updateCardWithAnalysis(card, analysis)
    } catch (error) {
      console.error('API Error:', error)
      this.showErrorInCard(card)
    }
  }

  showErrorInCard(card) {
    console.log('Showing error in card')
    const typeElement = card.querySelector("#fact-type")
    typeElement.innerHTML = "<span>❌</span><span>Analysis Failed</span>"
    typeElement.className = "fact-check-type error"
  }



  updateCardWithAnalysis(card, analysis) {
    console.log('Updating card with analysis results')
    const typeElement = card.querySelector("#fact-type")
    const verificationElement = card.querySelector("#verification-status")
    const expandToggle = card.querySelector("#expand-toggle")
    const sourcesElement = card.querySelector("#related-sources")

    // Update type based on API response
    if (analysis.type === "opinion") {
      typeElement.innerHTML = "<span>💭</span><span>Opinion</span>"
      typeElement.className = "fact-check-type opinion"
    } else {
      typeElement.innerHTML = "<span>📊</span><span>Statement</span>"
      typeElement.className = "fact-check-type factual"
    }

    // Show credibility status
    verificationElement.style.display = "flex"
    verificationElement.className = `verification-status ${analysis.credibility}`

    const statusIcons = {
      high: "✅",
      medium: "⚠️",
      low: "❌",
    }

    const statusTexts = {
      high: "High credibility",
      medium: "Medium credibility",
      low: "Low credibility",
    }

    verificationElement.innerHTML = `
      <span>${statusIcons[analysis.credibility]}</span>
      <span>${statusTexts[analysis.credibility]}</span>
    `

    // Add sources from API
    sourcesElement.innerHTML = analysis.sources
      .map((source) => `<a href="${source.url}" class="source-item" target="_blank">${source.title}</a>`)
      .join("")

    // Show expand toggle
    expandToggle.style.display = "flex"
  }

  togglePin(pinBtn) {
    this.isPinned = !this.isPinned
    pinBtn.classList.toggle("pinned")
    pinBtn.title = this.isPinned ? "Unpin card" : "Pin card"
  }

  toggleExpand(card) {
    const expandContent = card.querySelector("#expand-content")
    const expandToggle = card.querySelector("#expand-toggle")
    const arrow = expandToggle.querySelector("span:last-child")

    expandContent.classList.toggle("open")
    arrow.textContent = expandContent.classList.contains("open") ? "▲" : "▼"
    expandToggle.querySelector("span:first-child").textContent = expandContent.classList.contains("open")
      ? "Show less"
      : "Show more details"
  }

  hideFactCheckCard() {
    if (this.currentCard && !this.isPinned) {
      this.currentCard.style.opacity = "0"
      this.currentCard.style.transform = "translateY(10px)"
      this.currentCard.style.pointerEvents = "none"

      setTimeout(() => {
        if (this.currentCard && this.currentCard.parentNode) {
          this.currentCard.parentNode.removeChild(this.currentCard)
        }
        this.currentCard = null
      }, 200)
    }
  }
}

// Initialize the extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Content Loaded")
    new FactCheckCompanion()
  })
} else {
  console.log("Content Loaded")
  new FactCheckCompanion()
}