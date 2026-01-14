// geminiService.js
class GeminiService {
  constructor() {
    this.apiKey = '';
    this.model = 'gemini-2.5-pro'; // Default model
    this.models = {
      'gemini-2.5-pro': 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent',
      'gemini-2.5-flash': 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
      'gemini-flash-2': 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent' // Latest flash model
    };
    this.currentUrl = this.models[this.model];
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  setModel(model) {
    this.model = model;
    this.currentUrl = this.models[model] || this.models['gemini-2.5-pro']; // fallback to default if model not found
  }

  getModel() {
    return this.model;
  }

  getAvailableModels() {
    return Object.keys(this.models);
  }

  async checkContent(content, initialContentText, requirements) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not set');
    }

    // Validate API key format (Google API keys typically start with "AIza")
    if (!this.apiKey.startsWith('AIza')) {
      throw new Error('Invalid API key format. Google API keys should start with "AIza"');
    }

    // Format the prompt for content checking
    const prompt = this.formatContentPrompt(content, initialContentText, requirements);

    try {
      // Set a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${this.currentUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}`;

        // Handle specific error codes
        switch(response.status) {
          case 400:
            errorMessage += ': Bad Request - Check your prompt format';
            break;
          case 401:
            errorMessage += ': Unauthorized - Invalid API key';
            break;
          case 403:
            errorMessage += ': Forbidden - API key does not have access to this service';
            break;
          case 404:
            errorMessage += ': Not Found - Check the API endpoint';
            break;
          case 429:
            errorMessage += ': Too Many Requests - Rate limit exceeded';
            break;
          case 500:
            errorMessage += ': Internal Server Error - Service temporarily unavailable';
            break;
          case 503:
            errorMessage += ': Service Unavailable - Try again later';
            break;
          default:
            errorMessage += ': Please check your internet connection and API key';
        }

        // Try to get error details from response body
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage += ` - Details: ${errorData.error.message}`;
          }
        } catch (e) {
          // If we can't parse the error response, use the generic message
          console.warn('Could not parse error response:', e);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return this.extractResponse(data);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The API request took too long to complete. Please check your internet connection and try again.');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to the Gemini API. Please check your internet connection and firewall settings.');
      }
      throw error;
    }
  }

  async checkSectionRequirements(section) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not set');
    }

    // Validate API key format (Google API keys typically start with "AIza")
    if (!this.apiKey.startsWith('AIza')) {
      throw new Error('Invalid API key format. Google API keys should start with "AIza"');
    }

    // Combine section guide and content requirements
    const sectionRequirements = [
      section.sectionGuide,
      ...section.contentBlocks.flatMap(block => block.requirements || [])
    ].filter(req => req && req.trim() !== '');

    const prompt = this.formatSectionPrompt(section, sectionRequirements);

    try {
      // Set a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${this.currentUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}`;

        // Handle specific error codes
        switch(response.status) {
          case 400:
            errorMessage += ': Bad Request - Check your prompt format';
            break;
          case 401:
            errorMessage += ': Unauthorized - Invalid API key';
            break;
          case 403:
            errorMessage += ': Forbidden - API key does not have access to this service';
            break;
          case 404:
            errorMessage += ': Not Found - Check the API endpoint';
            break;
          case 429:
            errorMessage += ': Too Many Requests - Rate limit exceeded';
            break;
          case 500:
            errorMessage += ': Internal Server Error - Service temporarily unavailable';
            break;
          case 503:
            errorMessage += ': Service Unavailable - Try again later';
            break;
          default:
            errorMessage += ': Please check your internet connection and API key';
        }

        // Try to get error details from response body
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage += ` - Details: ${errorData.error.message}`;
          }
        } catch (e) {
          // If we can't parse the error response, use the generic message
          console.warn('Could not parse error response:', e);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return this.extractResponse(data);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The API request took too long to complete. Please check your internet connection and try again.');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to the Gemini API. Please check your internet connection and firewall settings.');
      }
      throw error;
    }
  }

  formatContentPrompt(content, initialContentText, requirements) {
    const reqList = requirements ? requirements.join('\n- ') : 'No specific requirements provided';
    const initialContent = initialContentText ? `"${initialContentText}"` : 'None provided';

    return `You are an academic writing assistant. Evaluate the following content based on the requirements provided. Give detailed feedback and suggestions for improvement.

INSTRUCTIONS: Respond in JSON format with the following structure only:
{
  "evaluation": {
    "overallAssessment": "string",
    "strengths": ["string"],
    "improvements": ["string"],
    "complianceWithRequirements": "string",
    "feedbackOnContentQuality": "string",
    "suggestionsForEnhancement": ["string"]
  }
}

Content to evaluate:
"${content}"

Initial Content Text (for reference):
${initialContent}

Requirements:
- ${reqList}

Please provide your assessment based on the requirements and guidelines.`;
  }

  formatSectionPrompt(section, requirements) {
    const reqList = requirements.join('\n- ');

    return `You are an academic writing assistant. Evaluate the following section based on the requirements provided. Give detailed feedback and suggestions for improvement.

Section: ${section.sectionTitle}
Section Guide: ${section.sectionGuide || 'No guide provided'}

Requirements to meet:
- ${reqList}

Please provide feedback on:
1. How well the section meets the requirements
2. Areas for improvement
3. Suggestions for enhancement
4. Any issues with clarity, coherence, or academic tone

Format your response in a clear, constructive manner that helps the student improve their thesis content.`;
  }

  extractResponse(data) {
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts;
      if (parts && parts[0] && parts[0].text) {
        let rawText = parts[0].text;

        // Extract JSON from response if wrapped in markdown-style code block or extra text
        let jsonStr = rawText.trim();

        // Look for JSON block markers
        const jsonMatch = rawText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        } else {
          // Try to find JSON object within the response
          const objStart = rawText.indexOf('{');
          const objEnd = rawText.lastIndexOf('}') + 1;
          if (objStart !== -1 && objEnd > objStart) {
            jsonStr = rawText.substring(objStart, objEnd);
          }
        }

        try {
          const parsed = JSON.parse(jsonStr);

          // Transform the JSON response into a readable format for display
          if (parsed.evaluation) {
            const evalData = parsed.evaluation;
            let transformedText = "";

            if (evalData.overallAssessment) {
              transformedText += `**Overall Assessment:** ${evalData.overallAssessment}\n\n`;
            }

            if (evalData.strengths && evalData.strengths.length > 0) {
              transformedText += `**Strengths:**\n`;
              evalData.strengths.forEach(strength => {
                transformedText += `- ${strength}\n`;
              });
              transformedText += `\n`;
            }

            if (evalData.improvements && evalData.improvements.length > 0) {
              transformedText += `**Areas for Improvement:**\n`;
              evalData.improvements.forEach(improvement => {
                transformedText += `- ${improvement}\n`;
              });
              transformedText += `\n`;
            }

            if (evalData.suggestionsForEnhancement && evalData.suggestionsForEnhancement.length > 0) {
              transformedText += `**Suggestions for Enhancement:**\n`;
              evalData.suggestionsForEnhancement.forEach(suggestion => {
                transformedText += `- ${suggestion}\n`;
              });
              transformedText += `\n`;
            }

            if (evalData.complianceWithRequirements) {
              transformedText += `**Compliance with Requirements:** ${evalData.complianceWithRequirements}\n\n`;
            }

            if (evalData.feedbackOnContentQuality) {
              transformedText += `**Content Quality Feedback:** ${evalData.feedbackOnContentQuality}\n`;
            }

            return transformedText.trim();
          } else {
            return rawText;
          }
        } catch (e) {
          console.error('Error parsing JSON response:', e);
          return rawText; // Return the raw text if parsing fails
        }
      }
    }

    // Fallback if response format is different
    return JSON.stringify(data);
  }
}

export default new GeminiService();