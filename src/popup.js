document.addEventListener("DOMContentLoaded", function () {
  // Load saved settings
  chrome.storage.sync.get(
    {
      ollamaUrl: "http://localhost:11434",
      model: "gemma3",
    },
    function (items) {
      document.getElementById("ollamaUrl").value = items.ollamaUrl;
      document.getElementById("model").value = items.model;
    }
  );

  // Save settings
  document.getElementById("saveButton").addEventListener("click", function () {
    const ollamaUrl = document.getElementById("ollamaUrl").value.trim();
    const model = document.getElementById("model").value.trim();

    // Validate inputs
    if (!ollamaUrl) {
      showStatus("Please enter a valid Ollama server URL", false);
      return;
    }

    if (!model) {
      showStatus("Please enter a model name", false);
      return;
    }

    // Save settings
    chrome.storage.sync.set(
      {
        ollamaUrl: ollamaUrl,
        model: model,
      },
      function () {
        showStatus("Settings saved!", true);

        // Test connection
        testOllamaConnection(ollamaUrl, model);
      }
    );
  });
});

// Function to show status message
function showStatus(message, isSuccess) {
  const statusElement = document.getElementById("status");
  statusElement.textContent = message;
  statusElement.className = "status " + (isSuccess ? "success" : "error");
  statusElement.style.display = "block";

  // Hide status after 3 seconds
  setTimeout(function () {
    statusElement.style.display = "none";
  }, 3000);
}

// Function to test connection to Ollama
async function testOllamaConnection(ollamaUrl, model) {
  try {
    // Check if Ollama server is reachable
    const response = await fetch(`${ollamaUrl}/api/tags`);

    if (!response.ok) {
      showStatus("Could not connect to Ollama server", false);
      return;
    }

    const data = await response.json();

    // Check if specified model exists
    const modelExists = data.models.some((m) => m.name === model);

    if (!modelExists) {
      showStatus(`Model "${model}" not found on server`, false);
    } else {
      showStatus("Connection successful!", true);
    }
  } catch (error) {
    showStatus(`Connection error: ${error.message}`, false);
  }
}
