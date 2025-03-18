// Import the Ollama browser client
import { Ollama } from "ollama/browser";

// Send message to tab, with error handling
function sendMessageToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch((error) => {
    console.error("Error sending message to tab:", error);
  });
}

// Create context menu item when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "lookup-selection",
    title: "GenLookup",
    contexts: ["selection"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "lookup-selection") {
    // Disable the context menu item to prevent further clicks
    chrome.contextMenus.update("lookup-selection", { enabled: false });

    // Get the selected text
    const selectedText = info.selectionText;
    // Make sure the tab is valid and ready
    if (tab && tab.id !== chrome.tabs.TAB_ID_NONE) {
      // First ensure content script is loaded
      ensureContentScriptLoaded(tab.id)
        .then(() => {
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
                explainWithOllama(selectedText, pageContent, tab.id).finally(
                  () => {
                    // Re-enable the context menu item after processing
                    chrome.contextMenus.update("lookup-selection", {
                      enabled: true,
                    });
                  }
                );
              } else {
                console.error("Failed to get page content");
                // Re-enable the context menu item in case of failure
                chrome.contextMenus.update("lookup-selection", {
                  enabled: true,
                });
              }
            })
            .catch((err) => {
              console.error("Error executing script:", err);
              // Fallback to just sending the selection without context
              explainWithOllama(
                selectedText,
                "Context unavailable",
                tab.id
              ).finally(() => {
                // Re-enable the context menu item after processing
                chrome.contextMenus.update("lookup-selection", {
                  enabled: true,
                });
              });
            });
        })
        .catch((error) => {
          console.error("Failed to inject content script:", error);
          // Re-enable the context menu item in case of failure
          chrome.contextMenus.update("lookup-selection", { enabled: true });
        });
    }
  }
});

// Function to get page content and convert HTML to Markdown
function getPageContent() {
  // This function extracts the important content from the page and converts it to Markdown
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
        INSTRUCTIONS:
        Act as a helpful, all-knowing assistant that explains the following text (in not more than 100 words) henceforth referred to as "selected text", that was selected from a webpage:

        Focus on providing a clear, concise explanation of what the **selected text** means in the context of this webpage, and not the entire webpage. Also add a suggested reading section that includes the most relevant links in your opinion that are related to the selected text. 
        ---
        CONTEXT:
        Here is the webpage content in Markdown format for context:
        ${pageContext}

        ----
        QUESTION:
        What is the meaning of the following **selected text** in the context of this webpage: ${selectedText}
        
        IMPORTANT: Dont focus on explaining the article, just the selected text.
        IMPORTANT: Don't ask preamble or postamble questions, just explain the selected text.
        IMPORTANT: You should NOT answer with unnecessary preamble or postamble (such as summarizing your action), unless the user asks you to.
        IMPORTANT: Keep your responses medium-length, since they will be displayed on a popup overlay. You MUST answer concisely with fewer than 10 lines, unless user asks for detail. Answer the user's question directly, without additional details. Five line answers are best. Avoid introductions and conclusions. You MUST avoid text before/after your response, such as "Okay, this is what the selected text means <answer>.", "Here is the content of the file..." or "Based on the information provided, the answer is..." or "Here is what I will do next...".
      `;

    // First, notify the user that we're processing
    sendMessageToTab(tabId, {
      action: "showProcessing",
      message: "Generating explanation...",
    });

    try {
      // Configure the Ollama client with the custom host
      const ollamaClient = new Ollama({
        host: settings.ollamaUrl,
      });
      // Use the chat API instead of direct fetch
      const response = await ollamaClient.chat({
        model: settings.model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      });

      let index = 0;
      for await (const chunk of response) {
        if (chunk.done) {
          break;
        }
        // Send the explanation to the content script
        chrome.tabs.sendMessage(tabId, {
          action: "showExplanation",
          explanation: {
            index: index,
            content: chunk.message.content,
          },
        });
        index++;
      }
    } catch (apiError) {
      throw new Error(
        `Ollama API error: ${apiError.message}. Please ensure Ollama is running and accessible.`
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

// Function to ensure content script is loaded
async function ensureContentScriptLoaded(tabId) {
  // Check if we can establish communication with the content script
  try {
    const response = await chrome.tabs
      .sendMessage(tabId, { action: "ping" })
      .catch(() => null);

    // If we got a response, the content script is already loaded
    if (response && response.status === "pong") {
      return;
    }
  } catch (e) {
    // No response means content script is not loaded
  }

  // Inject the content script
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["content.js"],
  });
}
