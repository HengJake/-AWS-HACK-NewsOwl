document.addEventListener("DOMContentLoaded", () => {
  // Load saved settings
  chrome.storage.sync.get(["factCheckEnabled", "biasEnabled", "autoExpand"], (result) => {
    document.getElementById("fact-check-toggle").classList.toggle("active", result.factCheckEnabled !== false)
    document.getElementById("bias-toggle").classList.toggle("active", result.biasEnabled !== false)
    document.getElementById("auto-expand-toggle").classList.toggle("active", result.autoExpand === true)
  })

  // Load stats
  chrome.storage.local.get(["factsChecked", "biasAlerts", "sourcesVerified"], (result) => {
    document.getElementById("facts-checked").textContent = result.factsChecked || 0
    document.getElementById("bias-alerts").textContent = result.biasAlerts || 0
    document.getElementById("sources-verified").textContent = result.sourcesVerified || 0
  })

  // Toggle event listeners
  document.getElementById("fact-check-toggle").addEventListener("click", function () {
    this.classList.toggle("active")
    chrome.storage.sync.set({ factCheckEnabled: this.classList.contains("active") })
  })

  document.getElementById("bias-toggle").addEventListener("click", function () {
    this.classList.toggle("active")
    chrome.storage.sync.set({ biasEnabled: this.classList.contains("active") })
  })

  document.getElementById("auto-expand-toggle").addEventListener("click", function () {
    this.classList.toggle("active")
    chrome.storage.sync.set({ autoExpand: this.classList.contains("active") })
  })
})
