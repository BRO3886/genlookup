# Text Explainer Browser Extension

This browser extension adds an "Explain" option to the right-click context menu when text is selected on any webpage. It sends the selected text along with the page context to an Ollama server for explanation.

## Features

- Adds "Explain" to the right-click menu for selected text
- Sends selected text and page context to Ollama for explanation
- Shows explanation in a popup overlay on the page
- Configurable Ollama server URL and model

## Installation

### Prerequisites

- Ollama installed and running on your computer or a remote server
- A browser that supports extensions (Chrome, Firefox, Edge)

### Chrome Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension should now be installed and active

### Firefox Installation

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..." and select the `manifest.json` file in the extension folder
4. The extension should now be installed and active

## Usage

1. Select text on any webpage
2. Right-click to open the context menu
3. Click "Explain" from the menu
4. Wait for the explanation to appear in a popup

## Configuration

Click on the extension icon in your browser toolbar to:

1. Set the Ollama Server URL (default: `http://localhost:11434`)
2. Choose the model to use (default: `llama3`)
3. Click "Save Settings" to apply changes

## Extension Structure

- `manifest.json`: Extension configuration
- `background.js`: Handles context menu and communication with Ollama
- `content.js`: Creates and manages the explanation popup
- `popup.html`: Settings page UI
- `popup.js`: Settings page functionality

## Notes

- Ensure Ollama is running before using the extension
- The extension needs permission to read the content of web pages to provide context
- The extension works best with models that are good at explanations

## Future Improvements

- Add ability to customize the prompt
- Implement streaming responses for faster feedback
- Add more display options for the explanation
- Support for authentication with Ollama servers
