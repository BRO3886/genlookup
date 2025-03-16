// Send message to tab, with error handling
function sendMessageToTab(tabId, message) {
  // Check if tab exists and is loading
  chrome.tabs.get(tabId, function (tab) {
    if (chrome.runtime.lastError) {
      console.error("Tab error:", chrome.runtime.lastError);
      return;
    }

    // Make sure content script is injected
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      })
      .then(() => {
        // Now send the message
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Message error:", chrome.runtime.lastError);
          }
        });
      })
      .catch((err) => {
        console.error("Failed to inject content script:", err);
      });
  });
}

// Create context menu item when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain-selection",
    title: "Explain",
    contexts: ["selection"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explain-selection") {
    // Get the selected text
    const selectedText = info.selectionText;

    // Make sure the tab is valid and ready
    if (tab && tab.id !== chrome.tabs.TAB_ID_NONE) {
      // Execute content script to get page content for context

      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          func: getPageContent,
          world: "MAIN", // Execute in the main world to access page's DOM
        })
        .then((results) => {
          if (results && results.length > 0) {
            const pageContent = results[0].result;

            // Send to Ollama for explanation
            explainWithOllama(selectedText, pageContent, tab.id);
          } else {
            console.error("Failed to get page content");
          }
        })
        .catch((err) => {
          console.error("Error executing script:", err);
          // Fallback to just sending the selection without context
          explainWithOllama(selectedText, "Context unavailable", tab.id);
        });
    }
  }
});

// Helper function to convert HTML to Markdown-like format
function htmlToMarkdown(element) {
  let markdown = "";

  // Process children recursively
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Text node - add its content
      const text = node.textContent.trim();
      if (text) {
        markdown += text + " ";
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip script, style, svg, and hidden elements
      if (
        ["SCRIPT", "STYLE", "SVG", "NOSCRIPT"].includes(node.tagName) ||
        node.style.display === "none" ||
        node.style.visibility === "hidden"
      ) {
        continue;
      }

      const tagName = node.tagName.toLowerCase();
      let prefix = "";
      let suffix = "";

      // Handle different HTML elements
      switch (tagName) {
        case "h1":
          prefix = "\n# ";
          suffix = "\n";
          break;
        case "h2":
          prefix = "\n## ";
          suffix = "\n";
          break;
        case "h3":
          prefix = "\n### ";
          suffix = "\n";
          break;
        case "h4":
        case "h5":
        case "h6":
          prefix = "\n#### ";
          suffix = "\n";
          break;
        case "p":
          prefix = "\n";
          suffix = "\n";
          break;
        case "br":
          prefix = "\n";
          break;
        case "hr":
          prefix = "\n---\n";
          break;
        case "ul":
          prefix = "\n";
          suffix = "\n";
          break;
        case "ol":
          prefix = "\n";
          suffix = "\n";
          break;
        case "li":
          prefix = "* ";
          suffix = "\n";
          break;
        case "a":
          if (node.href) {
            prefix = "[";
            suffix = "](" + node.href + ")";
          }
          break;
        case "strong":
        case "b":
          prefix = "**";
          suffix = "**";
          break;
        case "em":
        case "i":
          prefix = "*";
          suffix = "*";
          break;
        case "code":
          prefix = "`";
          suffix = "`";
          break;
        case "pre":
          prefix = "\n```\n";
          suffix = "\n```\n";
          break;
        case "blockquote":
          prefix = "\n> ";
          suffix = "\n";
          break;
        case "img":
          if (node.alt && node.src) {
            prefix = "![" + node.alt + "](" + node.src + ")";
            // Skip processing children for images
            markdown += prefix;
            continue;
          }
          break;
        case "table":
          prefix = "\n";
          suffix = "\n";
          break;
        case "tr":
          suffix = "\n";
          break;
        case "th":
        case "td":
          prefix = "| ";
          suffix = " ";
          break;
        case "div":
          // Only add newlines for divs that likely represent blocks
          if (window.getComputedStyle(node).display === "block") {
            prefix = "\n";
            suffix = "\n";
          }
          break;
      }

      markdown += prefix;

      // Recursively process child nodes
      markdown += htmlToMarkdown(node);

      markdown += suffix;
    }
  }

  return markdown;
}

// Function to get page content and convert HTML to Markdown
function getPageContent() {
  // This function extracts the important content from the page and converts it to Markdown

  // Find main content area (simple heuristic)
  let mainContent = document.body;

  // Try to find article or main element if available
  const article = document.querySelector(
    "article, main, #content, #main, .content, .main"
  );
  if (article) {
    mainContent = article;
  }

  // Get the URL and title
  const pageUrl = window.location.href;
  const pageTitle = document.title;

  // Construct markdown with metadata
  let markdown = `# ${pageTitle}\n\nURL: ${pageUrl}\n\n---\n\n`;

  // Add the converted content
  markdown += htmlToMarkdown(mainContent);

  // Clean up multiple newlines and spaces
  markdown = markdown.replace(/\n{3,}/g, "\n\n");
  markdown = markdown.replace(/ {2,}/g, " ");

  // Limit the size (to around 10,000 characters)
  if (markdown.length > 10000) {
    markdown = markdown.substring(0, 10000) + "\n\n...(content truncated)...";
  }

  return markdown;
}

// Function to send data to Ollama and get explanation
async function explainWithOllama(selectedText, pageContext, tabId) {
  try {
    // Get Ollama settings from storage
    const settings = await chrome.storage.sync.get({
      ollamaUrl: "http://localhost:11434",
      model: "llama3",
    });

    // Create a prompt combining selected text and context
    const prompt = `
        Please explain the following text that was selected from a webpage:
        
        """
        ${selectedText}
        """
        
        Here is the webpage content in Markdown format for context:
        
        """
        ${pageContext}
        """
        
        Provide a clear, concise explanation of what the selected text means in the context of this webpage.
      `;

    // First, notify the user that we're processing
    sendMessageToTab(tabId, {
      action: "showProcessing",
      message: "Generating explanation...",
    });

    try {
      // Send request to Ollama API with mode: 'no-cors' to bypass CORS restriction
      // Note: This will make the response opaque, but we can still try
      const response = await fetch(`${settings.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: settings.model,
          prompt: prompt,
          stream: false,
        }),
        // Add this to attempt to bypass CORS
        mode: "no-cors",
      });

      // Check if response is available
      if (response) {
        try {
          const data = await response.json();

          // Send the explanation to a popup or inject into page
          chrome.tabs.sendMessage(tabId, {
            action: "showExplanation",
            explanation: data.response,
          });
        } catch (jsonError) {
          // If we can't parse the response due to CORS, show a specific error
          chrome.tabs.sendMessage(tabId, {
            action: "showError",
            error:
              "Cannot access Ollama API due to CORS restrictions. Please see the extension's README for setup instructions.",
          });
        }
      } else {
        throw new Error("No response from Ollama API");
      }
    } catch (fetchError) {
      throw new Error(
        `Ollama API error: ${fetchError.message}. Please ensure Ollama is running and accessible.`
      );
    }
  } catch (error) {
    console.error("Error getting explanation:", error);
    chrome.tabs.sendMessage(tabId, {
      action: "showError",
      error: error.message,
    });
  }
}
