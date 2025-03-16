# Text Explainer Browser Extension

This browser extension adds an "Explain" option to the right-click context menu when text is selected on any webpage. It sends the selected text along with the page context to an Ollama server for explanation.

## Features

- Adds "Explain" to the right-click menu for selected text
- Sends selected text and page context to Ollama for explanation
- Shows explanation in a popup overlay on the page
- Configurable Ollama server URL and model
- Uses the official Ollama JavaScript client for reliable communication

## Installation

### Prerequisites

- Ollama installed and running on your computer or a remote server
- A browser that supports extensions (Chrome, Firefox, Edge)
- Node.js and npm (for building the extension)

### Building the Extension

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the extension:
   ```
   npm run build
   ```
4. The complete extension will be available in the `dist` directory

### Chrome Installation

1. Build the extension as described above
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right
4. Click "Load unpacked" and select the `dist` folder
5. The extension should now be installed and active

### Firefox Installation

1. Build the extension as described above
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..." and select the `manifest.json` file in the `dist` folder
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

## Development

To work on the extension:

1. Make changes to the source files
2. Run `npm run build` to rebuild the extension
3. For continuous development, use `npm run watch` to automatically rebuild when files change
4. Reload the extension in your browser to see the changes

## Extension Structure

- `manifest.json`: Extension configuration
- `background.js`: Handles context menu and communication with Ollama
- `content.js`: Creates and manages the explanation popup
- `popup.html`: Settings page UI
- `popup.js`: Settings page functionality
- `dist/`: Contains the built extension ready for loading into browsers

## Notes

- Ensure Ollama is running before using the extension
- The extension needs permission to read the content of web pages to provide context
- The extension works best with models that are good at explanations
- The extension uses the official Ollama JavaScript client to avoid CORS issues

## Future Improvements

- Add ability to customize the prompt
- Implement streaming responses for faster feedback
- Add more display options for the explanation
- Support for authentication with Ollama servers
