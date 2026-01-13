# Thesis Maker

A web application for creating and checking thesis content using AI-powered feedback.

## Features

- Upload JSON guides to structure your thesis
- Edit content sections across multiple chapters
- Check content against requirements using Gemini AI
- Automatic saving when changing chapters
- Export/Import thesis content as JSON
- Responsive design for tablets and mobile devices

## Requirements

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone or download this repository
2. Navigate to the thesis-maker directory:
   ```bash
   cd thesis-maker
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open your browser and go to `http://localhost:3000`

## Usage

1. Upload a JSON guide file to get started
2. Enter your Gemini API key when prompted
3. Navigate between chapters using the Previous/Next buttons
4. Edit content in the text areas for each section
5. Use the "Check Content" button to get AI feedback on individual content blocks
6. Use the "Check Requirements" button to verify section compliance
7. Export your work as JSON using the Export button

## JSON Guide Format

The application expects a JSON file with the following structure:

```json
{
  "projectTitle": "Your Project Title",
  "version": "1.0",
  "chapters": [
    {
      "chapterNumber": 1,
      "chapterTitle": "Chapter 1 Title",
      "sections": [
        {
          "sectionNumber": 1,
          "sectionTitle": "Section Title",
          "sectionGuide": "Guide text for this section",
          "contentBlocks": [
            {
              "contentType": "paragraph",
              "contentNumber": 1,
              "content": {
                "text": "Initial content text"
              },
              "requirements": [
                "Requirement 1",
                "Requirement 2"
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## API Key

The application uses Google's Gemini AI for content checking. You need to provide your own API key which can be obtained from Google AI Studio. Your API key is stored locally in your browser and is not sent to any external servers.

## Export/Import

- Use the "Export JSON" button to save your work as a JSON file
- Use the file input in the bottom controls to import previously saved work

## Responsive Design

The application is designed to work on desktop, tablet, and mobile devices.

## Future Features

- DOCX export functionality
- Enhanced AI feedback
- More export formats