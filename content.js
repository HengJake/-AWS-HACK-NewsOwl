class FactCheckCompanion {
  constructor() {
    console.log("NewsOwl: FactCheckCompanion constructor called")
    this.currentCard = null
    this.isPinned = false
    this.init()
  }

  init() {
    console.log("NewsOwl: Initializing event listeners and image analysis")
    document.addEventListener("mouseup", this.handleTextSelection.bind(this))
    document.addEventListener("mousedown", this.handleMouseDown.bind(this))
    this.initImageAnalysis()
  }

  initImageAnalysis() {
    this.detectAndHighlightPostsAndImages()
    // Re-scan for images when DOM changes (important for social media feeds)
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && (node.tagName === 'IMG' || node.querySelector('img'))) {
              shouldRescan = true
            }
          })
        }
      })
      if (shouldRescan) {
        setTimeout(() => this.detectAndHighlightPostsAndImages(), 100)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  detectAndHighlightPostsAndImages() {
    // Select both images and post containers
    // Select both images and post containers
    const targets = document.querySelectorAll(
      'div.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z'
    );

    // Convert NodeList → Array so we can use filter()
    // const filteredTargets = Array.from(targets).filter(unit =>
    //   unit.querySelector('[role="article"]') && // must have article
    //   !unit.querySelector('h3') &&                // must NOT have h3
    //   !unit.querySelector('span')
    // );


    let highlightedCount = 0;

    targets.forEach(el => {
      if (!el.classList.contains('fact-check-analyzable')) {
        el.classList.add('fact-check-analyzable');
        el.addEventListener('click', this.handleImageClick.bind(this));
        highlightedCount++;

        if (el.tagName.toLowerCase() === 'img') {
          console.log('Highlighted an image');
        } else if (el.getAttribute('role') === 'article') {
          console.log('Highlighted a Facebook post');
        }
      }
    });

    console.log(`Highlighted ${highlightedCount} analyzable items`);
  }

  isImageAnalyzable(img) {
    // Filter out small, irrelevant images
    if (img.width < 100 || img.height < 100) return false
    if (!img.src || img.src === '') return false
    if (img.src.startsWith('data:') && img.src.length < 1000) return false // Skip tiny data URLs
    if (img.src.includes('icon') || img.src.includes('logo') || img.src.includes('avatar')) return false
    if (img.alt && (img.alt.includes('icon') || img.alt.includes('logo') || img.alt.includes('avatar'))) return false
    if (img.className && (img.className.includes('icon') || img.className.includes('logo'))) return false
    return true
  }

  handleImageClick(event) {
    event.preventDefault()
    event.stopPropagation()
    const img = event.target
    const rect = img.getBoundingClientRect()
    this.showImageConsentCard(img, rect)
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

  async showImageConsentCard(img, rect) {
    this.hideFactCheckCard()

    const card = this.createImageConsentCard(img)
    document.body.appendChild(card)

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

    setTimeout(() => {
      card.classList.add("visible")
    }, 10)

    this.currentCard = card
  }

  createImageConsentCard(img) {
    const card = document.createElement("div")
    card.className = "fact-check-card choice-card image-consent-card"

    card.innerHTML = `
      <div class="fact-check-card-header">
        <div class="fact-check-type">
          <span>🖼️</span>
          <span>Analyze This Image?</span>
        </div>
      </div>
      <div class="fact-check-content">
        <div class="image-preview">
          <img src="${img.src}" alt="Image preview" style="max-width: 150px; max-height: 100px; object-fit: cover; border-radius: 4px;">
        </div>
        <small class="small-text">Check image content and text for credibility</small>
        <div class="choice-buttons">
          <button class="choice-btn yes-btn" id="image-analyze-yes">
            <span>Analyze</span>
          </button>
          <button class="choice-btn no-btn" id="image-analyze-no">
            <span>Cancel</span>
          </button>
        </div>
      </div>
    `

    const yesBtn = card.querySelector("#image-analyze-yes")
    const noBtn = card.querySelector("#image-analyze-no")

    yesBtn.addEventListener("click", async () => {
      await this.handleImageAnalysisChoice(img, true)
    })

    noBtn.addEventListener("click", () => {
      this.handleImageAnalysisChoice(img, false)
    })

    return card
  }

  async handleImageAnalysisChoice(img, shouldAnalyze) {
    if (shouldAnalyze) {
      if (chrome.runtime?.id) {
        try {
          // Validate image before analysis
          if (!img.src || img.src === '') {
            console.error('Invalid image source')
            this.showImageError('Invalid image source')
            return
          }

          await chrome.runtime.sendMessage({
            action: "openSidePanelForImage",
            imageSrc: img.src,
            imageAlt: img.alt || '',
            url: window.location.href,
            timestamp: Date.now()
          })
          console.log("Side panel opened for image analysis")
        } catch (error) {
          console.error("Error opening side panel:", error)
          this.showImageError('Failed to analyze image. Please try again.')
        }
      } else {
        this.showImageError('Extension context lost. Please refresh the page.')
      }
    }
    this.hideFactCheckCard()
  }

  showImageError(message) {
    // Create a temporary error card
    const errorCard = document.createElement("div")
    errorCard.className = "fact-check-card error-card"
    errorCard.innerHTML = `
      <div class="fact-check-card-header">
        <div class="fact-check-type error">
          <span>❌</span>
          <span>Analysis Failed</span>
        </div>
      </div>
      <div class="fact-check-content">
        <p>${message}</p>
      </div>
    `

    document.body.appendChild(errorCard)
    errorCard.style.position = 'fixed'
    errorCard.style.top = '20px'
    errorCard.style.right = '20px'
    errorCard.style.zIndex = '999999'

    setTimeout(() => {
      errorCard.classList.add("visible")
    }, 10)

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (errorCard.parentNode) {
        errorCard.parentNode.removeChild(errorCard)
      }
    }, 3000)
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
      // await this.transformToAnalysisCard(text)
    } else {
      // User said no - just fade away
      this.hideFactCheckCard()
    }
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

// Load mock data
const script = document.createElement('script')
script.src = chrome.runtime.getURL('mockData.js')
document.head.appendChild(script)

// Debug: Check if script is loading
console.log("NewsOwl content script starting...")

// Initialize the extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("NewsOwl: DOM Content Loaded")
    try {
      new FactCheckCompanion()
      console.log("NewsOwl: FactCheckCompanion initialized successfully")
    } catch (error) {
      console.error("NewsOwl: Error initializing:", error)
    }
  })
} else {
  console.log("NewsOwl: DOM already loaded")
  try {
    new FactCheckCompanion()
    console.log("NewsOwl: FactCheckCompanion initialized successfully")
  } catch (error) {
    console.error("NewsOwl: Error initializing:", error)
  }
}