// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: "contentScriptReady" });

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  if (message.action === "showExplanation") {
    showExplanationPopup(message.explanation);
    if (sendResponse) sendResponse({ status: "success" });
  } else if (message.action === "showError") {
    showErrorPopup(message.error);
    if (sendResponse) sendResponse({ status: "error" });
  } else if (message.action === "showProcessing") {
    showProcessingPopup(message.message);
    if (sendResponse) sendResponse({ status: "processing" });
  } else if (message.action === "ping") {
    // Respond to ping to confirm content script is loaded
    if (sendResponse) sendResponse({ status: "pong" });
  }

  return true; // Keep the message channel open for async responses
});

// Function to create and show a popup with the explanation
function showExplanationPopup(explanation) {
  // Create popup container if it doesn't exist
  if (explanation.index === 0) {
    removeExistingPopup();
  }

  let popup = document.getElementById("ollama-explanation-popup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "ollama-explanation-popup";
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      max-height: 80vh;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 15px;
      z-index: 10000;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      overflow-y: auto;
      font-family: Arial, sans-serif;
      color: black !important;
      overflow-y: scroll;
      min-width: 400px;
    `;
    document.body.appendChild(popup); // Ensure the popup is added to the DOM
  }

  // // Add title if it doesn't exist
  // let title =
  //   popup.querySelector("h3") &&
  //   popup.querySelector("h3").textContent !== "Explanation";
  // if (!title) {
  //   title = document.createElement("h3");
  //   title.textContent = "Explanation";
  //   title.style.cssText = `
  //     margin-top: 0;
  //     margin-bottom: 10px;
  //     border-bottom: 1px solid #eee;
  //     padding-bottom: 5px;
  //     color: black !important;
  //   `;
  //   popup.appendChild(title);
  // }

  // Add close button if it doesn't exist
  let closeButton = popup.querySelector("button");
  if (!closeButton) {
    closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
    `;
    closeButton.addEventListener("click", () => {
      removeExistingPopup();
    });
    popup.appendChild(closeButton);
  }

  // Add explanation content with Markdown formatting support
  let content = document.getElementById("ollama-explanation-content");
  if (!content) {
    content = document.createElement("div");
    content.id = "ollama-explanation-content";
    content.style.cssText = `
      line-height: 1.5;
      text-align: left;
      z-index: 10000;
      color: black !important;
    `;
    popup.appendChild(content);
  }

  // Simple Markdown-to-HTML conversion for basic formatting
  const formattedExplanation = explanation.content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
    .replace(/`(.*?)`/g, "<code>$1</code>") // Inline code
    .replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2'>$1</a>") // Links
    .replace(/\n\n/g, "<br><br>") // Paragraphs
    .replace(/\n/g, ""); // Line breaks

  // content.innerHTML += `<p>${formattedExplanation}</p>`;
  content.innerHTML += formattedExplanation;
  // // Add to page if it's the first chunk
  // if (explanation.index === 0) {
  //   document.body.appendChild(popup);
  // }
}

// Function to show processing popup
function showProcessingPopup(message) {
  removeExistingPopup();

  const popup = document.createElement("div");
  popup.id = "ollama-explanation-popup";
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    background-color: #f0f8ff;
    border: 1px solid #b3d4fc;
    border-radius: 8px;
    padding: 15px;
    z-index: 10000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    font-family: Arial, sans-serif;
    color: black !important;
  `;

  const title = document.createElement("h3");
  title.textContent = "Processing";
  title.style.color = "#1976d2";
  popup.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
  `;
  closeButton.addEventListener("click", () => {
    removeExistingPopup();
  });
  popup.appendChild(closeButton);

  const content = document.createElement("div");
  content.textContent = message;

  // Add loading spinner
  const spinner = document.createElement("div");
  spinner.style.cssText = `
    margin-top: 10px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 2s linear infinite;
  `;

  // Add keyframe animation for spinner
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  content.appendChild(spinner);
  popup.appendChild(content);

  document.body.appendChild(popup);
}

// Function to show error popup
function showErrorPopup(errorMessage) {
  // Similar to explanation popup but with error styling
  removeExistingPopup();

  const popup = document.createElement("div");
  popup.id = "ollama-explanation-popup";
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    background-color: #fff0f0;
    border: 1px solid #ffcaca;
    border-radius: 8px;
    padding: 15px;
    z-index: 10000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    font-family: Arial, sans-serif;
    color: red !important;
  `;

  const title = document.createElement("h3");
  title.textContent = "Error";
  title.style.color = "#d32f2f";
  popup.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
  `;
  closeButton.addEventListener("click", () => {
    removeExistingPopup();
  });
  popup.appendChild(closeButton);

  const content = document.createElement("div");
  content.textContent = `Failed to get explanation: ${errorMessage}`;
  popup.appendChild(content);

  document.body.appendChild(popup);

  // Auto-remove after 30 seconds
  setTimeout(removeExistingPopup, 30000);
}

// Remove existing popup if any
function removeExistingPopup() {
  const existingPopup = document.getElementById("ollama-explanation-popup");
  if (existingPopup) {
    existingPopup.remove();
  }
}
